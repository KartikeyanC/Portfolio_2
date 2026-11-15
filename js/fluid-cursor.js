/*!
 * Fluid cursor: soft pastel ink pours out of the cursor and swirls through the page
 * like smoke in water. Stable-fluids simulation on the GPU (WebGL2, falls back to WebGL1).
 * No libraries. Runs by itself.
 *
 *   Include:  <script src="js/fluid-cursor.js" defer></script>
 *   Stop it:  window.fluidCursor.destroy()
 *   Tune it:  edit `config` below (most values can also be changed live via window.fluidCursor.config)
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // CONFIG: every number worth tuning lives here
  // ---------------------------------------------------------------------------
  const config = {
    // Simulation grid
    SIM_RESOLUTION: 128,       // velocity field, cells on the short side. Lower = cheaper, blobbier swirls
    DYE_RESOLUTION: 1440,      // colour field, cells on the short side (never more than the canvas's own pixels)
    MAX_DPR: 2,                // cap on devicePixelRatio, so 3x phones don't render 9x the pixels

    // How the fluid behaves
    DENSITY_DISSIPATION: 4.5,  // how fast the colour fades. Higher = gone sooner (4.5 is about a second)
    VELOCITY_DISSIPATION: 2,   // how fast the motion dies down
    PRESSURE: 0.1,             // share of last frame's pressure carried over (0-1)
    PRESSURE_ITERATIONS: 20,   // Jacobi iterations. More = more accurate swirls, more GPU work
    CURL: 3,                   // vorticity confinement. Higher = curlier, more smoke-like
    SPLAT_RADIUS: 0.16,        // size of each dab of ink
    SPLAT_FORCE: 6000,         // how hard the cursor pushes the fluid
    SHADING: true,             // fake 3D light from the dye's gradient, so the ink looks glossy (read once at start)

    // Click / tap burst
    CLICK_STRENGTH: 10,        // a burst's colour = a normal dab x this
    CLICK_VELOCITY: 30,        // random push given to a burst. Bigger = it sprays further
    TAP_BURST: true,           // a touchstart bursts like a click

    // Colour
    PALETTE: ["#FFCBE1", "#D6E5BD", "#F9E1A8", "#BCD8EC", "#DCCCEC", "#FFDAB4"],
    COLOR_INTENSITY: 0.42,     // 1 = full palette colour (neon). Lower = softer, more see-through ink
    COLOR_UPDATE_SPEED: 10,    // colour changes per second, so the trail blends through the palette

    // Staying out of the way
    QUIET_SELECTOR: 'nav, a, button, input, textarea, select, label, summary, [role="button"], [role="tab"], dialog',
    TEXT_SELECTOR: 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, dt, dd, figcaption, time, [class*="headline"]',
    TEXT_STRENGTH: 0.15,       // ink strength over text (0-1)
    STRENGTH_EASE: 0.2,        // how quickly the strength eases toward its target, per splat

    // Fitting into the page
    Z_INDEX: 25,               // stacking order: over page content (z 1-9), under every fixed control
                               // (page index 30, chapter nav 40, navbar 50, menu 60, lightboxes 90+)
    CSS_FILTER: "contrast(1.12) brightness(1.06)", // the light sheen on the canvas
    MAX_DT: 1 / 60,            // cap on the time step (s), so returning to a background tab can't blow up the sim
    IDLE_AFTER: 3000,          // ms after the last input before the loop sleeps (the ink is long gone by then)
    RESPECT_REDUCED_MOTION: true, // don't run for visitors whose system asks for less motion
  };

  if (window.fluidCursor) return; // already running on this page

  let cleanup = () => document.removeEventListener("DOMContentLoaded", start);
  window.fluidCursor = { config, destroy: () => cleanup() };

  // ---------------------------------------------------------------------------
  // SHADERS
  // ---------------------------------------------------------------------------
  const PRECISION = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      precision highp sampler2D;
    #else
      precision mediump float;
      precision mediump sampler2D;
    #endif
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
  `;

  // One full-screen quad; also hands each fragment its four neighbours.
  const BASE_VERTEX = `
    precision highp float;
    attribute vec2 aPosition;
    uniform vec2 texelSize;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const CLEAR_SHADER = PRECISION + `
    uniform sampler2D uTexture;
    uniform float value;
    void main () { gl_FragColor = value * texture2D(uTexture, vUv); }
  `;

  // A gaussian dab of colour (dye) or force (velocity) added to the target field.
  const SPLAT_SHADER = PRECISION + `
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
      vec2 p = vUv - point;
      p.x *= aspectRatio;
      vec3 dab = exp(-dot(p, p) / radius) * color;
      gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + dab, 1.0);
    }
  `;

  // Semi-Lagrangian advection: look back along the velocity and fetch what was there.
  const ADVECTION_SHADER = PRECISION + `
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 velTexelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5;
      vec2 iuv = floor(st);
      vec2 fuv = fract(st);
      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
    #ifdef MANUAL_FILTERING
      vec2 coord = vUv - dt * bilerp(uVelocity, vUv, velTexelSize).xy * velTexelSize;
      vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * velTexelSize;
      vec4 result = texture2D(uSource, coord);
    #endif
      gl_FragColor = result / (1.0 + dissipation * dt);
    }
  `;

  const DIVERGENCE_SHADER = PRECISION + `
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      // walls at the screen edges reflect the flow
      if (vL.x < 0.0) L = -C.x;
      if (vR.x > 1.0) R = -C.x;
      if (vT.y > 1.0) T = -C.y;
      if (vB.y < 0.0) B = -C.y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }
  `;

  const CURL_SHADER = PRECISION + `
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }
  `;

  // Vorticity confinement: puts back the small swirls that the coarse grid smooths away.
  const VORTICITY_SHADER = PRECISION + `
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;
    void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 vel = texture2D(uVelocity, vUv).xy + force * dt;
      gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
    }
  `;

  const PRESSURE_SHADER = PRECISION + `
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float div = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
    }
  `;

  const GRADIENT_SUBTRACT_SHADER = PRECISION + `
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
      gl_FragColor = vec4(vel, 0.0, 1.0);
    }
  `;

  // Draws the dye. Alpha = brightest channel, so empty areas stay see-through.
  const DISPLAY_SHADER = PRECISION + `
    uniform sampler2D uTexture;
    uniform vec2 dyeTexel;
    void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
    #ifdef SHADING
      // treat the dye's brightness as a height map and light it from the front
      float dx = length(texture2D(uTexture, vR).rgb) - length(texture2D(uTexture, vL).rgb);
      float dy = length(texture2D(uTexture, vT).rgb) - length(texture2D(uTexture, vB).rgb);
      vec3 n = normalize(vec3(dx, dy, length(dyeTexel)));
      float diffuse = clamp(dot(n, vec3(0.0, 0.0, 1.0)) + 0.7, 0.7, 1.0);
      c *= diffuse;
    #endif
      float a = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c, a); // premultiplied
    }
  `;

  // ---------------------------------------------------------------------------
  // SETUP
  // ---------------------------------------------------------------------------
  function start() {
    if (config.RESPECT_REDUCED_MOTION && window.matchMedia &&
        matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Full-viewport layer that never takes clicks
    const wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${config.Z_INDEX};`;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = `display:block;width:100%;height:100%;background:transparent;filter:${config.CSS_FILTER};`;
    wrap.appendChild(canvas);
    document.body.appendChild(wrap);

    let gl, ext, raf = 0, destroyed = false;
    const programs = [], buffers = [];
    const listeners = [];
    let dye, velocity, divergence, curl, pressure;

    cleanup = function destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf);
      raf = 0;
      listeners.forEach(([target, type, fn, opts]) => target.removeEventListener(type, fn, opts));
      if (gl && !gl.isContextLost()) {
        destroyFramebuffers();
        programs.forEach((p) => { p.shaders.forEach((s) => gl.deleteShader(s)); gl.deleteProgram(p.program); });
        buffers.forEach((b) => gl.deleteBuffer(b));
        const lose = gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
      }
      wrap.remove();
      if (window.fluidCursor && window.fluidCursor.config === config) delete window.fluidCursor;
    };

    try {
      const ctx = getWebGLContext(canvas);
      if (!ctx) { cleanup(); return; } // no usable WebGL: the page simply runs without the effect
      gl = ctx.gl;
      ext = ctx.ext;
    } catch (err) {
      console.warn("[fluid-cursor] disabled:", err);
      cleanup();
      return;
    }

    // ---- programs ----
    function compile(type, source, keywords) {
      if (keywords && keywords.length) source = keywords.map((k) => `#define ${k}\n`).join("") + source;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    function makeProgram(fragmentSource, keywords) {
      const vs = compile(gl.VERTEX_SHADER, BASE_VERTEX);
      const fs = compile(gl.FRAGMENT_SHADER, fragmentSource, keywords);
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.bindAttribLocation(program, 0, "aPosition");
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      const uniforms = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        const name = gl.getActiveUniform(program, i).name;
        uniforms[name] = gl.getUniformLocation(program, name);
      }
      const p = { program, uniforms, shaders: [vs, fs], bind: () => gl.useProgram(program) };
      programs.push(p);
      return p;
    }

    let clearProg, splatProg, advectionProg, divergenceProg, curlProg, vorticityProg, pressureProg, gradientProg, displayProg;
    try {
      clearProg = makeProgram(CLEAR_SHADER);
      splatProg = makeProgram(SPLAT_SHADER);
      advectionProg = makeProgram(ADVECTION_SHADER, ext.supportLinearFiltering ? [] : ["MANUAL_FILTERING"]);
      divergenceProg = makeProgram(DIVERGENCE_SHADER);
      curlProg = makeProgram(CURL_SHADER);
      vorticityProg = makeProgram(VORTICITY_SHADER);
      pressureProg = makeProgram(PRESSURE_SHADER);
      gradientProg = makeProgram(GRADIENT_SUBTRACT_SHADER);
      displayProg = makeProgram(DISPLAY_SHADER, config.SHADING ? ["SHADING"] : []);
    } catch (err) {
      console.warn("[fluid-cursor] disabled, shader error:", err);
      cleanup();
      return;
    }

    // ---- full-screen quad ----
    const vbo = gl.createBuffer(), ibo = gl.createBuffer();
    buffers.push(vbo, ibo);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    function blit(target) {
      if (target) {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    // ---- framebuffers ----
    function createFBO(w, h, internalFormat, format, type, filter) {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return {
        texture, fbo, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
        attach(id) {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return id;
        },
        dispose() { gl.deleteTexture(texture); gl.deleteFramebuffer(fbo); },
      };
    }
    // Ping-pong pair: read from one, write into the other, then swap.
    function createDoubleFBO(w, h, internalFormat, format, type, filter) {
      let a = createFBO(w, h, internalFormat, format, type, filter);
      let b = createFBO(w, h, internalFormat, format, type, filter);
      return {
        width: w, height: h, texelSizeX: a.texelSizeX, texelSizeY: a.texelSizeY,
        get read() { return a; },
        get write() { return b; },
        swap() { const t = a; a = b; b = t; },
        dispose() { a.dispose(); b.dispose(); },
      };
    }
    function destroyFramebuffers() {
      [dye, velocity, divergence, curl, pressure].forEach((f) => f && f.dispose());
      dye = velocity = divergence = curl = pressure = null;
    }

    // Grid size that keeps square cells on the current screen shape
    function getResolution(resolution) {
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      let aspect = w / h;
      if (aspect < 1) aspect = 1 / aspect;
      const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const min = Math.round(resolution);
      const max = Math.min(Math.round(resolution * aspect), maxTex);
      return w > h ? { width: max, height: min } : { width: min, height: max };
    }

    function initFramebuffers() {
      destroyFramebuffers();
      const shortSide = Math.min(gl.drawingBufferWidth, gl.drawingBufferHeight);
      const simRes = getResolution(config.SIM_RESOLUTION);
      const dyeRes = getResolution(Math.min(config.DYE_RESOLUTION, shortSide));
      const type = ext.texType, rgba = ext.formatRGBA, rg = ext.formatRG, r = ext.formatR;
      const filter = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
      gl.disable(gl.BLEND);
      dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, type, filter);
      velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, type, filter);
      divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, type, gl.NEAREST);
      curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, type, gl.NEAREST);
      pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, type, gl.NEAREST);
    }

    // ---- canvas size (device pixels) ----
    let dpr = 1;
    function resizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, config.MAX_DPR);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h) return false;
      canvas.width = w;
      canvas.height = h;
      return true;
    }
    resizeCanvas();
    initFramebuffers();

    const aspect = () => canvas.width / canvas.height;
    const correctDeltaX = (d) => (aspect() < 1 ? d * aspect() : d);
    const correctDeltaY = (d) => (aspect() > 1 ? d / aspect() : d);
    const correctRadius = (r) => (aspect() > 1 ? r * aspect() : r);

    // ---------------------------------------------------------------------------
    // SIMULATION
    // ---------------------------------------------------------------------------
    function splat(x, y, dx, dy, color) {
      splatProg.bind();
      gl.uniform1f(splatProg.uniforms.aspectRatio, aspect());
      gl.uniform2f(splatProg.uniforms.point, x, y);
      gl.uniform1f(splatProg.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100));
      // push the fluid
      gl.uniform1i(splatProg.uniforms.uTarget, velocity.read.attach(0));
      gl.uniform3f(splatProg.uniforms.color, dx, dy, 0);
      blit(velocity.write);
      velocity.swap();
      // drop the ink
      gl.uniform1i(splatProg.uniforms.uTarget, dye.read.attach(0));
      gl.uniform3f(splatProg.uniforms.color, color.r, color.g, color.b);
      blit(dye.write);
      dye.swap();
    }

    function step(dt) {
      gl.disable(gl.BLEND);
      const vx = velocity.texelSizeX, vy = velocity.texelSizeY;

      // 1. curl
      curlProg.bind();
      gl.uniform2f(curlProg.uniforms.texelSize, vx, vy);
      gl.uniform1i(curlProg.uniforms.uVelocity, velocity.read.attach(0));
      blit(curl);

      // 2. vorticity confinement
      vorticityProg.bind();
      gl.uniform2f(vorticityProg.uniforms.texelSize, vx, vy);
      gl.uniform1i(vorticityProg.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(vorticityProg.uniforms.uCurl, curl.attach(1));
      gl.uniform1f(vorticityProg.uniforms.curl, config.CURL);
      gl.uniform1f(vorticityProg.uniforms.dt, dt);
      blit(velocity.write);
      velocity.swap();

      // 3. divergence
      divergenceProg.bind();
      gl.uniform2f(divergenceProg.uniforms.texelSize, vx, vy);
      gl.uniform1i(divergenceProg.uniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);

      // 4. pressure solve: fade last frame's pressure, then Jacobi iterations
      clearProg.bind();
      gl.uniform1i(clearProg.uniforms.uTexture, pressure.read.attach(0));
      gl.uniform1f(clearProg.uniforms.value, config.PRESSURE);
      blit(pressure.write);
      pressure.swap();

      pressureProg.bind();
      gl.uniform2f(pressureProg.uniforms.texelSize, vx, vy);
      gl.uniform1i(pressureProg.uniforms.uDivergence, divergence.attach(0));
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureProg.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
      }

      // 5. gradient subtraction: makes the velocity field divergence-free
      gradientProg.bind();
      gl.uniform2f(gradientProg.uniforms.texelSize, vx, vy);
      gl.uniform1i(gradientProg.uniforms.uPressure, pressure.read.attach(0));
      gl.uniform1i(gradientProg.uniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write);
      velocity.swap();

      // 6. advect velocity
      advectionProg.bind();
      gl.uniform2f(advectionProg.uniforms.texelSize, vx, vy);
      gl.uniform2f(advectionProg.uniforms.velTexelSize, vx, vy);
      gl.uniform2f(advectionProg.uniforms.dyeTexelSize, vx, vy);
      const velId = velocity.read.attach(0);
      gl.uniform1i(advectionProg.uniforms.uVelocity, velId);
      gl.uniform1i(advectionProg.uniforms.uSource, velId);
      gl.uniform1f(advectionProg.uniforms.dt, dt);
      gl.uniform1f(advectionProg.uniforms.dissipation, config.VELOCITY_DISSIPATION);
      blit(velocity.write);
      velocity.swap();

      // 7. advect dye
      gl.uniform2f(advectionProg.uniforms.texelSize, dye.texelSizeX, dye.texelSizeY);
      gl.uniform2f(advectionProg.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
      gl.uniform1i(advectionProg.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advectionProg.uniforms.uSource, dye.read.attach(1));
      gl.uniform1f(advectionProg.uniforms.dissipation, config.DENSITY_DISSIPATION);
      blit(dye.write);
      dye.swap();
    }

    function render() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
      displayProg.bind();
      gl.uniform2f(displayProg.uniforms.texelSize, dye.texelSizeX, dye.texelSizeY);
      gl.uniform2f(displayProg.uniforms.dyeTexel, dye.texelSizeX, dye.texelSizeY);
      gl.uniform1i(displayProg.uniforms.uTexture, dye.read.attach(0));
      blit(null);
    }

    // ---------------------------------------------------------------------------
    // COLOUR
    // ---------------------------------------------------------------------------
    function hexToRgb(hex) {
      const n = parseInt(hex.replace("#", ""), 16);
      return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
    }
    function generateColor() {
      const c = hexToRgb(config.PALETTE[Math.floor(Math.random() * config.PALETTE.length)]);
      const k = config.COLOR_INTENSITY;
      return { r: c.r * k, g: c.g * k, b: c.b * k };
    }
    const scaleColor = (c, s) => ({ r: c.r * s, g: c.g * s, b: c.b * s });

    // ---------------------------------------------------------------------------
    // INPUT
    // ---------------------------------------------------------------------------
    const pointer = {
      x: 0.5, y: 0.5,        // texture coordinates (0-1, y up)
      dx: 0, dy: 0,          // movement gathered since the last splat
      moved: false,
      fresh: true,           // next position is a starting point, not a stroke (avoids long streaks)
      color: generateColor(),
      strength: 1,           // current ink strength
      target: 1,             // strength it's easing toward (1 open page, TEXT_STRENGTH over text)
    };
    const bursts = [];
    let lastTouch = 0;
    const TOUCH_GHOST_MS = 800; // ignore the fake mouse events browsers send after a touch

    function zoneOf(el) {
      if (!el || !el.closest) return "open";
      if (el.closest(config.QUIET_SELECTOR)) return "quiet";
      if (el.closest(config.TEXT_SELECTOR)) return "text";
      return "open";
    }
    // client (CSS) pixels -> device pixels -> 0-1 texture coordinates
    const toTexX = (clientX) => (clientX * dpr) / canvas.width;
    const toTexY = (clientY) => 1 - (clientY * dpr) / canvas.height;

    function moveTo(clientX, clientY, el) {
      const x = toTexX(clientX), y = toTexY(clientY);
      const zone = zoneOf(el);
      if (pointer.fresh || zone === "quiet") {
        // just follow the pointer: no paint, and no streak when it leaves
        pointer.x = x;
        pointer.y = y;
        pointer.dx = pointer.dy = 0;
        pointer.moved = false;
        pointer.fresh = false;
        return;
      }
      pointer.target = zone === "text" ? config.TEXT_STRENGTH : 1;
      pointer.dx += correctDeltaX(x - pointer.x);
      pointer.dy += correctDeltaY(y - pointer.y);
      pointer.x = x;
      pointer.y = y;
      pointer.moved = pointer.dx !== 0 || pointer.dy !== 0;
      if (pointer.moved) wake();
    }

    function burstAt(clientX, clientY, el) {
      if (zoneOf(el) !== "open") return; // no bursts over controls or text
      bursts.push({ x: toTexX(clientX), y: toTexY(clientY) });
      wake();
    }

    function applyInputs() {
      while (bursts.length) {
        const b = bursts.shift();
        const v = config.CLICK_VELOCITY;
        splat(b.x, b.y, v * (Math.random() - 0.5), v * (Math.random() - 0.5),
          scaleColor(generateColor(), config.CLICK_STRENGTH));
      }
      if (pointer.moved) {
        pointer.moved = false;
        pointer.strength += (pointer.target - pointer.strength) * config.STRENGTH_EASE;
        const s = pointer.strength, f = config.SPLAT_FORCE * s;
        splat(pointer.x, pointer.y, pointer.dx * f, pointer.dy * f, scaleColor(pointer.color, s));
        pointer.dx = pointer.dy = 0;
      }
    }

    function on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      listeners.push([target, type, fn, opts]);
    }
    const passive = { passive: true };
    const ghost = () => performance.now() - lastTouch < TOUCH_GHOST_MS;

    on(window, "mousemove", (e) => { if (!ghost()) moveTo(e.clientX, e.clientY, e.target); }, passive);
    on(window, "mousedown", (e) => {
      if (e.button !== 0 || ghost()) return;
      moveTo(e.clientX, e.clientY, e.target);
      burstAt(e.clientX, e.clientY, e.target);
    }, passive);
    // the mouse left the window: its next position is a fresh start
    on(document, "mouseout", (e) => { if (!e.relatedTarget) pointer.fresh = true; }, passive);

    on(window, "touchstart", (e) => {
      lastTouch = performance.now();
      const t = e.touches[0];
      if (!t) return;
      const el = document.elementFromPoint(t.clientX, t.clientY);
      pointer.fresh = true;
      moveTo(t.clientX, t.clientY, el);
      if (config.TAP_BURST) burstAt(t.clientX, t.clientY, el);
    }, passive);
    on(window, "touchmove", (e) => {
      lastTouch = performance.now();
      const t = e.touches[0];
      if (t) moveTo(t.clientX, t.clientY, document.elementFromPoint(t.clientX, t.clientY));
    }, passive);
    const endTouch = (e) => {
      lastTouch = performance.now();
      if (!e.touches.length) { pointer.fresh = true; pointer.moved = false; }
    };
    on(window, "touchend", endTouch, passive);
    on(window, "touchcancel", endTouch, passive);

    on(window, "resize", () => { if (resizeCanvas()) initFramebuffers(); }, passive);
    on(canvas, "webglcontextlost", () => cleanup());

    // ---------------------------------------------------------------------------
    // LOOP: runs while there's ink to move, then sleeps until the next input
    // ---------------------------------------------------------------------------
    let lastTime = 0, colorTimer = 0, idleUntil = 0;

    function wake() {
      idleUntil = performance.now() + config.IDLE_AFTER;
      if (!raf && !destroyed) {
        lastTime = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    function frame(now) {
      if (destroyed) return;
      if (now > idleUntil) { // nothing left on screen: clear and sleep
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT);
        raf = 0;
        return;
      }
      const dt = Math.max(0, Math.min((now - lastTime) / 1000, config.MAX_DT));
      lastTime = now;

      if (resizeCanvas()) initFramebuffers();

      colorTimer += dt * config.COLOR_UPDATE_SPEED;
      if (colorTimer >= 1) {
        colorTimer %= 1;
        pointer.color = generateColor();
      }

      applyInputs();
      step(dt);
      render();
      raf = requestAnimationFrame(frame);
    }
  }

  // ---------------------------------------------------------------------------
  // WEBGL CONTEXT + FORMAT DETECTION
  // ---------------------------------------------------------------------------
  function getWebGLContext(canvas) {
    const params = {
      alpha: true, depth: false, stencil: false, antialias: false,
      premultipliedAlpha: true, preserveDrawingBuffer: false,
    };
    let gl = canvas.getContext("webgl2", params);
    const isWebGL2 = !!gl;
    if (!isWebGL2) gl = canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params);
    if (!gl) return null;

    let texType, supportLinearFiltering;
    if (isWebGL2) {
      // 16-bit float textures are core in WebGL2 (and filter linearly); rendering into them needs an extension
      gl.getExtension("EXT_color_buffer_float");
      gl.getExtension("EXT_color_buffer_half_float");
      texType = gl.HALF_FLOAT;
      supportLinearFiltering = true;
    } else {
      const half = gl.getExtension("OES_texture_half_float");
      if (half) {
        texType = half.HALF_FLOAT_OES;
        supportLinearFiltering = !!gl.getExtension("OES_texture_half_float_linear");
      } else if (gl.getExtension("OES_texture_float")) {
        gl.getExtension("WEBGL_color_buffer_float");
        texType = gl.FLOAT;
        supportLinearFiltering = !!gl.getExtension("OES_texture_float_linear");
      } else {
        return null; // velocities need signed floats; 8-bit textures can't hold them
      }
    }

    let formatRGBA, formatRG, formatR;
    if (isWebGL2) {
      formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, texType);
      formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, texType);
      formatR = getSupportedFormat(gl, gl.R16F, gl.RED, texType);
    } else {
      formatRGBA = formatRG = formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, texType);
    }
    if (!formatRGBA || !formatRG || !formatR) return null;

    return { gl, ext: { formatRGBA, formatRG, formatR, texType, supportLinearFiltering } };
  }

  // Falls back R -> RG -> RGBA when a smaller format can't be rendered into
  function getSupportedFormat(gl, internalFormat, format, type) {
    if (supportRenderTextureFormat(gl, internalFormat, format, type)) return { internalFormat, format };
    if (internalFormat === gl.R16F) return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
    if (internalFormat === gl.RG16F) return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
    return null;
  }

  function supportRenderTextureFormat(gl, internalFormat, format, type) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(texture);
    return ok;
  }

  // Boot last, once every shader string above exists
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();

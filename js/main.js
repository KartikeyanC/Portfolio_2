// Kartikeyan portfolio — shared interactions for every page.
// Projects, services, process steps, tools and hero roles come from /content.json:
// edit that file to add or change content — no HTML needed.
(async () => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  // Escape text from content.json before putting it into HTML
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");

  // Brand mark: fill every .mark with six "k" glyphs
  $$(".mark").forEach((m) => { if (!m.children.length) m.innerHTML = "<span>k</span>".repeat(6); });

  // Dark / light theme toggle (the head script applies the saved choice before paint)
  const themeBtn = $("#themeBtn");
  if (themeBtn) {
    const root = document.documentElement;
    const sync = () => {
      const light = root.dataset.theme === "light";
      themeBtn.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
      themeBtn.setAttribute("aria-pressed", String(light));
    };
    themeBtn.addEventListener("click", () => {
      const next = root.dataset.theme === "light" ? "dark" : "light";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) {}
      sync();
    });
    sync();
  }

  // Current page in nav / panel / footer
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  $$(".nav__links a, .panel a, .footer__col a").forEach((a) => {
    const target = (a.getAttribute("href") || "").split("#")[0].toLowerCase();
    if (target && target === page) a.setAttribute("aria-current", "page");
  });

  // Nav background after scrolling
  const nav = $(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu panel
  const panel = $("#panel"), open = $("#menuOpen"), close = $("#menuClose");
  const setPanel = (on) => {
    panel.classList.toggle("is-open", on);
    panel.setAttribute("aria-hidden", String(!on));
    open.setAttribute("aria-expanded", String(on));
    document.documentElement.style.overflow = on ? "hidden" : "";
    if (on) close.focus();
  };
  open.addEventListener("click", () => setPanel(true));
  close.addEventListener("click", () => setPanel(false));
  panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setPanel(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setPanel(false); });

  // "Open to opportunities" card — set to false to switch it off everywhere
  const OPEN_TO_WORK = true;
  const otw = $("#otw"), footer = $(".footer");
  if (otw && OPEN_TO_WORK && footer) {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem("otw-dismissed") === "1"; } catch (e) {}
    const watch = () => {
      if (dismissed) return;
      if (footer.getBoundingClientRect().top < innerHeight * 0.85) otw.classList.add("is-on");
    };
    addEventListener("scroll", watch, { passive: true });
    watch();
    $("#otwClose").addEventListener("click", () => {
      dismissed = true;
      otw.classList.remove("is-on");
      try { sessionStorage.setItem("otw-dismissed", "1"); } catch (e) {}
    });
  } else if (otw) {
    otw.remove();
  }

  // About: intro text tailored to who is reading
  const intros = {
    anyone: "I'm <strong>Kartikeyan</strong> — a Chennai-based product &amp; UI/UX designer who blends clear thinking with visual craft, from interfaces and brand identities to motion.",
    recruiters: "I'm a <strong>product &amp; UI/UX designer</strong> who can take work from research and flows to polished UI — plus logo and motion design. Based in Chennai and happy to talk about roles, on-site or remote.",
    teams: "I design in <strong>flows, components and prototypes</strong>, so work is easy to test, build and scale. Expect clear handoff, reusable patterns and a design-system mindset.",
    clients: "Need a product, a brand, or both? I can design <strong>the website or app and the identity around it</strong> — like the Milton store and the Nexura logo — so everything feels like one brand.",
  };
  const tabs = $$(".intro__tabs [role=tab]"), introText = $("#introText");
  const pick = (b) => {
    tabs.forEach((t) => { t.setAttribute("aria-selected", String(t === b)); t.tabIndex = t === b ? 0 : -1; });
    introText.classList.add("is-swapping");
    setTimeout(() => { introText.innerHTML = intros[b.dataset.aud]; introText.classList.remove("is-swapping"); }, reduce ? 0 : 220);
  };
  tabs.forEach((b, n) => {
    b.tabIndex = n === 0 ? 0 : -1;
    b.addEventListener("click", () => pick(b));
    b.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const nb = tabs[(n + d + tabs.length) % tabs.length]; nb.focus(); pick(nb);
    });
  });

  // Contact form → opens the visitor's email app with everything filled in
  const form = $("#contactForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = form.elements;
      const subject = `Project enquiry — ${f.service.value} — ${f.name.value}`;
      const body = `Hi Kartikeyan,\n\n${f.message.value}\n\nName: ${f.name.value}\nEmail: ${f.email.value}\nService: ${f.service.value}\nTimeline: ${f.timeline.value || "—"}`;
      location.href = `mailto:kartikeyan4878@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      $("#formNote").textContent = "Opening your email app… If nothing happens, write to kartikeyan4878@gmail.com.";
    });
  }

  // ------------------------------------------------------------------
  // Content from content.json
  // ------------------------------------------------------------------
  let C = { roles: [], filters: [], projects: [], services: [], process: [], tools: [] };
  try {
    const res = await fetch("/content.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    C = { ...C, ...(await res.json()) };
  } catch (err) {
    console.error("Could not load content.json — run the site through a local server (python serve.py).", err);
  }

  // Site colour (set in /gk → content.json "theme"). Presets live in css/style.css;
  // a custom colour gets its button, text and folder shades worked out here.
  const applyTheme = (theme = {}) => {
    const root = document.documentElement, presets = ["lime", "orange", "violet"];
    const VARS = ["--acc", "--acc-rgb", "--acc-deep", "--acc-btn", "--on-acc", "--on-acc-2", "--on-btn", "--on-fold", "--acc-text-dark", "--acc-text-light"];
    VARS.forEach((v) => root.style.removeProperty(v));
    let cache = { accent: "", vars: {} };
    const hex = String(theme.custom || "").trim();
    if (theme.accent === "custom" && /^#?[0-9a-f]{6}$/i.test(hex)) {
      const rgb = hex.replace("#", "").match(/../g).map((h) => parseInt(h, 16));
      const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
      const mix = (c, to, t) => c.map((v, i) => Math.round(v + (to[i] - v) * t));
      const css = (c) => `rgb(${c.join(" ")})`;
      const shift = (c, to, bg, min) => { let t = 0, out = c; while (contrast(out, bg) < min && t < 1) { t += 0.05; out = mix(c, to, t); } return out; };
      const W = [255, 255, 255], K = [0, 0, 0];
      const whiteText = contrast(rgb, W) >= contrast(rgb, [17, 17, 17]);
      const onAcc = whiteText ? W : mix(rgb, K, 0.85);
      const btn = whiteText ? shift(rgb, K, W, 4.5) : rgb;
      cache = {
        accent: "custom",
        vars: {
          "--acc": css(rgb), "--acc-rgb": rgb.join(" "), "--acc-deep": css(mix(rgb, K, 0.4)),
          "--on-acc": css(onAcc), "--on-acc-2": whiteText ? "rgba(255,255,255,.86)" : css(mix(rgb, K, 0.7)),
          "--acc-btn": css(btn), "--on-btn": css(onAcc), "--on-fold": css(whiteText ? W : onAcc),
          "--acc-text-dark": css(shift(rgb, W, [0, 0, 0], 4.5)), "--acc-text-light": css(shift(rgb, K, [244, 244, 240], 4.5)),
        },
      };
    } else if (presets.includes(theme.accent)) {
      cache.accent = theme.accent;
    }
    if (cache.accent) root.dataset.accent = cache.accent; else delete root.dataset.accent;
    Object.entries(cache.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    // Remember it so the next page load paints in the right colour straight away (see the <head> script)
    try { localStorage.setItem("site-theme", JSON.stringify(cache)); } catch (e) {}
  };
  if (C.theme) applyTheme(C.theme);

  const live = C.projects.filter((p) => p.status !== "ongoing");
  const ongoing = C.projects.filter((p) => p.status === "ongoing");

  // Home — sticker counts follow the content
  const counts = { services: C.services.length, live: live.length, ongoing: ongoing.length };
  $$("[data-count-of]").forEach((el) => { const n = counts[el.dataset.countOf] ?? 0; el.dataset.count = n; el.textContent = pad(n); });
  const ongoingLabel = $('[data-label-of="ongoing"]');
  if (ongoingLabel) ongoingLabel.innerHTML = ongoing.length === 1 ? "Case study<br />on the way" : "Case studies<br />on the way";

  // Home — featured project grid (a "Let's work together" card fills an odd slot)
  const grid = $("#featuredProjects");
  if (grid) {
    const featured = C.projects.filter((p) => p.featured);
    grid.innerHTML = featured.map((p) => {
      const soon = p.status === "ongoing";
      const img = p.image ? `<img src="${esc(p.image)}" alt="${esc(p.alt)}" />` : `<div class="pgrid__soon">${esc(p.name)}</div>`;
      return `<a href="projects.html#${esc(p.id)}"${soon ? ' data-status="soon"' : ""}><div class="pgrid__img">${img}${soon ? '<span class="pgrid__badge"><i></i>Ongoing</span>' : ""}</div><div class="pgrid__cap"><b>${esc(p.name)} <span>| ${esc(p.type)}</span></b><small>${esc(p.category)}</small></div></a>`;
    }).join("") + (featured.length % 2 ? '<a href="contact.html" data-status="contact"><div class="pgrid__img"><div class="pgrid__soon pgrid__soon--cta">Your project<br />could be next</div></div><div class="pgrid__cap"><b>Let\'s work together</b><small>Any brief</small></div></a>' : "");
  }

  // Projects page — filters and cards
  const filterBox = $("#projectFilters");
  if (filterBox) {
    filterBox.innerHTML = [{ id: "all", label: "All" }, ...C.filters].map((f, i) => `<button class="${i ? "" : "is-on"}" data-f="${esc(f.id)}" aria-pressed="${!i}">${esc(f.label)}</button>`).join("");
  }
  const list = $("#projectList");
  if (list) {
    list.innerHTML = C.projects.map((p) => {
      const soon = p.status === "ongoing";
      const img = p.image ? `<img src="${esc(p.image)}" alt="${esc(p.alt)}" />` : '<div class="work__soon">Case study<br />coming soon</div>';
      return `<a class="work reveal" id="${esc(p.id)}" data-cat="${esc((p.filters || []).join(" "))}"${soon ? ' data-status="soon"' : ""} href="${esc(p.link || "contact.html")}">
          <div class="work__tags">${(p.tags || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
          <div class="work__frame"><div class="work__img">${img}</div><span class="work__name">${esc(p.name)} <i aria-hidden="true">↗</i></span></div>
          ${p.description ? `<p class="work__desc">${esc(p.description)}</p>` : ""}
        </a>`;
    }).join("") + `<a class="work reveal" data-cat="${esc(C.filters.map((f) => f.id).join(" "))}" data-status="contact" href="contact.html">
          <div class="work__tags"><span>Any brief</span><span>Open now</span></div>
          <div class="work__frame"><div class="work__img"><div class="work__cta">Your project<br />could be next</div></div><span class="work__name">Let's work together <i aria-hidden="true">↗</i></span></div>
        </a>`;
  }

  // Home — expertise panels
  const panelBox = $("#expertisePanels");
  if (panelBox) {
    panelBox.innerHTML = C.services.map((s, i) => `<div${i ? "" : ' class="is-on"'} tabindex="0"><span class="panels__n">${pad(i + 1)}</span><span class="panels__v" aria-hidden="true">${esc(s.name)}</span><div class="panels__body"><h3>${esc(s.name)}</h3><p>${esc(s.summary)}</p><ul>${(s.skills || []).map((k) => `<li>${esc(k)}</li>`).join("")}</ul></div></div>`).join("");
  }

  // Services page — service rows (each Enquire button pre-selects the service on the contact form)
  const rows = $("#serviceRows");
  if (rows) {
    rows.innerHTML = C.services.map((s, i) => `<article class="xrow reveal"><span class="xrow__num">${pad(i + 1)}</span><div class="xrow__tile" aria-hidden="true">${esc(s.letter || s.name[0])}</div>
          <div><h3>${esc(s.name)}</h3><h4>${esc(s.subtitle)}</h4><p>${esc(s.description)}</p>
            <ul>${(s.deliverables || []).map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
            <p style="margin-top:20px"><a class="btn" href="contact.html?service=${encodeURIComponent(s.name)}">Enquire ↗</a></p></div></article>`).join("");
  }

  // Contact page — service dropdown
  const select = $("#serviceSelect");
  if (select) {
    select.innerHTML = [...C.services.map((s) => s.name), "Something else"].map((n) => `<option>${esc(n)}</option>`).join("");
    const pre = new URLSearchParams(location.search).get("service");
    if (pre) select.value = pre;
  }

  // Process step tabs (Home + Services)
  const stepsBox = $("#processSteps");
  if (stepsBox && C.process.length) {
    const body = (st) => `<h3>${esc(st.name)}</h3><p>${esc(st.text)}</p><ul>${(st.items || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    stepsBox.innerHTML = `<div class="steps__tabs" role="tablist" aria-label="Process steps">${C.process.map((st, i) => `<button role="tab" id="stepTab${i}" aria-selected="${!i}" aria-controls="stepPanel" data-i="${i}"><small>${pad(i + 1)}</small><span>${esc(st.name)}</span><span aria-hidden="true">→</span></button>`).join("")}</div>
        <div class="steps__panel" id="stepPanel" role="tabpanel" aria-labelledby="stepTab0" aria-live="polite"><span class="steps__num" id="stepNum" aria-hidden="true">01</span><div class="steps__body" id="stepBody">${body(C.process[0])}</div></div>`;
    const stepTabs = $$(".steps__tabs [role=tab]", stepsBox), stepBody = $("#stepBody"), stepPanel = $("#stepPanel");
    const showStep = (i, focus) => {
      stepTabs.forEach((b, j) => { b.setAttribute("aria-selected", String(i === j)); b.tabIndex = i === j ? 0 : -1; });
      if (focus) stepTabs[i].focus();
      stepPanel.setAttribute("aria-labelledby", stepTabs[i].id);
      stepBody.classList.add("is-swapping");
      setTimeout(() => { stepBody.innerHTML = body(C.process[i]); $("#stepNum").textContent = pad(i + 1); stepBody.classList.remove("is-swapping"); }, reduce ? 0 : 180);
    };
    stepTabs.forEach((b, i) => {
      b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener("click", () => showStep(i));
      b.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (d) { e.preventDefault(); showStep((i + d + stepTabs.length) % stepTabs.length, true); }
      });
    });
  }

  // ------------------------------------------------------------------
  // Interactions on the rendered content
  // ------------------------------------------------------------------

  // Expertise panels: hover, focus or tap opens one panel
  const panels = $$(".panels > div");
  const openPanel = (p) => panels.forEach((x) => x.classList.toggle("is-on", x === p));
  panels.forEach((p) => ["mouseenter", "focus", "click"].forEach((ev) => p.addEventListener(ev, () => openPanel(p))));

  // Hero: type out rotating roles with a blinking caret
  const typed = $("#typed");
  const roles = C.roles.length ? C.roles : ["Product designer"];
  if (typed && !reduce && roles.length > 1) {
    let r = 0, i = roles[0].length, del = true;
    const tick = () => {
      const word = roles[r];
      if (del) {
        i--; typed.textContent = word.slice(0, i);
        if (i === 0) { del = false; r = (r + 1) % roles.length; }
        setTimeout(tick, 45);
      } else {
        const next = roles[r]; i++; typed.textContent = next.slice(0, i);
        if (i === next.length) { del = true; setTimeout(tick, 2200); } else setTimeout(tick, 85);
      }
    };
    setTimeout(tick, 2600);
  }

  // Round cursor over project cards (mouse only): "View project", or "Coming soon" for ongoing work
  const cards = $$(".pgrid a, .work");
  if (cards.length && hover) {
    document.body.classList.add("has-pcur");
    const cur = document.createElement("div");
    cur.className = "pcur"; cur.setAttribute("aria-hidden", "true");
    document.body.appendChild(cur);
    let x = 0, y = 0, cx = 0, cy = 0, run = false;
    const follow = () => { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; cur.style.left = cx + "px"; cur.style.top = cy + "px"; if (run) requestAnimationFrame(follow); };
    cards.forEach((c) => {
      c.addEventListener("pointerenter", (e) => {
        const s = c.dataset.status;
        cur.innerHTML = s === "soon" ? "Coming<br>soon" : s === "contact" ? "Say hi <em>→</em>" : "View<br>project <em>↗</em>";
        cur.classList.toggle("is-soon", s === "soon");
        x = cx = e.clientX; y = cy = e.clientY;
        cur.classList.add("is-on");
        if (!run) { run = true; follow(); }
      });
      c.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; });
      c.addEventListener("pointerleave", () => { cur.classList.remove("is-on"); run = false; });
    });
  }

  // Projects filter
  const filters = $$(".filters button");
  filters.forEach((b) => b.addEventListener("click", () => {
    filters.forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    $$(".work[data-cat]").forEach((w) => w.classList.toggle("is-hidden", b.dataset.f !== "all" && !w.dataset.cat.split(" ").includes(b.dataset.f)));
  }));

  // Sticker facts: count up once visible
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (reduce) return;
      let n = 0;
      const step = () => { el.textContent = pad(n); if (n++ < end) setTimeout(step, 1200 / (end + 1)); };
      step();
    }, { threshold: 0.6 });
    io.observe(el);
  });

  // Tools folder: hover (or first tap) lifts the tools, clicking the glass drops it and the
  // folder zooms to fill the section with each tool's details and proficiency.
  // Tool logos: { style: "figma" } draws Figma's five-shape mark, { style: "tile", letters, tile, color }
  // draws an Adobe-style rounded tile, { style: "image", image } uses an uploaded logo file.
  const logoSvg = (l = {}) => l.style === "image" && l.image
    ? `<img src="${esc(l.image)}" alt="" style="width:100%;height:100%;object-fit:contain" />`
    : l.style === "figma"
    ? '<svg viewBox="0 0 38 57" aria-hidden="true"><path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/><path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/><path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/><path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/><path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/></svg>'
    : `<svg viewBox="0 0 240 234" aria-hidden="true"><rect width="240" height="234" rx="42.5" fill="${esc(l.tile)}"/><text x="120" y="160" text-anchor="middle" fill="${esc(l.color)}" font-family="Inter Tight, Arial, sans-serif" font-weight="600" font-size="118" letter-spacing="-2">${esc(l.letters)}</text></svg>`;

  const TOOLS = C.tools;
  const stage = $("#toolsFolder");
  if (stage && TOOLS.length) {
    if (!hover) $(".tfold__hint", stage).textContent = "Tap the folder, then tap the glass";
    const fan = (k) => (k % 2 ? -1 : 1) * Math.ceil(k / 2); // 0, -1, 1, -2, 2 … most used in the middle
    stage.insertAdjacentHTML("beforeend", `
      <div class="folder">
        <div class="folder__back"></div>
        <div class="folder__items" aria-hidden="true">${TOOLS.slice(0, 5).map((t, k) => `<div class="fi" style="--i:${fan(k)};--o:${k};z-index:${5 - k}"><span class="logo">${logoSvg(t.logo)}</span><b>${esc(t.name)}</b></div>`).join("")}</div>
        <button class="folder__front" type="button" aria-expanded="false" aria-controls="toolsZoom" aria-label="Open my tools"><span>My toolkit <i>Open</i></span><span style="display:block"><b>Tools</b><br><span>${TOOLS.length} apps · tap to see details</span></span></button>
      </div>
      <div class="zoom" id="toolsZoom" role="region" aria-label="Tools and proficiency"><div class="zoom__in">
        <div class="zoom__top"><div><small>Toolkit</small><h3>Tools &amp; proficiency</h3></div><button class="zoom__close" type="button">Close ✕</button></div>
        <ul class="pro">${TOOLS.map((t, k) => `<li style="--o:${k}"><span class="ic"><span class="logo">${logoSvg(t.logo)}</span></span><b>${esc(t.name)}</b><p>${esc(t.use)}</p><div class="lv"><span>${esc(t.level)}</span><span>${+t.proficiency}%</span></div><div class="bar" role="img" aria-label="${esc(t.name)} proficiency ${+t.proficiency}%"><i style="--v:${+t.proficiency}%;--o:${k}"></i></div><div class="lv"><span>Used</span><span>${esc(t.frequency)}</span></div></li>`).join("")}</ul>
      </div></div>`);

    const folder = $(".folder", stage), front = $(".folder__front", stage), back = $(".folder__back", stage);
    const zoom = $(".zoom", stage), closeBtn = $(".zoom__close", stage);
    let isOpen = false, busy = false;

    // Keep the zoom layer sitting exactly on the folder, then grow it to fill the section
    const matchFolder = () => {
      const s = stage.getBoundingClientRect(), r = back.getBoundingClientRect();
      Object.assign(zoom.style, { left: r.left - s.left + "px", top: r.top - s.top + "px", width: r.width + "px", height: r.height + "px" });
    };
    const fill = () => Object.assign(zoom.style, { left: "0px", top: "0px", width: "100%", height: "100%" });

    // One continuous motion: glass drops, folder grows while it falls, details fade in as the zoom finishes
    const T = reduce ? { zoom: 0, show: 0, done: 0, back: 0, flap: 0 } : { zoom: 120, show: 380, done: 720, back: 100, flap: 380 };
    const openIt = () => {
      if (isOpen || busy) return; busy = true; isOpen = true;
      folder.classList.add("is-drop");
      front.setAttribute("aria-expanded", "true");
      setTimeout(() => {
        matchFolder(); zoom.style.visibility = "visible";
        zoom.getBoundingClientRect();
        stage.classList.add("is-open");
        fill(); zoom.classList.add("is-full");
      }, T.zoom);
      setTimeout(() => zoom.classList.add("is-ready"), T.zoom + T.show);
      setTimeout(() => {
        zoom.style.transition = "none"; zoom.getBoundingClientRect(); zoom.style.transition = "";
        closeBtn.focus({ preventScroll: true });
        busy = false;
      }, T.zoom + T.done);
    };
    const closeIt = () => {
      if (!isOpen || busy) return; busy = true;
      zoom.classList.remove("is-ready");
      setTimeout(() => { matchFolder(); zoom.classList.remove("is-full"); stage.classList.remove("is-open"); }, T.back);
      setTimeout(() => folder.classList.remove("is-drop", "is-peek"), T.back + T.flap);
      setTimeout(() => {
        zoom.style.visibility = "hidden";
        front.setAttribute("aria-expanded", "false");
        front.focus({ preventScroll: true });
        isOpen = false; busy = false;
      }, T.back + T.done);
    };

    if (hover) {
      folder.addEventListener("mouseenter", () => { if (!isOpen) folder.classList.add("is-peek"); });
      folder.addEventListener("mouseleave", () => folder.classList.remove("is-peek"));
    }
    // Touch: first tap lifts the tools, the next tap opens. Mouse: hover lifts, click on the glass opens.
    folder.addEventListener("click", (e) => {
      if (!hover && !folder.classList.contains("is-peek")) { folder.classList.add("is-peek"); return; }
      if (e.target.closest(".folder__front") || !hover) openIt();
    });
    closeBtn.addEventListener("click", closeIt);
    stage.addEventListener("keydown", (e) => { if (e.key === "Escape") closeIt(); });
  }

  // Deep link to a project card (e.g. projects.html#milton) once the cards exist
  if (location.hash && list) { const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) t.scrollIntoView(); }

  // Reveal on scroll
  const items = $$(".reveal");
  if (reduce) { items.forEach((el) => el.classList.add("is-in")); return; }
  const check = () => {
    const line = innerHeight * 0.9;
    items.forEach((el) => {
      if (!el.classList.contains("is-in") && el.getBoundingClientRect().top < line) el.classList.add("is-in");
    });
  };
  addEventListener("scroll", check, { passive: true });
  addEventListener("load", check);
  setInterval(check, 500);
  check();
})();

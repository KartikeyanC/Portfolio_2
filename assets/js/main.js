// Kartikeyan portfolio — shared interactions for every page.
// All content — projects, services, tools, process, page text, contact details, socials and the
// site colour — comes from /content.json (edited in the /gk dashboard):
// edit that file to add or change content — no HTML needed.
(async () => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  // Escape text from content.json before putting it into HTML
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Links typed in /gk: only web (http/https), email (mailto:) and phone (tel:) links or paths on this site.
  // Anything else, e.g. "javascript:…", becomes "#" so a bad link can never run code.
  const safeUrl = (u) => {
    const v = String(u ?? "").trim();
    const scheme = v.replace(/[\u0000-\u0020]/g, "").match(/^([a-z][a-z0-9+.-]*):/i);
    return !scheme || /^(https?|mailto|tel)$/i.test(scheme[1]) ? v : "#";
  };
  const escUrl = (u) => esc(safeUrl(u));
  const pad = (n) => String(n).padStart(2, "0");

  // Brand mark: six "k" strokes turned around the centre, cut to a hexagon and set inside a hexagon frame
  // (same drawing in assets/favicon.svg). Drawn in currentColor.
  const K_ARM = "M7 -40L7 -3M9 -21L23 -46M12 -27L24 -3";
  let markN = 0;
  const markSvg = (cls = "") => {
    const id = "kmark" + ++markN;
    return `<svg${cls ? ` class="${cls}"` : ""} viewBox="-34 -34 68 68" aria-hidden="true"><defs><clipPath id="${id}"><polygon points="0,-26 22.52,-13 22.52,13 0,26 -22.52,13 -22.52,-13"/></clipPath></defs><polygon points="0,-30 25.98,-15 25.98,15 0,30 -25.98,15 -25.98,-15" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><g fill="none" stroke="currentColor" stroke-width="7" clip-path="url(#${id})">${[0, 60, 120, 180, 240, 300].map((r) => `<path d="${K_ARM}" transform="rotate(${r})"/>`).join("")}</g></svg>`;
  };

  // Pictures picked up by file name from assets/images/ (see assets/images/README.txt). A picture is tried as
  // .webp, then .jpg, .png, .jpeg; if none exists the element is swapped for its fallback (data-fb) or removed.
  const IMG = "/assets/images";
  const autoImg = (base, alt, extra = "", fb = "") => `<img src="${esc(base)}.webp" alt="${esc(alt)}" data-exts="jpg,png,jpeg" data-fb="${esc(fb)}"${extra} />`;
  document.addEventListener("error", (e) => {
    const im = e.target;
    if (!im || im.tagName !== "IMG" || im.dataset.exts === undefined) return;
    if (im.hasAttribute("srcset")) { im.removeAttribute("srcset"); im.removeAttribute("sizes"); return; } // a card-size copy is missing → load the full cover (src)
    const exts = im.dataset.exts ? im.dataset.exts.split(",") : [];
    if (exts.length) { im.dataset.exts = exts.slice(1).join(","); im.src = im.getAttribute("src").replace(/\.\w+$/, "." + exts[0]); return; }
    const fb = im.dataset.fb;
    if (fb === "remove") (im.closest("[data-pic]") || im).remove();
    else im.outerHTML = fb || "";
  }, true);
  // A project's cover: the picture set in /gk if there is one, otherwise assets/images/projects/<id>/cover.webp
  // Covers are exported big (3000–4000 px) for the case-study hero; squeezed 5–8× by the browser into a card they went
  // soft. So cards also list sharp pre-shrunk copies (cover@640.webp … cover@2000.webp, made by build_single.py, which
  // serve.py runs) and the browser loads the one that fits. `sizes` = how wide the picture shows; "" = full cover only.
  const COVER_W = [640, 960, 1400, 2000]; // same list as CARD_WIDTHS in build_single.py
  const CARD = "(max-width: 860px) 100vw, 50vw";
  const coverSet = (p) => p.imageSet || (p.image ? "" : COVER_W.map((w) => `${IMG}/projects/${p.id}/cover@${w}.webp ${w}w`).join(", "));
  const coverImg = (p, extra = "", fb = "", sizes = CARD) => {
    const set = sizes && coverSet(p), ss = set ? ` srcset="${esc(set)}" sizes="${sizes}"` : "";
    return p.image ? `<img src="${esc(p.image)}"${ss} alt="${esc(p.alt || "")}"${extra} />` : autoImg(`${IMG}/projects/${p.id}/cover`, p.alt || p.name, ss + extra, fb);
  };

  // Intro — on the first page of a visit AND on every reload/refresh (user's request); clicking from page to page
  // doesn't replay it. A blue curtain with the name and roles cracks open along the middle, the halves split up and
  // down and the dimmed page fades in (idea from a screen recording the user shared). Skipped when motion is reduced.
  // Timer-based (not requestAnimationFrame) so it still finishes in a background tab.
  // The single file shows pages in a frame, so there the reload is read from (and the "already played" mark kept on) the top window.
  let introSeen = true;
  try { introSeen = sessionStorage.getItem("intro-seen") === "1"; sessionStorage.setItem("intro-seen", "1"); } catch (e) {}
  let topWin = window;
  try { if (window.top !== window && window.top.performance) topWin = window.top; } catch (e) {}
  const navEntry = topWin.performance.getEntriesByType ? topWin.performance.getEntriesByType("navigation")[0] : null;
  const reloaded = navEntry ? navEntry.type === "reload" : !!(topWin.performance.navigation && topWin.performance.navigation.type === 1);
  if ((!introSeen || reloaded) && !reduce && !topWin.__introPlayed) {
    topWin.__introPlayed = true;
    let roles = ["Product designer", "UI/UX designer", "Graphic designer", "Motion designer", "Video editor"];
    try { const c = JSON.parse(window.__SITE_CONTENT__ || sessionStorage.getItem("content-json") || "null"); if (c && Array.isArray(c.roles) && c.roles.length) roles = c.roles; } catch (e) {}
    const intro = document.createElement("div");
    intro.className = "cin"; intro.setAttribute("aria-hidden", "true");
    // name + roles letters: the first half slides in from the left, the second half from the right, meeting in the centre.
    // Letters nearest the centre lead, so none cross on the way in; `spread` is how long the whole stagger takes.
    // Letters are inline-blocks, so a line could break inside a word: on a phone each role is kept whole
    // (`keepWith` = the separator that ends a group), and lines wrap only between roles.
    const splitIn = (text, start, spread, keepWith) => {
      const chars = [...text], half = Math.ceil(chars.length / 2), step = spread / Math.max(1, half - 1);
      const letters = chars.map((ch, i) => {
        if (ch === " ") return " ";
        const left = i < half, n = left ? half - 1 - i : i - half;
        return `<i class="${left ? "is-l" : "is-r"}" style="--d:${(start + n * step).toFixed(3)}s">${esc(ch)}</i>`;
      });
      if (!keepWith) return letters.join("");
      let html = "", group = "";
      letters.forEach((l, i) => {
        if (l === " " && chars[i - 1] === keepWith) { html += `<span class="cin__g">${group}</span> `; group = ""; }
        else group += l;
      });
      return `${html}<span class="cin__g">${group}</span>`;
    };
    const rolesText = roles.map((r) => r.replace(/\b\w/g, (m) => m.toUpperCase())).join(" | ");
    intro.innerHTML = `<div class="cin__dim"></div><div class="cin__h cin__h--top"><p class="cin__name"><span>${splitIn("KARTIKEYAN", 0.05, 0.36)}<sup>™</sup></span></p></div>`
      + `<div class="cin__h cin__h--bot"><p class="cin__roles">${splitIn(rolesText, 0.15, 0.33, "|")}</p></div>`;
    document.body.appendChild(intro);
    document.documentElement.classList.add("is-intro");
    // about 30% slower than the first version (user, 16 Nov): letters land, a crack opens, then the halves split
    setTimeout(() => intro.classList.add("is-crack"), 1650);
    setTimeout(() => { intro.classList.remove("is-crack"); intro.classList.add("is-open"); }, 2150);
    setTimeout(() => { document.documentElement.classList.remove("is-intro"); if (window.lenis) window.lenis.start(); }, 3150);
    setTimeout(() => intro.remove(), 4000);
  }

  // Brand mark: fill every .mark with six "k" glyphs
  $$(".mark").forEach((m) => { if (!m.children.length) m.innerHTML = markSvg(); });

  // Dark / light theme toggle (the head script applies the saved choice before paint)
  const themeBtn = $("#themeBtn");
  if (themeBtn) {
    const root = document.documentElement;
    const sync = () => {
      const light = root.dataset.theme === "light";
      themeBtn.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
      themeBtn.setAttribute("aria-pressed", String(light));
      // browser chrome (phone address bar) matches the page background in either theme
      let tc = $('meta[name="theme-color"]');
      if (!tc) { tc = document.createElement("meta"); tc.name = "theme-color"; document.head.append(tc); }
      tc.content = getComputedStyle(root).getPropertyValue("--bg").trim() || (light ? "#fff" : "#000");
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
  const navPage = page === "case.html" || page === "respay.html" || page === "vstar.html" || page === "nexura.html" || page === "ifortigo.html" || page === "myshoptill.html" || page === "posters.html" || page === "nineflow.html" || page === "finroot.html" ? "projects.html" : page; // case studies belong to Projects
  $$(".nav__links a, .panel a, .footer__col a").forEach((a) => {
    const target = (a.getAttribute("href") || "").split("#")[0].split("/").pop().toLowerCase();
    if (target && target === navPage) a.setAttribute("aria-current", "page");
  });

  // Nav: sits under the announcement bar at the top, becomes a floating pill once you scroll,
  // and turns light while it is over a section marked data-nav="light"
  const nav = $(".nav"), abar = $("#abar");
  const onScroll = () => {
    const barH = abar && abar.offsetParent !== null ? abar.offsetHeight : 0;
    nav.style.setProperty("--nav-top", Math.max(0, barH - scrollY) + "px");
    document.documentElement.style.setProperty("--abar-h", barH + "px"); // full-screen heroes subtract the bar
    nav.classList.toggle("is-pill", scrollY > 60);
    const y = nav.getBoundingClientRect().top + nav.offsetHeight / 2;
    nav.classList.toggle("on-light", $$("[data-nav=light]").some((s) => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom >= y; }));
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  // Announcement bar: dismiss for this visit
  if (abar) $("#abarX").addEventListener("click", () => {
    abar.hidden = true;
    try { sessionStorage.setItem("abar-x", "1"); } catch (e) {}
    onScroll();
  });

  // Smooth scrolling like kraftbase.com: Lenis eases the wheel / trackpad scroll (user-set: lerp .07 = smooth glide, wheelMultiplier .6 = shorter, slower steps; the Framer default is lerp .1).
  // Native scrolling stays on touch screens and for visitors who prefer reduced motion. The library loads
  // async from the CDN; if it can't load, the page simply keeps normal scrolling.
  const startLenis = () => {
    if (reduce || window.lenis || !window.Lenis) return;
    window.lenis = new Lenis({ lerp: 0.07, wheelMultiplier: 0.6, anchors: true, autoRaf: true });
    if (document.documentElement.classList.contains("is-intro")) window.lenis.stop(); // the intro locks scrolling
  };
  if (window.Lenis) startLenis(); else { const lib = $("#lenisLib"); if (lib) lib.addEventListener("load", startLenis); }

  // Home hero: the moving blue light only animates while the hero is on screen (saves battery / GPU)
  const heroLight = $(".glow--live");
  if (heroLight && "IntersectionObserver" in window) new IntersectionObserver(([e]) => heroLight.classList.toggle("is-paused", !e.isIntersecting)).observe(heroLight);
  const kpLight = $("#kpLight"); // Home paint hero: the drifting light behind it also stops while off screen
  if (kpLight && "IntersectionObserver" in window) new IntersectionObserver(([e]) => kpLight.classList.toggle("is-paused", !e.isIntersecting)).observe(kpLight);

  // Mobile menu panel
  const panel = $("#panel"), open = $("#menuOpen"), close = $("#menuClose");
  const setPanel = (on) => {
    const was = panel.classList.contains("is-open");
    panel.classList.toggle("is-open", on);
    panel.setAttribute("aria-hidden", String(!on));
    open.setAttribute("aria-expanded", String(on));
    document.documentElement.style.overflow = on ? "hidden" : "";
    if (window.lenis) window.lenis[on ? "stop" : "start"]();
    // keep Tab inside the open menu: everything else on the page goes inert
    for (const el of document.body.children) if (el !== panel && el.tagName !== "SCRIPT") el.inert = on;
    if (on) close.focus();
    else if (was) open.focus();
  };
  open.addEventListener("click", () => setPanel(true));
  close.addEventListener("click", () => setPanel(false));
  panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setPanel(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("is-open")) setPanel(false); });

  // Contact form. With site.formEndpoint set ("/" on Netlify, or a Formspree URL) it sends directly and shows
  // sending / sent / failed. Without one it opens the visitor's email app — and, because webmail users have no
  // email app, it also shows the message ready to copy. The typed message is never cleared unless it was sent.
  const form = $("#contactForm");
  if (form) {
    // C (the content) loads further down, so read it when the form is sent, not now
    const to = () => (C.site && C.site.email) || "kartikeyan4878@gmail.com";
    const status = $("#formStatus"), sendBtn = $('button[type="submit"]', form), sendLabel = sendBtn.textContent;
    const say = (html) => { status.innerHTML = html; status.hidden = false; };
    const copyBtns = (text) => {
      say(`<p>${status.dataset.lead}</p><div class="form__copy"><button class="btn btn--ghost" type="button" data-copy="msg">Copy message</button><button class="btn btn--ghost" type="button" data-copy="mail">Copy email address</button></div>`);
      $$("[data-copy]", status).forEach((b) => b.addEventListener("click", () => {
        const val = b.dataset.copy === "msg" ? text : to(), label = b.textContent;
        const done = () => { b.textContent = "Copied ✓"; setTimeout(() => (b.textContent = label), 1800); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(val).then(done, () => prompt("Copy this:", val));
        else prompt("Copy this:", val);
      }));
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = form.elements, mail = to(), endpoint = (C.site && C.site.formEndpoint) || "";
      if (f["bot-field"] && f["bot-field"].value) return; // spam bots fill the hidden field
      const subject = f.service.value === "CV request" ? `CV request — ${f.name.value}` : `Project enquiry — ${f.service.value} — ${f.name.value}`;
      const body = `Hi Kartikeyan,\n\n${f.message.value}\n\nName: ${f.name.value}\nEmail: ${f.email.value}\nService: ${f.service.value}\nTimeline: ${f.timeline.value || "—"}`;
      const viaEmailApp = (lead) => {
        status.dataset.lead = lead;
        location.href = `mailto:${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        copyBtns(`To: ${mail}\nSubject: ${subject}\n\n${body}`);
      };
      if (!endpoint) return viaEmailApp(`Your email app should open with the message ready. Nothing opened? Copy the message and send it to <b>${esc(mail)}</b> from any email.`);
      sendBtn.disabled = true; sendBtn.textContent = "Sending…"; status.hidden = true;
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: new URLSearchParams(new FormData(form)).toString() })
        .then((r) => {
          if (!r.ok) throw new Error(r.status);
          say(`<p><b>Thanks, ${esc(f.name.value.split(" ")[0] || "there")} — your message is on its way.</b> I'll reply to ${esc(f.email.value)}.</p>`);
          form.reset();
        })
        .catch(() => viaEmailApp(`Your message couldn't be sent just now, but it's still here. Try again in a moment, or copy it and email <b>${esc(mail)}</b>.`))
        .finally(() => { sendBtn.disabled = false; sendBtn.textContent = sendLabel; });
    });
  }

  // ------------------------------------------------------------------
  // Content from content.json
  // ------------------------------------------------------------------
  // The content is kept for the visit (sessionStorage) so every page after the first renders straight
  // away, before its first paint. That lets page transitions animate the finished page (e.g. the project
  // picture flying into its case study). A fresh copy is always fetched; if it differs (you just edited
  // something in /gk), the page reloads once to show it.
  let C = { roles: [], filters: [], projects: [], services: [], process: [], tools: [] };
  const CACHE = "content-json";
  let cached = null;
  try { cached = sessionStorage.getItem(CACHE); } catch (e) {}
  const fresh = fetch("/content.json", { cache: "no-cache" }).then((res) => { if (!res.ok) throw new Error(res.status); return res.text(); });
  const remember = (txt) => { try { sessionStorage.setItem(CACHE, txt); } catch (e) {} };
  if (cached) {
    try { C = { ...C, ...JSON.parse(cached) }; } catch (e) { cached = null; }
    fresh.then((txt) => { if (txt !== cached) { remember(txt); location.reload(); } }).catch(() => {});
  }
  if (!cached) {
    try { const txt = await fresh; C = { ...C, ...JSON.parse(txt) }; remember(txt); }
    catch (err) { console.error("Could not load content.json — run the site through a local server (python serve.py).", err); }
  }
  // a project switched off in /gk ("Show on the site" off) is left out everywhere; its own page still opens by direct link
  const allProjects = C.projects || [];
  C.projects = allProjects.filter((p) => p && p.show !== false);

  // Site colour (set in /gk → content.json "theme"). Presets live in css/style.css;
  // a custom colour gets its button, text and folder shades worked out here.
  const applyTheme = (theme = {}) => {
    const root = document.documentElement, presets = ["lime", "orange", "violet", "coral"];
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
          "--acc-text-dark": css(shift(rgb, W, [0, 0, 0], 4.5)), "--acc-text-light": css(shift(rgb, K, [245, 244, 243], 4.5)),
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

  // ------------------------------------------------------------------
  // Site text, contact details and social links (all editable in /gk)
  // ------------------------------------------------------------------
  const S = C.site || {}, P = C.pages || {};
  // **bold** → blue/strong, *italic* → soft grey emphasis (same styling as before)
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), C);
  const telHref = (p) => "tel:" + String(p || "").replace(/[^\d+]/g, "");
  // Each contact detail has its own Show switch in /gk (pages ship without them; they are filled in only when switched on)
  const email = S.showEmail ? S.email : "", phone = S.showPhone ? S.phone : "";
  const socials = (S.socials || []).filter((x) => x && x.name && x.url && x.show);
  const handle = (x) => x.label || "@" + decodeURIComponent(x.url.replace(/\/+$/, "").split("/").pop() || x.name);
  // Contact rows for socials: big platform name + a line on what's there; hovering a row shows that
  // platform's logo in its brand colour, following the cursor (phones: the logo sits inline instead)
  const SOC = {
    linkedin: ["#0a66c2", '<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z"/>'],
    behance: ["#1769ff", '<path d="M7 4.1c.7 0 1.3.1 1.9.2.6.1 1 .4 1.5.6.4.3.7.7 1 1.2.2.6.3 1.2.3 1.8 0 .8-.2 1.4-.5 2-.3.5-.8.9-1.5 1.3.9.3 1.6.8 2 1.4.5.7.7 1.5.7 2.5 0 .8-.1 1.4-.4 2-.3.6-.7 1-1.2 1.4-.5.4-1 .6-1.7.8-.6.2-1.3.3-1.9.3H0V4.1h7Zm-.4 5.6c.6 0 1-.1 1.4-.4.4-.3.6-.8.6-1.4 0-.4-.1-.7-.2-.9-.1-.2-.3-.4-.5-.5-.2-.1-.5-.2-.7-.3H3.2v3.5h3.4Zm.2 7.3c.3 0 .6 0 .9-.1.3-.1.5-.2.8-.3.2-.2.4-.4.5-.6.1-.3.2-.6.2-1 0-.8-.2-1.4-.6-1.7-.5-.3-1-.5-1.7-.5H3.2V17h3.6Zm10.1-.1c.4.4 1.1.7 1.9.7.6 0 1.1-.1 1.5-.5.4-.3.7-.6.8-1h2.6c-.4 1.3-1 2.2-1.9 2.8-.9.6-1.9.9-3.1.9-.8 0-1.6-.1-2.3-.4-.7-.3-1.2-.7-1.7-1.2s-.8-1.1-1.1-1.9c-.3-.7-.4-1.5-.4-2.4 0-.8.1-1.6.4-2.3.3-.7.6-1.3 1.1-1.9.5-.5 1.1-.9 1.7-1.2.7-.3 1.4-.4 2.3-.4.9 0 1.7.2 2.4.5.7.4 1.2.8 1.7 1.5.4.6.8 1.3.9 2.1.2.8.3 1.6.2 2.5h-7.7c0 .9.3 1.7.7 2.1Zm3.4-5.7c-.4-.4-.9-.6-1.7-.6-.5 0-.9.1-1.2.3-.3.2-.6.4-.7.6-.2.3-.3.5-.4.8-.1.3-.1.5-.1.7h4.8c-.2-.8-.4-1.4-.7-1.8Zm-4.7-6.1h6v1.5h-6V5.1Z"/>'],
    medium: ["#111111", '<path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12Zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42ZM24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12Z"/>'],
    dribbble: ["#ea4c89", '<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3.6c3 4 5.3 9 6.6 16.3M2.8 10.2c5.3.3 10.4-1 15.3-4.6M5.6 19c3.4-4.3 8-5.6 15.6-3.6" fill="none" stroke="currentColor" stroke-width="2"/>'],
    instagram: ["#e1306c", '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.3"/>'],
  };
  const MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7.2V18a1.5 1.5 0 0 0 1.5 1.5H6v-8.3l6 4.6 6-4.6v8.3h2.5A1.5 1.5 0 0 0 22 18V7.2a2 2 0 0 0-3.2-1.6L12 10.8 5.2 5.6A2 2 0 0 0 2 7.2Z"/></svg>';
  const mailAttrs = (addr) => `data-logo="${esc(MAIL)}" style="--brand:${/@gmail\.com$/i.test(addr) ? "#ea4335" : "var(--acc)"}"`;
  const PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.2 9 3a1.3 1.3 0 0 1 1.3.9l1.1 3.3a1.3 1.3 0 0 1-.4 1.4L9.3 10a12 12 0 0 0 4.7 4.7l1.4-1.7a1.3 1.3 0 0 1 1.4-.4l3.3 1.1a1.3 1.3 0 0 1 .9 1.3l-.2 2.4A2.4 2.4 0 0 1 18.4 19.6 15.6 15.6 0 0 1 4.4 5.6a2.4 2.4 0 0 1 2.2-2.4Z"/></svg>';
  const PHONE_BRAND = "#34c759"; // call-button green
  const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 5.3 6.3 11.6 6.9 12.2a.9.9 0 0 0 1.2 0c.6-.6 6.9-6.9 6.9-12.2A7.5 7.5 0 0 0 12 2Zm0 10.3a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Z"/></svg>';
  const PIN_BRAND = "#ea4335"; // map-pin red
  const mapHref = (place) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place);
  const socKey = (x) => String(x.name).toLowerCase().replace(/[^a-z]/g, "");
  const socLogo = (x) => SOC[socKey(x)] ? `<svg viewBox="0 0 24 24" aria-hidden="true">${SOC[socKey(x)][1]}</svg>` : `<b>${esc(x.name[0])}</b>`;
  const socRow = (x) => `<a class="soc" data-soc="${socKey(x)}" style="--brand:${(SOC[socKey(x)] || ["var(--acc)"])[0]}" href="${escUrl(x.url)}" target="_blank" rel="noopener">
      <span class="soc__handle">${esc(handle(x))}</span><b><em class="soc__ic">${socLogo(x)}</em><span class="soc__name">${esc(x.name)}${x.note ? `<small>${esc(x.note)}</small>` : ""}</span></b><i aria-hidden="true">↗</i></a>`;


  if (C.site) {
    $$('[data-bind="email"]').forEach((a) => { if (!email) return; a.href = "mailto:" + email; a.textContent = email;
      a.classList.add("soc-link"); a.dataset.logo = MAIL; a.style.setProperty("--brand", /@gmail\.com$/i.test(email) ? "#ea4335" : "var(--acc)"); (a.closest("dl > div") || a.parentElement).hidden = false; });
    $$('[data-bind="phone"]').forEach((a) => { if (!phone) return; a.href = telHref(phone); a.textContent = phone;
      a.classList.add("soc-link"); a.dataset.logo = PHONE; a.style.setProperty("--brand", PHONE_BRAND); a.parentElement.hidden = false; });
    $$('[data-bind="contact-line"]').forEach((el) => { el.textContent = [email, phone].filter(Boolean).join(" · "); el.hidden = !el.textContent; });
    // Footer (bento): email card with copy button + live IST clock, and an "Elsewhere" card of brand tiles
    const ft = (k) => $$(`[data-ft="${k}"]`);
    if (email) {
      ft("mail-title").forEach((h) => (h.textContent = "Write to me"));
      ft("mail").forEach((a) => {
        a.href = "mailto:" + email; a.textContent = email;
        a.classList.add("soc-link"); a.dataset.logo = MAIL; a.style.setProperty("--brand", /@gmail\.com$/i.test(email) ? "#ea4335" : "var(--acc)");
      });
      ft("copy").forEach((b) => {
        b.hidden = false;
        b.addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(email); b.textContent = "Copied ✓"; } catch { b.textContent = email; }
          setTimeout(() => (b.textContent = "Copy email"), 1800);
        });
      });
    }
    if (S.location) ft("city").forEach((el) => (el.textContent = S.location.split(",")[0]));
    const clocks = ft("clock");
    if (clocks.length) {
      const tickIST = () => { const t = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST"; clocks.forEach((c) => (c.textContent = t)); };
      tickIST(); setInterval(tickIST, 30000);
    }
    const tile = (href, brand, logo, name, note, ext = true) => `<a href="${escUrl(href)}"${ext ? ' target="_blank" rel="noopener"' : ""} style="--brand:${brand}"><span class="fic">${logo}</span><b>${esc(name)}${note ? `<small>${esc(note)}</small>` : ""}</b><span class="arrow" aria-hidden="true">↗</span></a>`;
    const tiles = [
      ...socials.map((x) => tile(x.url, (SOC[socKey(x)] || ["var(--acc)"])[0], socLogo(x), x.name, x.note)),
      phone ? tile(telHref(phone), PHONE_BRAND, PHONE, phone, "Call me", false) : "",
      S.location ? tile(mapHref(S.location), PIN_BRAND, PIN, S.location, "Open to remote") : "",
    ].join("");
    ft("soc").forEach((el) => { el.innerHTML = tiles; el.closest("[data-ft='elsewhere']").hidden = !tiles; });
    $$('[data-render="socials"]').forEach((el) => {
      el.innerHTML = "<small>(SOCIALS)</small>" + socials.map((x) => `<a class="soc-link" data-soc="${socKey(x)}" data-logo="${esc(socLogo(x))}" style="--brand:${(SOC[socKey(x)] || ["var(--acc)"])[0]}" href="${escUrl(x.url)}" target="_blank" rel="noopener">${esc(x.name)} ↗</a>`).join("");
      el.hidden = !socials.length;
    });
  }
  if (C.site) {
    const rowsBox = $('[data-render="contact-rows"]');
    if (rowsBox) {
      rowsBox.innerHTML = [
        email ? `<a class="soc" ${mailAttrs(email)} href="mailto:${esc(email)}"><span>Email</span><b class="lower">${esc(email)}</b><i aria-hidden="true">↗</i></a>` : "",
        phone ? `<a class="soc" data-logo="${esc(PHONE)}" style="--brand:${PHONE_BRAND}" href="${escUrl(telHref(phone))}"><span>Phone</span><b>${esc(phone)}</b><i aria-hidden="true">↗</i></a>` : "",
        ...socials.map(socRow),
        S.location ? `<a class="soc" data-logo="${esc(PIN)}" style="--brand:${PIN_BRAND}" href="${escUrl(mapHref(S.location))}" target="_blank" rel="noopener"><span>Location</span><b>${esc(S.location)}</b><i aria-hidden="true">↗</i></a>` : "",
      ].join("");
    }
  }
  $$("[data-bind^='site.'], [data-bind^='pages.']").forEach((el) => { const v = get(el.dataset.bind); if (v != null) el.textContent = v; });
  $$("[data-md]").forEach((el) => { const v = get(el.dataset.md); if (v != null) el.innerHTML = md(v); });
  // Home hero "Currently" label (content.json site.currently): Open to work, or "Currently at" + the company in bold
  $$('[data-render="currently"]').forEach((el) => {
    const cur = S.currently || {};
    if (cur.show === false) { el.hidden = true; return; }
    const co = cur.mode === "company" && String(cur.company || "").trim();
    el.innerHTML = co ? `<span>Currently at</span><b>${esc(co)}</b>` : `<span>Currently</span><b><i aria-hidden="true"></i>${esc(cur.openLabel || "Open to work")}</b>`;
  });

  // Text marked data-fill lights up word by word as it scrolls up the screen (home About)
  $$("[data-fill]").forEach((el) => {
    if (reduce) return;
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
    while (walk.nextNode()) nodes.push(walk.currentNode);
    nodes.forEach((n) => {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((w) => {
        if (!w) return;
        if (/^\s+$/.test(w)) { frag.append(w); return; }
        const sp = document.createElement("span"); sp.className = "fw"; sp.textContent = w; frag.append(sp);
      });
      n.replaceWith(frag);
    });
    const words = $$(".fw", el);
    const update = () => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < n));
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
  });
  $$("[data-band]").forEach((el) => {
    const items = get(el.dataset.band);
    if (!Array.isArray(items) || !items.length) return;
    const sep = esc(el.dataset.sep || "✳"), hide = el.hasAttribute("data-dup-hidden") ? ' aria-hidden="true"' : "";
    const one = (h) => items.map((t) => `<span${h}>${esc(t)}</span><i${h}>${sep}</i>`).join("");
    el.innerHTML = one("") + one(hide);
  });
  const ctaH = $$('[data-render="cta"]');
  if (C.cta) ctaH.forEach((h) => { h.innerHTML = `${esc(C.cta.line1)}<br /><span>${esc(C.cta.line2)}</span>`; });

  // About page — story, principles, toolkit
  const A = P.about || {};
  const storyBox = $('[data-render="story"]');
  if (storyBox && A.story) storyBox.innerHTML = A.story.map((t, i) => `<p class="about__text"${i ? ' style="margin-top:24px"' : ""}>${md(t)}</p>`).join("");
  const factBox = $('[data-render="principles"]');
  // each principle card opens with a tiny looping demo (people first, clarity, consistency, purposeful motion; repeats if more)
  const CARE_DEMOS = [
    `<div class="care__stage d-people" aria-hidden="true"><div class="ring"></div><div class="user"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg></div><div class="cur"><svg viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z"/></svg></div></div>`,
    `<div class="care__stage d-clarity" aria-hidden="true"><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>`,
    `<div class="care__stage d-cons" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>`,
    `<div class="care__stage d-motion" aria-hidden="true"><div class="m"><svg class="curve" viewBox="0 0 270 170"><path d="M 20 140 C 110 140, 120 30, 250 30"/></svg><span class="ball"></span></div></div>`,
  ];
  if (factBox && A.principles) factBox.innerHTML = A.principles.map((x, i) => `<article class="care__card reveal">${CARE_DEMOS[i % CARE_DEMOS.length]}<div class="care__body"><span class="care__n">${pad(i + 1)}</span><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div></article>`).join("");
  const chipBox = $('[data-render="toolkit"]');
  // Toolkit = a Figma-style dotted canvas; every skill is a frame with a line illustration that can be dragged around
  const TK_ART = {
    prototyp: '<rect x="3" y="4" width="7" height="12" rx="1.5"/><rect x="14" y="8" width="7" height="12" rx="1.5"/><path d="M10 9h2.5a1.5 1.5 0 0 1 1.5 1.5V12"/><path d="M12.5 10.5 14 12l1.5-1.5"/><circle cx="6.5" cy="9" r="1.2"/>',
    system: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><circle cx="17.25" cy="6.75" r="3.75"/><path d="M6.75 13.5 10.5 21H3z"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="3.75"/>',
    research: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20.5 20.5-5.2-5.2"/><circle cx="10.5" cy="9" r="2"/><path d="M7 14a3.8 3.8 0 0 1 7 0"/>',
    wirefram: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18M8 8v13"/><path d="M11 12h7M11 15h5M11 18h6"/>',
    _: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  };
  const tkArt = (t) => `<svg viewBox="0 0 24 24" aria-hidden="true">${TK_ART[Object.keys(TK_ART).find((k) => k !== "_" && t.toLowerCase().includes(k)) || "_"]}</svg>`;
  const TK_SPOTS = [[5, 24], [29, 52], [53, 14], [72, 46], [12, 62], [44, 70]]; // % left/top, repeats if more skills
  if (chipBox && A.toolkit) {
    chipBox.innerHTML = `<div class="tcanvas__bar" aria-hidden="true"><i class="on">▲</i><i>#</i><i>□</i><i>T</i></div>` +
      A.toolkit.map((t, i) => { const [x, y] = TK_SPOTS[i % TK_SPOTS.length];
        return `<div class="tframe${i === 1 ? " is-sel" : ""}" role="listitem" style="--x:${x}%;--y:${y + Math.floor(i / TK_SPOTS.length) * 6}%"><div class="tframe__lbl">${esc(t)}</div><div class="tframe__box">${tkArt(t)}<b>${esc(t)}</b><span class="h h1"></span><span class="h h2"></span><span class="h h3"></span><span class="h h4"></span><span class="tframe__size">220 × 140</span></div></div>`; }).join("") +
      `<span class="tcanvas__hint" aria-hidden="true">Drag the frames</span>`;
    const frames = $$(".tframe", chipBox);
    frames.forEach((f) => {
      let sx, sy, ox, oy, drag = false;
      f.addEventListener("pointerdown", (e) => {
        if (matchMedia("(max-width: 700px)").matches) return; // phones: frames sit in a simple grid
        drag = true; f.setPointerCapture(e.pointerId);
        frames.forEach((o) => o.classList.toggle("is-sel", o === f));
        chipBox.insertBefore(f, $(".tcanvas__hint", chipBox)); // bring to front
        sx = e.clientX; sy = e.clientY; ox = f.offsetLeft; oy = f.offsetTop;
      });
      f.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const nx = Math.max(0, Math.min(chipBox.clientWidth - f.offsetWidth, ox + e.clientX - sx));
        const ny = Math.max(0, Math.min(chipBox.clientHeight - f.offsetHeight, oy + e.clientY - sy));
        f.style.setProperty("--x", nx + "px"); f.style.setProperty("--y", ny + "px");
      });
      const stop = () => (drag = false);
      f.addEventListener("pointerup", stop); f.addEventListener("pointercancel", stop);
    });
  }

  // About page — intro tailored to who is reading
  const introTabsBox = $('[data-render="intros"]'), introText = $("#introText");
  if (introTabsBox && introText) {
    const intros = (A.intros || []).filter((x) => x && x.label);
    if (intros.length) {
      introTabsBox.innerHTML = intros.map((x, i) => `<button role="tab" aria-selected="${!i}" aria-controls="introText" data-i="${i}">${esc(x.label)}</button>`).join("");
      introText.innerHTML = md(intros[0].text);
    }
    const tabs = $$("[role=tab]", introTabsBox);
    const pick = (b) => {
      tabs.forEach((t) => { t.setAttribute("aria-selected", String(t === b)); t.tabIndex = t === b ? 0 : -1; });
      introText.classList.add("is-swapping");
      setTimeout(() => { introText.innerHTML = md(intros[+b.dataset.i].text); introText.classList.remove("is-swapping"); }, reduce ? 0 : 220);
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
  }

  // Contact page — FAQ
  const faqBox = $('[data-render="faq"]');
  const faq = (P.contact || {}).faq;
  if (faqBox && Array.isArray(faq)) faqBox.innerHTML = faq.map((x, i) => `<details${i ? "" : " open"}><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join("");

  // "Open to opportunities" card — shown near the footer; switch it off in /gk
  const W2 = S.openToWork || { show: true };
  const otw = $("#otw"), footer = $(".footer");
  if (otw && C.site) {
    otw.innerHTML = `<button class="otw__close" id="otwClose" aria-label="Dismiss">✕</button>
    <span class="otw__status"><i></i>Open to opportunities</span>
    <h3>${esc(W2.title)}</h3>
    <ul>${[["Roles", W2.roles], ["Freelance", W2.freelance], ["Based in", W2.basedIn]].filter(([, v]) => v).map(([k, v]) => `<li><b>${k}:</b> ${esc(v)}</li>`).join("")}</ul>
    <div class="otw__btns">${W2.buttonUrl ? `<a class="btn" href="${escUrl(W2.buttonUrl)}" target="_blank" rel="noopener">${esc(W2.buttonLabel || "Connect")} ↗</a>` : ""}<a class="btn btn--ghost" href="/contact.html">Contact</a></div>`;
  }
  if (otw && W2.show !== false && footer) {
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


  // "sample" items are placeholders (the /gk "Sample" switch): they are never shown to visitors, counted,
  // featured or put in the menu. Turn the switch off once the real work is added.
  function realOnly(list) { return (list || []).filter((x) => !x.sample); }
  function hasRealVideo() { const v = C.video || {}; return v.show !== false && ["thumbnails", "reels", "podcasts"].some((k) => realOnly(v[k]).length > 0); }
  const realProjects = realOnly(C.projects);
  // Services: the main crafts lead; ones marked "also" (video editing) get a smaller secondary spot
  const mainSvcs = C.services.filter((s) => !s.also), alsoSvcs = C.services.filter((s) => s.also);
  const live = realProjects.filter((p) => p.status !== "ongoing");
  const ongoing = realProjects.filter((p) => p.status === "ongoing");

  // Home — sticker counts follow the content
  // The blue sticker counts case studies on the way; when none are in progress it counts the finished
  // case studies instead (never shows "00"), and hides itself if there are neither.
  const readyCases = realProjects.filter((p) => p.caseStudy && p.caseStudy.show !== false).length;
  const counts = { services: mainSvcs.length, live: realProjects.filter((p) => p.featured).length, ongoing: ongoing.length || readyCases };
  $$("[data-count-of]").forEach((el) => { const n = counts[el.dataset.countOf] ?? 0; el.dataset.count = n; el.textContent = pad(n); });
  const ongoingLabel = $('[data-label-of="ongoing"]');
  if (ongoingLabel) {
    const n = counts.ongoing, many = n !== 1;
    ongoingLabel.innerHTML = (many ? "Case studies" : "Case study") + (ongoing.length ? "<br />on the way" : "<br />to read");
    if (!n) ongoingLabel.closest(".sticker").hidden = true;
  }

  // Projects with a case study open case.html?p=<id>. Only the picture you actually click flies from its card
  // into the case study header (and back again when you return). Cards just carry data-shot; the
  // view-transition name is added at the moment of that navigation, so e.g. Home → All projects simply fades.
  const hasCase = (p) => !!(p && p.caseStudy && p.caseStudy.show !== false);
  // hover pill label per project (content.json "cursor"): locked / open / view; default: OPEN with a case study, else VIEW
  const curAttr = (p) => { const k = ["locked", "open", "view"].includes(p.cursor) ? p.cursor : hasCase(p) ? "open" : "view"; return ` data-cur="${k}"`; };
  // a project can have its own hand-built case study page (caseStudy.page, e.g. respay.html); otherwise the shared template
  const caseUrl = (p) => { const pg = p.caseStudy && p.caseStudy.page; return escUrl(pg ? (pg.startsWith("sample-") ? "/" + pg : "/projects/" + pg) : `/projects/case.html?p=${encodeURIComponent(p.id)}`); };
  // Brand colours (content.json → project "brand"): the case study CONTENT wears its own project's colours
  // (accent numbers, text, buttons and background) — the site's own parts (top banner, menu, "Start a project",
  // footer) keep the site colour. The "Next project" card wears the NEXT project's colours.
  const caseList = C.projects.filter(hasCase);
  const nextOf = (p) => (p && caseList.length > 1 ? caseList[(caseList.indexOf(p) + 1) % caseList.length] : null);
  // cards that open a case study carry data-shot, so their picture flies into the case study header
  const vtShot = (p) => (hasCase(p) ? ` data-shot="${esc(p.id)}"` : "");
  const hexRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).join(" ") : ""; };
  const nextCard = (next) => {
    const b = next.brand || {};
    const st = b.card ? ` style="--nx-bg:${esc(b.card)};--nx-ink:${esc(b.cardInk || "#fff")};--nx-btn:${esc(b.cardBtn || "#fff")};--nx-btn-ink:${esc(b.cardBtnInk || b.card)}"` : "";
    return `<section class="cs-next"><a class="cs-next__card${b.card ? " is-brand" : ""}" href="${caseUrl(next)}"${st} aria-label="Next project: ${esc(next.name)} case study"><div class="cs-next__txt"><small>Next project</small><b>${esc(next.name)}</b>${next.type ? `<span>${esc(next.type)}</span>` : ""}<em class="cs-next__go">Open case study →</em></div>${coverImg({ ...next, alt: "" }, vtShot(next) + ' loading="lazy"')}</a></section>`;
  };
  const curProject = page === "case.html" ? C.projects.find((p) => p.id === new URLSearchParams(location.search).get("p")) : allProjects.find((p) => p.caseStudy && p.caseStudy.page === page);
  const curBrand = curProject && hasCase(curProject) && curProject.brand;
  if (curBrand && curBrand.accent) {
    const b = curBrand, rgb = hexRgb(b.accent), st = document.getElementById("project-brand") || document.head.appendChild(Object.assign(document.createElement("style"), { id: "project-brand" }));
    const scope = page === "case.html" ? ["#case"] : ["#rp", "#vs"];   // the case study content only
    st.textContent = `${scope.join(",")}{--acc:${b.accent};${rgb ? `--acc-rgb:${rgb};` : ""}--acc-deep:${b.accent};--acc-btn:${b.accent};--on-btn:${b.onAccent || "#fff"};--on-acc:${b.onAccent || "#fff"};--acc-text:${b.inkDark || b.accent};${b.bgDark ? `--bg:${b.bgDark};` : ""}background:var(--bg)}`
      + `${scope.map((s) => `:root[data-theme="light"] ${s}`).join(",")}{--acc-text:${b.inkLight || b.accent};${b.bgLight ? `--bg:${b.bgLight};` : ""}}`;
  }
  // hand-built case study pages (respay.html, vstar.html) leave a <div data-next-project> for the shared card
  $$("[data-next-project]").forEach((el) => { const n = nextOf(curProject); if (n) el.outerHTML = nextCard(n); else el.remove(); });
  // Own-product pages (nineflow.html, finroot.html): every section carries data-sec and every picture data-item.
  // /gk → the project's Case study → Sections / Screens has a Show switch for each; switched-off ones are removed
  // before the page is seen, a section left with no pictures goes too, and the section numbers close up.
  if (curProject && curProject.caseStudy && $("[data-sec]")) {
    const cs = curProject.caseStudy, offOf = (list) => new Set((list || []).filter((x) => x && x.show === false).map((x) => x.id));
    const secOff = offOf(cs.sections), itemOff = offOf(cs.shots);
    $$("[data-item]").forEach((el) => { if (itemOff.has(el.dataset.item)) el.remove(); });
    $$("[data-sec]").forEach((el) => { const box = $("[data-items]", el); if (secOff.has(el.dataset.sec) || (box && !$("[data-item]", el))) el.remove(); });
    $$("[data-sec] .rx-coin b").forEach((b, i) => (b.textContent = String(i + 1).padStart(2, "0")));
  }
  window.__caseReady = true; dispatchEvent(new Event("case-ready"));
  const shotName = (id) => "shot-" + String(id).replace(/[^\w-]/g, "");
  // the project a URL opens: case.html?p=<id>, or a project's own page (caseStudy.page, e.g. nexura.html)
  const caseIdOf = (url) => { try { const u = new URL(url, location.href); if (u.pathname.endsWith("/case.html")) return u.searchParams.get("p"); const f = u.pathname.split("/").pop(), own = f && C.projects.find((p) => p.caseStudy && p.caseStudy.page === f); return own ? own.id : null; } catch (e) { return null; } };
  // A project's picture can be on a page twice (the Projects menu in the nav + a card below), so fly the one you
  // clicked; otherwise (arriving back) the first one that isn't hidden, never the closed menu's copy.
  let clickedShot = null;
  addEventListener("click", (e) => { const a = e.target.closest && e.target.closest("a[href]"); clickedShot = a ? a.querySelector("img[data-shot]") : null; }, true);
  const showing = (img) => img.getBoundingClientRect().width > 0 && getComputedStyle(img).visibility !== "hidden";
  const nameShot = (id) => {
    if (!id) return null;
    const all = $$(`img[data-shot="${CSS.escape(id)}"]`);
    // already on that project's page (its header carries the name): a second copy would cancel the transition
    if ($$('[style*="view-transition-name"]').some((el) => !all.includes(el) && el.style.viewTransitionName === shotName(id))) return null;
    const img = (clickedShot && all.includes(clickedShot) ? clickedShot : null) || all.find(showing) || null;
    if (img) { img.style.viewTransitionName = shotName(id); img.style.viewTransitionClass = "shot"; }
    return img;
  };
  // Case study header picture (Milton's case.html and the own pages: respay / nexura / vstar [data-slide]): as the page
  // scrolls, the picture slides upward inside its wide frame (image top → bottom), finishing by the time the frame
  // has mostly scrolled away. The picture keeps its own height and is moved with transform (.is-slide in style.css),
  // at most once per frame, so the GPU only shifts it; changing object-position repainted the big cover every frame.
  // Skipped for reduced motion.
  function coverSlide(hero) {
    const img = hero && $("img", hero);
    if (!img || reduce) return;
    hero.classList.add("is-slide");
    let queued = false;
    const slide = () => {
      queued = false;
      const r = hero.getBoundingClientRect(), start = r.top + scrollY; // frame's place on the page
      const p = Math.min(1, Math.max(0, scrollY / Math.max(1, start + r.height * 0.6)));
      const room = Math.max(0, img.getBoundingClientRect().height - r.height); // the part of the picture hidden below the frame (exact, not rounded)
      img.style.transform = `translate3d(0, ${(-p * room).toFixed(1)}px, 0)`;
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(slide); } };
    addEventListener("scroll", queue, { passive: true }); addEventListener("resize", queue); img.addEventListener("load", queue);
    slide();
  }
  $$("[data-slide]").forEach(coverSlide);
  // Leaving a Home / Projects page for a case study → name that project's picture only
  addEventListener("pageswap", (e) => { if (e.viewTransition && e.activation) nameShot(caseIdOf(e.activation.entry.url)); });
  // Arriving on a case study (opening a project) → the old transition: the page fades + lifts while the picture
  // flies in (css "project" type); every other page change keeps the wipe
  addEventListener("pagereveal", (e) => { if (e.viewTransition && e.viewTransition.types && hasCase(curProject)) e.viewTransition.types.add("project"); });
  // Arriving back from a case study → name the matching picture so it flies back into its card
  addEventListener("pagereveal", (e) => {
    if (!e.viewTransition || !window.navigation || !navigation.activation || !navigation.activation.from) return;
    const img = nameShot(caseIdOf(navigation.activation.from.url));
    if (!img) return;
    // "All work" opens Projects at the top, where every card is still below the screen, so the picture would fly
    // off the bottom edge. Open the page already scrolled to that card (centred) so you see it land.
    // The browser's Back button restores your own scroll position, so leave that alone.
    if (navigation.activation.navigationType !== "traverse") {
      const r = img.getBoundingClientRect();
      if (r.top < 70 || r.bottom > innerHeight) {
        const top = Math.max(0, scrollY + r.top - (innerHeight - r.height) / 2);
        scrollTo({ top, behavior: "instant" });
        if (window.lenis) { window.lenis.resize(); window.lenis.scrollTo(top, { immediate: true, force: true }); }
      }
    }
    // e.g. "All work" on a case study: the picture flies back into its card with the same fade + lift as opening it
    if (e.viewTransition.types) e.viewTransition.types.add("project");
    e.viewTransition.finished.finally(() => { img.style.viewTransitionName = ""; });
  });

  // Home — featured project grid (a "Let's work together" card fills an odd slot)
  const grid = $("#featuredProjects");
  if (grid) {
    const featured = realProjects.filter((p) => p.featured);
    grid.innerHTML = featured.map((p) => {
      const soon = p.status === "ongoing";
      const img = coverImg(p, vtShot(p) + ' loading="lazy"', `<div class="pgrid__soon">${esc(p.name)}</div>`); // below the hero: load as it nears
      return `<a href="${hasCase(p) ? caseUrl(p) : "/projects.html#" + esc(p.id)}"${soon ? ' data-status="soon"' : ""}${curAttr(p)}><div class="pgrid__img">${img}${soon ? '<span class="pgrid__badge"><i></i>Ongoing</span>' : ""}</div><div class="pgrid__cap"><b>${esc(p.name)} <span>| ${esc(p.type)}</span></b><small>${esc(p.category)}</small></div></a>`;
    }).join(""); // no "your project could be next" tile here — it looked like a project
  }

  // Announcement bar text (content.json "announcement"; show: false hides it)
  const AN = C.announcement;
  if (abar && AN) {
    if (AN.show === false || !AN.text) abar.hidden = true;
    else {
      $(".abar__text", abar).textContent = AN.text;
      const l = $(".abar__link", abar);
      if (AN.link && AN.linkLabel) { l.href = safeUrl(AN.link); l.textContent = AN.linkLabel + " ↗"; } else l.remove();
    }
    onScroll();
  }

  // Nav — Projects mega-menu: featured projects as picture cards + quick links
  const projLink = $$(".nav__links a").find((a) => /projects\.html$/i.test((a.getAttribute("href") || "").split("#")[0]));
  if (projLink && C.projects.length) {
    const root = projLink.getAttribute("href").startsWith("/") ? "/" : ""; // 404.html uses root-absolute links
    // 1st row: up to 7 projects as picture cards (content.json order; upcoming ones get a "Coming soon" badge)
    // 2nd row: any further projects + Video work as text links, and "See all projects"
    const MEGA_MAX = 7;
    const cards = realProjects.slice(0, MEGA_MAX), rest = realProjects.slice(MEGA_MAX);
    const href = (p) => (hasCase(p) ? caseUrl(p) : `${root}projects.html#${encodeURIComponent(p.id)}`);
    const wrap = document.createElement("div");
    wrap.className = "mega-wrap";
    projLink.replaceWith(wrap);
    projLink.insertAdjacentHTML("beforeend", ' <i aria-hidden="true">⌄</i>');
    projLink.setAttribute("aria-haspopup", "true"); projLink.setAttribute("aria-expanded", "false");
    wrap.appendChild(projLink);
    wrap.insertAdjacentHTML("beforeend", `<div class="mega" role="menu" aria-label="Projects">
        <div class="mega__cards" style="--n:${cards.length}">${cards.map((p) => `<a href="${href(p)}" role="menuitem"><span class="mega__pic">${coverImg({ ...p, alt: "" }, vtShot(p) + ' loading="lazy"', `<span class="mega__soon">${esc(p.name)}</span>`, "280px")}${p.status === "ongoing" ? '<em class="mega__badge"><i></i>Coming soon</em>' : ""}</span><b>${esc(p.name)}</b><span class="mega__type">${esc(p.type)}</span></a>`).join("")}</div>
        <div class="mega__list"><small>Explore more</small>${rest.map((p) => `<a href="${href(p)}" role="menuitem">${esc(p.name)}${p.status === "ongoing" ? " · coming soon" : ""} <i aria-hidden="true">›</i></a>`).join("")}${hasRealVideo() ? `<a href="${root}projects.html#video" role="menuitem">Video work <i aria-hidden="true">›</i></a>` : ""}<a class="mega__all" href="${root}projects.html" role="menuitem">See all projects</a></div>
      </div>`);
    let t; // the panel spans the whole nav bar (CSS), so it never needs nudging back on screen
    const setMega = (on) => { clearTimeout(t); wrap.classList.toggle("is-open", on); projLink.setAttribute("aria-expanded", String(on)); };
    if (hover) { wrap.addEventListener("mouseenter", () => setMega(true)); wrap.addEventListener("mouseleave", () => { t = setTimeout(() => setMega(false), 160); }); }
    wrap.addEventListener("focusin", () => setMega(true));
    wrap.addEventListener("focusout", (e) => { if (!wrap.contains(e.relatedTarget)) setMega(false); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") setMega(false); });
  }

  // Case study page — case.html?p=<project id>, filled from the project's "caseStudy"
  const caseBox = $("#case");
  if (caseBox) {
    const id = new URLSearchParams(location.search).get("p");
    const withCase = C.projects.filter(hasCase);
    const p = withCase.find((x) => x.id === id);
    if (!p) {
      caseBox.innerHTML = `<section class="cs-empty"><a class="cs-back" href="/projects.html">← All work</a><h1>This case study isn't ready yet</h1><p style="color:var(--grey);margin-bottom:26px">It may still be in progress. Have a look at the other projects meanwhile.</p><a class="btn" href="/projects.html">All projects ↗</a></section>`;
      document.title = "Case study — Kartikeyan";
    } else if (p.caseStudy.page && /^https?:$/.test(location.protocol)) {
      location.replace(p.caseStudy.page); // old case.html?p=<id> links → the project's own page
    } else {
      const cs = p.caseStudy, shot = `view-transition-name:shot-${String(p.id).replace(/[^\w-]/g, "")};view-transition-class:shot`;
      document.title = `${p.name} — Case study — Kartikeyan`;
      const zoom = [["1", "0%", "0%"], ["1.35", "0%", "-12%"], ["1.5", "-10%", "14%"], ["1.2", "8%", "6%"], ["1.4", "10%", "-8%"]];
      // "slides": the case study told as one scrolling presentation (full-size slides stacked, like Behance).
      // When a project has slides, they replace the separate challenge / goals / process / decisions / screens sections.
      const deck = (cs.slides || []).filter(Boolean), noDeck = (list) => (deck.length ? [] : list);
      const feats = noDeck(cs.features || []), stats = (cs.stats || []).filter((s) => s.value), gal = noDeck((cs.gallery || []).filter(Boolean));
      const goals = noDeck((cs.goals || []).filter(Boolean)), steps = noDeck((cs.process || []).filter((s) => s && (s.title || s.text)));
      const screens = noDeck((cs.screens || []).filter((s) => s && s.image)), dels = noDeck((cs.deliverables || []).filter(Boolean));
      const next = withCase.length > 1 ? withCase[(withCase.indexOf(p) + 1) % withCase.length] : null;
      // Features with their own pictures read as alternating text + picture rows; without pictures they keep
      // the sticky picture that zooms into the cover
      const featRows = feats.length && feats.every((f) => f.image);
      // Facts strip under the cover: only the ones that are filled in
      const facts = [["Client", cs.client], ["Role", cs.role], ["Type", p.type], ["Year", cs.year], ["Tools", (cs.tools || []).filter(Boolean).join(", ")]].filter(([, v]) => v);
      // Live website (e.g. the client's site): a button under the title + a "Website" fact; only http(s) links
      const site = /^https?:\/\//i.test(cs.website || "") ? cs.website : "";
      const siteName = site ? site.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "") : "";
      let sn = 0; const secNo = () => pad(++sn); // numbered section labels: (01) Overview, (02) Challenge …
      caseBox.innerHTML = `
        <section class="cs-head">
          <a class="cs-back" href="/projects.html">← All work</a>
          <h1 class="cs-title">${esc(cs.title || p.name)}</h1>
          ${cs.outcome ? `<p class="cs-outcome"><b>Outcome</b> ${esc(cs.outcome)}</p>` : ""}
          <div class="cs-meta">${[cs.year, ...(cs.tags || p.tags || [])].filter(Boolean).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
          ${site ? `<a class="btn cs-site" href="${escUrl(site)}" target="_blank" rel="noopener">${esc(cs.websiteLabel || "Visit website")} ↗</a>` : ""}
        </section>
        <div class="cs-shot" data-pic>${coverImg(p, ` style="${shot}" fetchpriority="high" decoding="sync"`, "remove", "")}</div>
        ${facts.length || site ? `<dl class="cs-facts reveal">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${md(v)}</dd></div>`).join("")}${site ? `<div><dt>${/behance\.net/i.test(site) ? "Behance" : "Website"}</dt><dd><a class="cs-site-link" href="${escUrl(site)}" target="_blank" rel="noopener">${esc(/behance\.net/i.test(site) ? "Full case study" : siteName)} ↗</a></dd></div>` : ""}</dl>` : ""}
        ${cs.background ? `<section class="cs-sec reveal"><small>(${secNo()}) Overview</small><p>${md(cs.background)}</p></section>` : ""}
        ${cs.challenge && !deck.length ? `<section class="cs-sec reveal"><small>(${secNo()}) The challenge</small><p>${md(cs.challenge)}</p></section>` : ""}
        ${goals.length ? `<section class="cs-sec reveal"><small>(${secNo()}) Goals</small><ol class="cs-goals">${goals.map((g) => `<li>${md(g)}</li>`).join("")}</ol></section>` : ""}
        ${stats.length ? `<section class="cs-stats reveal">${stats.map((s) => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("")}</section>` : ""}
        ${deck.length ? `<section class="cs-deck"><small class="cs-label">(${secNo()}) ${esc(cs.slidesTitle || "The case study")}</small>${deck.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.name)} case study, slide ${i + 1} of ${deck.length}"${i > 1 ? ' loading="lazy"' : ""} />`).join("")}</section>` : ""}
        ${steps.length ? `<section class="cs-process"><small class="cs-label">(${secNo()}) Process</small>${steps.map((s, i) => `<article class="cs-step reveal"><div class="cs-step__txt"><em>Step ${pad(i + 1)}</em><h3>${esc(s.title || "")}</h3><p>${md(s.text || "")}</p></div>${s.image ? `<figure class="cs-step__pic"><img src="${esc(s.image)}" alt="${esc(s.title || "")}" loading="lazy" /></figure>` : ""}</article>`).join("")}</section>` : ""}
        ${featRows ? `<section class="cs-rows"><small class="cs-label">(${secNo()}) Key design decisions</small>${feats.map((f, i) => `<article class="cs-row reveal"><div class="cs-row__txt"><small><span>${esc(f.label)}</span><em>(${pad(i + 1)})</em></small><h3>${esc(f.title)}</h3><p>${md(f.text || "")}</p></div><figure class="cs-row__pic"><img src="${esc(f.image)}" alt="${esc(f.title)}" loading="lazy" /></figure></article>`).join("")}</section>`
          : feats.length ? `<section class="cs-feats"><div class="cs-feats__vis">${feats[0].image ? `<img id="csFeatImg" src="${esc(feats[0].image)}" alt="" />` : coverImg({ ...p, alt: "" }, ' id="csFeatImg"')}</div><div>${feats.map((f, i) => `<article class="cs-feat${i ? "" : " is-on"}" data-i="${i}"><small><span>${esc(f.label)}</span><em>(${pad(i + 1)})</em></small><h3>${esc(f.title)}</h3><p>${md(f.text || "")}</p></article>`).join("")}</div></section>` : ""}
        ${screens.length ? `<section class="cs-screens"><small class="cs-label">(${secNo()}) Full screens</small><p class="cs-hint">Scroll inside each frame to see the whole page</p><div class="cs-screens__row">${screens.map((s) => `<figure class="cs-screen reveal"><figcaption><i></i><i></i><i></i><span>${esc(s.label || "")}</span></figcaption><div class="cs-screen__in" data-lenis-prevent tabindex="0" aria-label="${esc(s.label || "Screen")}, scrollable"><img src="${esc(s.image)}" alt="${esc(s.label || "")}" loading="lazy" /></div></figure>`).join("")}</div></section>` : ""}
        <section class="cs-gallery" id="csGallery"${gal.length ? "" : " hidden"}>${cs.galleryTitle ? `<small class="cs-label">(${secNo()}) ${esc(cs.galleryTitle)}</small>` : ""}${gal.map((g) => `<img src="${esc(g)}" alt="" loading="lazy" />`).join("")}</section>
        ${dels.length ? `<section class="cs-sec reveal"><small>(${secNo()}) Deliverables</small><ul class="cs-dels">${dels.map((d) => `<li>${md(d)}</li>`).join("")}</ul></section>` : ""}
        ${next ? nextCard(next) : ""}`;
      // Header picture: as the page scrolls, the picture slides upward inside its wide frame (image top → bottom),
      // finishing by the time the frame has mostly scrolled away. Skipped for reduced motion.
      coverSlide($(".cs-shot", caseBox));

      // No gallery set in /gk → pick up assets/images/projects/<id>/gallery/1.webp, 2.webp … (stops at the first missing one).
      // Not lazy: the section stays hidden (display: none) until a picture loads, and lazy pictures never load while hidden.
      const galBox = $("#csGallery");
      if (galBox && !gal.length) {
        const add = (n) => {
          const probe = document.createElement("div");
          probe.innerHTML = autoImg(`${IMG}/projects/${p.id}/gallery/${n}`, "", "", "remove");
          const im = probe.firstElementChild;
          im.addEventListener("load", () => { galBox.hidden = false; if (n < 40) add(n + 1); }, { once: true });
          galBox.appendChild(im);
        };
        add(1);
      }

      // Numbered features: the sticky picture changes (or zooms into the base picture) for the feature in view
      const img = $("#csFeatImg");
      if (img) {
        const show = (i) => {
          $$(".cs-feat", caseBox).forEach((f, j) => f.classList.toggle("is-on", j === i));
          const f = feats[i];
          if (f.image) { img.src = f.image; img.style.transform = ""; }
          else { const base = p.image || ($(".cs-shot img", caseBox) || img).currentSrc; if (base && img.currentSrc !== base) img.src = base; const [z, x, y] = zoom[i % zoom.length]; img.style.transform = reduce ? "" : `scale(${z}) translate(${x}, ${y})`; }
        };
        const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) show(+e.target.dataset.i); }), { rootMargin: "-45% 0px -45% 0px" });
        $$(".cs-feat", caseBox).forEach((f) => io.observe(f));
      }
    }
  }

  // Video work lists (content.json "video")
  // Placeholders ("sample", the gk switch) never reach visitors: a format with no real work yet simply doesn't show
  const V = C.video || {};
  const VT = realOnly(V.thumbnails), VR = realOnly(V.reels), VP = realOnly(V.podcasts);
  const vOn = V.show !== false && (VT.length || VR.length || VP.length) > 0;

  // Projects page — filters and cards (+ a "Video ↓" jump link when there is video work)
  const filterBox = $("#projectFilters");
  if (filterBox) {
    filterBox.innerHTML = [{ id: "all", label: "All" }, ...C.filters].map((f, i) => `<button class="${i ? "" : "is-on"}" data-f="${esc(f.id)}" aria-pressed="${!i}">${esc(f.label)}</button>`).join("")
      + (vOn ? '<a href="#video">Video ↓</a>' : "");
  }
  // Drawn cover for a sample project without a picture, picked from its type: poster, brochure, deck or web page
  const sampleArt = (p) => {
    const t = `${p.type || ""} ${p.name || ""}`.toLowerCase();
    const kind = /poster/.test(t) ? "poster" : /brochure/.test(t) ? "brochure" : /deck|presentation/.test(t) ? "deck" : "web";
    const art = {
      poster: '<rect x="150" y="22" width="130" height="186" rx="4" fill="#fff"/><rect x="162" y="34" width="106" height="112" rx="3" fill="var(--acc)"/><circle cx="215" cy="92" r="30" fill="#fff" opacity=".9"/><rect x="162" y="156" width="80" height="12" rx="2" fill="#111"/><rect x="162" y="174" width="106" height="6" rx="2" fill="#bbb"/><rect x="162" y="186" width="70" height="6" rx="2" fill="#bbb"/>',
      brochure: '<g transform="translate(95 40)"><path d="M0 8 70 0v150L0 158Z" fill="#fff"/><path d="M70 0l70 8v150l-70-8Z" fill="#eaeaea"/><path d="M140 8l70-8v150l-70 8Z" fill="#fff"/><rect x="10" y="22" width="50" height="40" rx="3" fill="var(--acc)"/><rect x="10" y="74" width="46" height="6" rx="2" fill="#111"/><rect x="10" y="88" width="50" height="5" rx="2" fill="#bbb"/><rect x="80" y="26" width="50" height="5" rx="2" fill="#999"/><rect x="80" y="38" width="44" height="5" rx="2" fill="#999"/><circle cx="105" cy="92" r="20" fill="var(--acc)" opacity=".35"/><rect x="150" y="30" width="50" height="70" rx="3" fill="#111"/><rect x="150" y="110" width="44" height="6" rx="2" fill="#bbb"/></g>',
      deck: '<rect x="112" y="60" width="200" height="124" rx="6" fill="#fff" opacity=".35" transform="rotate(-6 212 122)"/><rect x="100" y="48" width="200" height="124" rx="6" fill="#fff"/><rect x="116" y="66" width="90" height="12" rx="2" fill="#111"/><rect x="116" y="86" width="70" height="6" rx="2" fill="#bbb"/><rect x="226" y="66" width="58" height="88" rx="4" fill="var(--acc)"/><rect x="116" y="118" width="18" height="36" rx="2" fill="var(--acc)" opacity=".5"/><rect x="140" y="104" width="18" height="50" rx="2" fill="var(--acc)" opacity=".75"/><rect x="164" y="92" width="18" height="62" rx="2" fill="var(--acc)"/>',
      web: '<rect x="70" y="30" width="260" height="172" rx="8" fill="#fff"/><rect x="70" y="30" width="260" height="22" rx="8" fill="#e6e6e6"/><circle cx="84" cy="41" r="4" fill="#ff5f57"/><circle cx="97" cy="41" r="4" fill="#febc2e"/><circle cx="110" cy="41" r="4" fill="#28c840"/><rect x="88" y="68" width="110" height="14" rx="2" fill="#111"/><rect x="88" y="90" width="90" height="7" rx="2" fill="#bbb"/><rect x="88" y="106" width="56" height="16" rx="8" fill="var(--acc)"/><rect x="214" y="64" width="98" height="70" rx="6" fill="var(--acc)" opacity=".8"/><rect x="88" y="146" width="68" height="40" rx="4" fill="#eee"/><rect x="166" y="146" width="68" height="40" rx="4" fill="#eee"/><rect x="244" y="146" width="68" height="40" rx="4" fill="#eee"/>',
    }[kind];
    return `<div class="work__sample"><svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Placeholder picture: ${esc(p.type || "sample project")}">${art}</svg></div>`;
  };
  const list = $("#projectList");
  if (list) {
    list.innerHTML = realProjects.map((p) => {
      const soon = p.status === "ongoing";
      const img = coverImg(p, vtShot(p), p.sample ? sampleArt(p) : '<div class="work__soon">Case study<br />coming soon</div>');
      return `<a class="work reveal" id="${esc(p.id)}" data-cat="${esc((p.filters || []).join(" "))}"${soon ? ' data-status="soon"' : ""}${curAttr(p)} href="${hasCase(p) ? caseUrl(p) : esc(p.link || "/contact.html")}">
          <div class="work__tags">${(p.tags || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
          <div class="work__frame"><div class="work__img">${img}</div><span class="work__name">${esc(p.name)} <i aria-hidden="true">↗</i></span></div>
          ${p.description ? `<p class="work__desc">${esc(p.description)}</p>` : ""}
        </a>`;
    }).join(""); // the "your project could be next" invite is the marquee under the grid (.pmq in projects.html), not a card
  }

  // ------------------------------------------------------------------
  // Video work — Projects page (thumbnail grid, reels coverflow, podcast episode cards)
  // and Services page (one card per format). An item with no image / video / YouTube link
  // yet draws a placeholder picture; items marked "sample" also get a "Sample" badge.
  // ------------------------------------------------------------------
  const person = (fill, stroke) => `<svg viewBox="0 0 200 220" aria-hidden="true"><path d="M100 18c26 0 44 20 44 46s-18 50-44 50-44-24-44-50 18-46 44-46Z" fill="${fill}" stroke="${stroke}" stroke-width="3"/><path d="M20 220c4-52 38-86 80-86s76 34 80 86Z" fill="${fill}" stroke="${stroke}" stroke-width="3"/></svg>`;
  const vBadge = (x) => (x.sample ? '<span class="vbadge">Sample</span>' : "");
  const THUMB_LOOK = [["#ff3d3d", "#6b0000", "#fff200", "Your", "thumbnail"], ["#1e9bff", "#08203f", "#ffffff", "Big", "hook"], ["#f7c948", "#ff7a00", "#111111", "Goes", "here"], ["#a259ff", "#240752", "#fff200", "Sample", "design"], ["#00c2b2", "#003b37", "#fff200", "Before", "vs after"], ["#2b2b2b", "#000000", "#3ddc84", "Real one", "soon"]];
  const REEL_LOOK = [["#ff5e62", "#3a0b3b"], ["#1e9bff", "#051a33"], ["#f7c948", "#7a3d00"], ["#3ddc84", "#063a22"], ["#a259ff", "#1c0540"], ["#ff8a00", "#3b1300"]];
  const REEL_WORDS = ["YOUR", "*REEL", "GOES", "*HERE"];
  const POD_CAPS = ["So the <i>biggest</i> lesson was…", "you have to <i>start</i> small", "and that <i>changed</i> everything", "it's all about <i>clarity</i>"];

  const thumbArt = (t, i) => {
    if (t.image) return `<div class="vth"><img src="${esc(t.image)}" alt="${esc(t.title)}" loading="lazy" />${vBadge(t)}</div>`;
    const [g1, g2, a, h1, h2] = THUMB_LOOK[i % THUMB_LOOK.length];
    const drawn = `<div class="vth__t" aria-hidden="true"><b>${h1}</b><b>${h2}</b></div><div class="vth__p">${person("#0b0b0b", a)}</div>`;
    // no picture in /gk → assets/images/video/thumbnails/<n>.webp, else the drawn placeholder
    return `<div class="vth" style="--g1:${g1};--g2:${g2};--a:${a}">${autoImg(`${IMG}/video/thumbnails/${i + 1}`, t.title || "", ' loading="lazy"', drawn)}${vBadge(t)}</div>`;
  };
  const reelArt = (r, i, mini) => {
    const [g1, g2] = REEL_LOOK[i % REEL_LOOK.length];
    const media = r.video ? `<video src="${esc(r.video)}"${r.poster ? ` poster="${esc(r.poster)}"` : ""} muted loop playsinline preload="none"></video>`
      : r.poster ? `<img src="${esc(r.poster)}" alt="${esc(r.title)}" loading="lazy" />`
      : autoImg(`${IMG}/video/reels/${i + 1}`, r.title || "", ' loading="lazy"', `<div class="vreel__v" style="--g1:${g1};--g2:${g2}">${person("#0b0b0b", "rgba(255,255,255,.35)")}</div><div class="vreel__bar"><i></i></div><div class="vreel__cap" aria-hidden="true"><span>${REEL_WORDS[0]}</span></div>`);
    const meta = mini ? "" : `<div class="vreel__meta">${r.handle ? `<b>${esc(r.handle)}</b>` : ""}${esc(r.title)}${r.did ? `<br /><span style="opacity:.8">${esc(r.did)}</span>` : ""}${r.link ? `<br /><a class="vreel__go" href="${escUrl(r.link)}" target="_blank" rel="noopener">Watch ↗</a>` : ""}</div>`;
    return `<div class="vreel" data-reel="${i}">${media}${vBadge(r)}${r.video && !mini ? '<button class="vreel__snd" type="button" aria-label="Turn sound on">🔇</button>' : ""}${meta}</div>`;
  };
  const ytId = (u) => { const m = String(u || "").match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/|live\/)([\w-]{11})/); return m ? m[1] : ""; };
  const podArt = (p, mini, i = 0) => {
    const id = ytId(p.youtube), poster = p.poster || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "");
    const mock = `<div class="vpod__scene vpod__wide is-on"><span>${person("#15151a", "rgba(255,255,255,.25)")}</span><span>${person("#15151a", "rgba(255,255,255,.25)")}</span></div><div class="vpod__scene vpod__a"><span>${person("#1a120c", "rgba(255,190,120,.6)")}</span></div><div class="vpod__scene vpod__b"><span>${person("#0c1520", "rgba(120,190,255,.6)")}</span></div><div class="vpod__lower"><b>Guest name</b><span>Sample episode</span></div><div class="vpod__cap"><span>${POD_CAPS[0]}</span></div>`;
    return `<div class="vpod"${id && !mini ? ` data-yt="${id}"` : ""}>${poster ? `<img src="${esc(poster)}" alt="${esc(p.title)}" loading="lazy" />` : autoImg(`${IMG}/video/podcasts/${i + 1}`, p.title || "", ' loading="lazy"', mock)}${vBadge(p)}${id && !mini ? `<button class="vpod__play" type="button" aria-label="Play ${esc(p.title)}"><span>▶</span></button>` : ""}</div>`;
  };

  // Same frame as the project cards: tag pills on the top edge, rounded frame, name in the notch (↗)
  const framed = (tags, inner, name, { el = "div", attrs = "", href = "" } = {}) => {
    const nm = `<span class="work__label">${esc(name)}</span> <i aria-hidden="true">↗</i>`;
    return `<${el} class="work work--v" ${attrs}><div class="work__tags">${tags.filter(Boolean).map((t) => `<span>${esc(t)}</span>`).join("")}</div><div class="work__frame"><div class="work__img">${inner}</div>${href ? `<a class="work__name" href="${escUrl(href)}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ""}>${nm}</a>` : `<span class="work__name">${nm}</span>`}</div></${el}>`;
  };
  const plain = (x) => ({ ...x, sample: false }); // "Sample" moves from the corner badge into the tag pills

  // Play / pause one reel (real video, or the animated placeholder with pop-in captions)
  const reelTimers = new WeakMap();
  const playReel = (el, on) => {
    if (!el) return;
    const vid = $("video", el);
    if (vid) { if (on) vid.play().catch(() => {}); else vid.pause(); return; }
    el.classList.toggle("is-play", on && !reduce);
    clearInterval(reelTimers.get(el));
    const cap = $(".vreel__cap", el);
    if (on && !reduce && cap) {
      let k = 0;
      reelTimers.set(el, setInterval(() => { k = (k + 1) % REEL_WORDS.length; const w = REEL_WORDS[k]; cap.innerHTML = `<span class="pop${w[0] === "*" ? " hl" : ""}">${w.replace("*", "")}</span>`; }, 650));
    }
  };
  document.addEventListener("click", (e) => {
    const snd = e.target.closest(".vreel__snd");
    if (snd) { const v = $("video", snd.parentElement); v.muted = !v.muted; snd.textContent = v.muted ? "🔇" : "🔊"; snd.setAttribute("aria-label", v.muted ? "Turn sound on" : "Turn sound off"); return; }
    const play = e.target.closest(".vpod__play");
    if (play) { const box = play.parentElement; box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${box.dataset.yt}?autoplay=1&rel=0" title="Podcast episode" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`; }
  });

  const videoBox = $("#videoWork");
  if (videoBox && vOn) {
    $("#video").hidden = false;
    const waves = Array.from({ length: 40 }, (_, i) => `<i style="--i:${i}"></i>`).join("");
    videoBox.innerHTML = [
      VT.length ? `<div class="vsub"><div class="vsub__head"><h3>Thumbnails</h3><span>Click one to see it large</span></div><div class="vthumbs">${VT.map((t, i) => framed([t.channel || "Thumbnail", t.views ? t.views + " views" : "", t.sample ? "Sample" : ""], thumbArt(plain(t), i), t.title, { el: "button", attrs: `type="button" data-t="${i}" aria-label="View thumbnail: ${esc(t.title)}"` })).join("")}</div></div>` : "",
      VR.length ? `<div class="vsub"><div class="vsub__head"><h3>Reels &amp; shorts</h3><span>Always moving · hover to pause</span><button type="button" class="vmarq__btn" id="vmarqBtn" aria-pressed="false" aria-label="Pause the moving reels">❚❚</button></div><div class="vmarq" id="vmarq"><div class="vmarq__track">${(() => {
        // one set of reels, repeated until it is wide enough; the track holds it twice so the loop is seamless
        const one = VR.map((r, i) => ({ r, i })); let set = one; while (set.length < 8) set = set.concat(one);
        const cell = ({ r, i }, copy) => `<div class="vmarq__item"${copy ? ' aria-hidden="true" inert' : ""}>${framed([r.handle || "Reel", r.sample ? "Sample" : ""], reelArt(plain(r), i, true), r.title.replace(/^Sample reel · /, ""), { href: r.link })}</div>`;
        return set.map((x, k) => cell(x, k >= one.length)).join("") + set.map((x) => cell(x, true)).join("");
      })()}</div></div></div>` : "",
      VP.length ? `<div class="vsub"><div class="vsub__head"><h3>Podcast editing</h3><span>Full episodes, edited end to end</span></div><div class="vpods">${VP.map((p, i) => `<article class="vep reveal">${framed([p.show, p.episode, p.sample ? "Sample" : ""], podArt(plain(p), false, i), ytId(p.youtube) ? "Watch episode" : p.title, { href: p.youtube })}<div class="vep__info"><small>${esc([p.show, p.episode].filter(Boolean).join(" · "))}</small><h4>${esc(p.title)}</h4><div class="vwave" aria-hidden="true">${waves}</div>${(p.did || []).length ? `<ul class="vep__did">${p.did.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}<div class="vep__meta">${[["Length", p.length], ["Setup", p.cams], ["Edited in", p.tool]].filter((x) => x[1]).map(([k, v]) => `<div><b>${esc(v)}</b>${k}</div>`).join("")}</div></div></article>`).join("")}</div></div>` : "",
    ].join("");

    // Thumbnail lightbox
    if (VT.length) {
      const lb = document.createElement("div");
      lb.className = "vlb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Thumbnail");
      lb.innerHTML = '<button class="vlb__close" type="button" aria-label="Close">✕</button><div class="vlb__in"></div>';
      document.body.appendChild(lb);
      let opener = null;
      const close = () => { lb.classList.remove("is-on"); if (opener) opener.focus(); };
      $$(".vthumbs > button", videoBox).forEach((b) => b.addEventListener("click", () => {
        const i = +b.dataset.t, t = VT[i]; opener = b;
        $(".vlb__in", lb).innerHTML = thumbArt(t, i) + `<p><span>${esc(t.title)}</span>${t.link ? `<a class="btn" href="${escUrl(t.link)}" target="_blank" rel="noopener">Watch video ↗</a>` : ""}</p>`;
        lb.classList.add("is-on"); $(".vlb__close", lb).focus();
      }));
      lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest(".vlb__close")) close(); });
      addEventListener("keydown", (e) => { if (e.key === "Escape" && lb.classList.contains("is-on")) close(); });
    }

    // Reels marquee: one row sliding right to left without stopping (CSS animation on .vmarq__track).
    // Hover or keyboard focus pauses it, the ❚❚ button stops it; reels play only while the row is on screen.
    const marq = $("#vmarq");
    if (marq) {
      VR.forEach((r, i) => {
        if (r.video) return;
        const src = `${IMG}/video/reels/${i + 1}.mp4`;
        fetch(src, { method: "HEAD" }).then((res) => {
          if (!res.ok || !/video/.test(res.headers.get("content-type") || "")) return;
          $$(`.vreel[data-reel="${i}"]`, marq).forEach((el) => {
            [...el.children].forEach((c) => { if (!c.matches(".vbadge")) c.remove(); });
            el.insertAdjacentHTML("afterbegin", `<video src="${src}" muted loop playsinline preload="metadata"></video>`);
            if (!marq.classList.contains("is-off")) playReel(el, true);
          });
        }).catch(() => {});
      });
      const reels = $$(".vreel", marq);
      new IntersectionObserver(([e]) => { reels.forEach((r) => playReel(r, e.isIntersecting)); marq.classList.toggle("is-off", !e.isIntersecting); }, { threshold: 0.2 }).observe(marq);
      const btn = $("#vmarqBtn");
      if (reduce) btn.hidden = true;
      btn.addEventListener("click", () => {
        const stop = marq.classList.toggle("is-stopped");
        btn.textContent = stop ? "▶" : "❚❚";
        btn.setAttribute("aria-pressed", String(stop));
        btn.setAttribute("aria-label", stop ? "Play the moving reels" : "Pause the moving reels");
      });
    }
  }

  // Services page — video format cards (visual = first item of each list)
  const vCards = $("#videoCards");
  if (vCards && vOn && (V.cards || []).length) {
    $("#videoFormats").hidden = false;
    const vis = { thumbnails: () => thumbArt(VT[0] || { sample: true }, 0), reels: () => reelArt(VR[0] || { sample: true, title: "" }, 0, true), podcasts: () => podArt(VP[0] || { sample: true, title: "" }, true) };
    vCards.innerHTML = V.cards.map((c) => `<div class="vcard reveal">${framed(String(c.tools || "").split("·").map((t) => t.trim()), `<div class="vcard__vis">${vis[c.id] ? vis[c.id]() : ""}</div>`, c.title, { href: "/projects.html#video" })}<p class="work__desc">${esc(c.text)}</p></div>`).join("");
    $$(".vcard", vCards).forEach((card) => { const r = $(".vreel", card); if (!r) return; card.addEventListener("mouseenter", () => playReel(r, true)); card.addEventListener("mouseleave", () => playReel(r, false)); });
  }

  // Home — wall of work (like kraftbase.com): project pictures mixed with video thumbnails and podcast
  // frames, two flat rows sliding in opposite directions. Hovering a row pauses only that row.
  const wall = $("#workWall");
  if (wall) {
    const real = (x) => !x.sample || x.image; // placeholders (the gk "Sample" switch) stay off the home page
    const tiles = [
      ...realProjects.map((p) => ({ href: p.caseStudy && p.caseStudy.show ? caseUrl(p) : "/projects.html", html: coverImg({ ...p, alt: "" }, ' loading="lazy"', "remove"), pic: true })),
      ...(vOn ? VT.map((t, i) => (real(t) ? { href: "/projects.html#video", html: thumbArt(plain(t), i) } : null)).filter(Boolean) : []),
      ...(vOn ? VP.map((p, i) => (real(p) ? { href: "/projects.html#video", html: podArt(plain(p), true, i) } : null)).filter(Boolean) : []),
    ];
    if (tiles.length >= 3) {
      // Each row repeats the WHOLE set of tiles until it is wider than big screens (at least 8), then doubles for a
      // seamless loop. Whole sets only: a part-set (7 tiles padded to 8) put the same picture twice side by side.
      const len = tiles.length * Math.ceil(8 / tiles.length);
      const row = (list) => { const r = Array.from({ length: len }, (_, i) => list[i % list.length]); return `<div class="kwall__row">${[...r, ...r].map((t) => `<a href="${t.href}" tabindex="-1" aria-hidden="true"${t.pic ? " data-pic" : ""}>${t.html}</a>`).join("")}</div>`; };
      // The second row uses a different order (reversed, then every other tile first) so the two rows
      // never show the same pictures stacked on top of each other; CSS also gives it its own speed and start.
      const rev = [...tiles].reverse(), mixed = [...rev.filter((_, i) => i % 2), ...rev.filter((_, i) => !(i % 2))];
      wall.innerHTML = row(tiles) + row(mixed);
      wall.hidden = false;
    }
  }

  // Home — showreel (like kraftbase.com): a giant SHOWREEL word that shrinks back while the video card rises
  // and grows over it as the section scrolls past. The YouTube video loads only when someone presses play.
  const reelBox = $("#showreel"), SR = V.showreel || {};
  // shown only once there is a real video (a YouTube link in /gk); until then the section stays hidden
  if (reelBox && SR.show !== false && ytId(SR.youtube)) {
    const card = $("#showreelCard"), id = ytId(SR.youtube), poster = SR.poster || (id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : "");
    card.innerHTML = `${poster ? `<img src="${esc(poster)}" alt="" loading="lazy" />` : autoImg(`${IMG}/video/showreel/poster`, "", ' loading="lazy"')}<button class="kreel__play" type="button" aria-label="${id ? "Play showreel" : "Showreel coming soon"}"${id ? "" : " disabled"}>▶</button>`;
    if (id) $(".kreel__play", card).addEventListener("click", () => { card.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="Showreel" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`; card.classList.add("is-playing"); });
    reelBox.hidden = false;
    // --p goes 0 → 1 across the section; set on the section so the word (shrinks) and the card (grows) both use it
    const grow = () => {
      if (card.classList.contains("is-playing")) return reelBox.style.setProperty("--p", 1);
      const r = reelBox.getBoundingClientRect();
      reelBox.style.setProperty("--p", reduce ? 1 : Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))).toFixed(3));
    };
    addEventListener("scroll", grow, { passive: true }); addEventListener("resize", grow); grow();
  }

  // Placeholder podcast frames switch camera and captions like an edited episode
  const mockPods = $$(".vpod").filter((p) => $(".vpod__scene", p));
  if (mockPods.length && !reduce) {
    let k = 0;
    setInterval(() => {
      k = (k + 1) % 4;
      mockPods.forEach((p) => { $$(".vpod__scene", p).forEach((s, j) => s.classList.toggle("is-on", j === [0, 1, 2, 1][k])); const c = $(".vpod__cap span", p); if (c) c.innerHTML = POD_CAPS[k]; });
    }, 2200);
  }

  // Home — "What I do best": one white card per service in a recessed tray (like kraftbase.com).
  // Each card: name + line icon, a divider, the summary, then skill tags.
  const SVC_ICONS = {
    product: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    uiux: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18M7 12h5M7 15h8"/><circle cx="17" cy="13.5" r="1.6"/>',
    logo: '<path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.3 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z"/>',
    motion: '<circle cx="15" cy="12" r="5"/><path d="M3 9h5M2 12h6M3 15h5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3z"/>',
  };
  const svcBox = $("#serviceStack");
  if (svcBox) {
    svcBox.innerHTML = mainSvcs.map((s) => `<article class="svc__card reveal"><header><h3>${esc(s.name)}</h3><span class="svc__ic" aria-hidden="true">${SVC_ICONS[s.id] ? `<svg viewBox="0 0 24 24">${SVC_ICONS[s.id]}</svg>` : esc(s.letter || s.name[0])}</span></header><p>${esc(s.detail || s.summary)}</p><ul>${(s.skills || []).map((k) => `<li>${esc(k)}</li>`).join("")}</ul></article>`).join("")
      + alsoSvcs.map((s) => `<p class="svc__also reveal"><span>Also</span> <b>${esc(s.name)}</b> — ${esc(s.summary || "")} <a href="/contact.html?service=${encodeURIComponent(s.name)}">Ask about it ↗</a></p>`).join("");
  }

  // ---------- Ideas from kokiltamta.in (picked from samples/kokiltamta.html) ----------
  const svgIc = (id) => (SVC_ICONS[id] ? `<svg viewBox="0 0 24 24" aria-hidden="true">${SVC_ICONS[id]}</svg>` : "");
  const projHref = (p) => (hasCase(p) ? caseUrl(p) : "/projects.html#" + encodeURIComponent(p.id));
  const videoSvc = C.services.find((s) => s.id === "video");
  // Featured projects + a Video item (when video work is shown) — used by the Home panels and the notebook
  const workItems = (list) => [
    ...list.map((p) => ({ p, label: p.name, eyebrow: `${p.category} · ${p.type}`, title: p.name, desc: p.description || "", tags: (p.tags || []).filter((t) => t !== "Sample"), href: projHref(p) })),
    ...(vOn && videoSvc ? [{ label: "Video", eyebrow: "Video · Thumbnails, reels, podcasts", title: videoSvc.name, desc: videoSvc.summary || "", tags: ["Thumbnails", "Reels", "Podcasts"], href: "/projects.html#video", art: "video" }] : []),
  ];
  const itemPic = (it) => (it.art ? `<div class="acc__art">${svgIc(it.art)}</div>` : coverImg(it.p, vtShot(it.p), `<div class="acc__art"><b>${esc(it.title)}</b></div>`));

  // Home — Selected works as expanding panels: hover (or tap) opens one; clicking the open panel opens the project.
  // HIDDEN for now (user went back to the grid): only runs if a #workPanels element is put back in index.html
  const accBox = $("#workPanels");
  if (accBox) {
    const items = workItems(realProjects.filter((p) => p.featured));
    accBox.innerHTML = items.map((it, i) => `<article class="acc__p${i ? "" : " is-open"}" data-href="${escUrl(it.href)}" aria-label="${esc(it.title)}">
      <div class="acc__pic">${itemPic(it)}</div>
      <span class="acc__peek" aria-hidden="true">${pad(i + 1)} — ${esc(it.label)}</span>
      <div class="acc__body"><span class="acc__eyebrow">${pad(i + 1)} — ${esc(it.eyebrow)}</span><h3 class="acc__title">${esc(it.title)}</h3><p class="acc__desc">${esc(it.desc)}</p>
        <div class="acc__tags">${it.tags.map((t) => `<span>${esc(t)}</span>`).join("")}<a class="acc__go" href="${escUrl(it.href)}" aria-label="Open ${esc(it.title)}">↗</a></div></div></article>`).join("");
    const panels = $$(".acc__p", accBox);
    const openP = (p) => panels.forEach((x) => x.classList.toggle("is-open", x === p));
    panels.forEach((p) => {
      if (hover) p.addEventListener("pointerenter", () => openP(p));
      p.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        if (p.classList.contains("is-open")) $(".acc__go", p).click(); else openP(p); // via the link, so page transitions + the single-file router still apply
      });
    });
    // keyboard: the ↗ link inside each panel is the tab stop; focusing it opens that panel
    $$(".acc__go", accBox).forEach((a) => a.addEventListener("focus", () => openP(a.closest(".acc__p"))));
  }

  // Projects — notebook index: Index page + one page per project (+ Video) + "More on the way"; tabs flip pages
  const book = $("#workBook");
  if (book) {
    const items = workItems(realProjects);
    const pages = [{ tab: "Index" }, ...items.map((it) => ({ tab: it.label, it })), { tab: "Next up", soon: true }];
    const page = $("#bookPage"), tabs = $("#bookTabs");
    tabs.innerHTML = pages.map((p, i) => `<button type="button" role="tab" data-i="${i}">${esc(p.tab)}</button>`).join("");
    const show = (i, anim = true) => {
      const p = pages[i];
      const nav = `<div class="pg-nav"><span>${i ? `<button type="button" data-go="${i - 1}">← ${esc(pages[i - 1].tab)}</button>` : ""}</span><span>${i < pages.length - 1 ? `<button type="button" data-go="${i + 1}">${i ? esc(pages[i + 1].tab) : "Next page"} →</button>` : ""}</span></div>`;
      const body = !i
        ? `<h3>Index</h3><table><tr><th>Project</th><th>Page no.</th></tr>${pages.slice(1).map((q, j) => `<tr data-go="${j + 1}" tabindex="0"><td>${esc(q.tab)}</td><td>${pad(j + 1)}</td></tr>`).join("")}</table>`
        : p.soon ? `<span class="pg-no">Page ${pad(i)}</span><h3 class="pg-h">Next up</h3><p>Posters, brochures and company decks are the next pages in this book. Check back in a bit…</p><a class="pg-open" href="/contact.html">Have one in mind? ↗</a>`
        : `<span class="pg-no">Page ${pad(i)} · ${esc(p.it.eyebrow)}</span><h3 class="pg-h">${esc(p.it.title)}</h3><div class="pg-pic">${itemPic(p.it)}</div><p>${esc(p.it.desc)}</p><a class="pg-open" href="${escUrl(p.it.href)}">Open ↗</a>`;
      $$("button", tabs).forEach((b, j) => { b.classList.toggle("is-on", j === i); b.setAttribute("aria-selected", j === i); });
      const swap = () => { page.innerHTML = body + nav; };
      if (anim && !reduce) { page.classList.remove("is-flip"); void page.offsetWidth; page.classList.add("is-flip"); setTimeout(swap, 250); } else swap();
    };
    tabs.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) show(+b.dataset.i); });
    page.addEventListener("click", (e) => { const g = e.target.closest("[data-go]"); if (g) show(+g.dataset.go); });
    page.addEventListener("keydown", (e) => { const g = e.target.closest("tr[data-go]"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); show(+g.dataset.go); } });
    show(0, false);
    book.hidden = false;
  }

  // About — bento: quick facts, disciplines and a sliding strip of work (project covers + one tile per craft)
  const factsBox = $('[data-render="facts"]');
  if (factsBox) {
    const XP = S.experience || {};
    const facts = [["Experience", XP.years ? `${XP.years} years` : ""], ["Works", XP.work || ""], ["Based in", S.location || "Chennai, India"], ["Remote", "Open to it"]].filter((f) => f[1]);
    factsBox.innerHTML = facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  }
  const doesBox = $('[data-render="disciplines"]');
  if (doesBox) doesBox.innerHTML = C.services.map((s) => `<span>${svgIc(s.id)}${esc(s.name)}</span>`).join("");
  const rollBox = $('[data-render="roll"]');
  if (rollBox) {
    const tiles = [
      ...realProjects.map((p) => `<a href="${escUrl(projHref(p))}" tabindex="-1">${coverImg(p, ' loading="lazy"', `<span class="abento__ph">${esc(p.name)}</span>`)}</a>`),
      ...C.services.map((s) => `<span class="abento__ph">${svgIc(s.id)}${esc(s.name)}</span>`),
    ];
    const set = tiles.map((t, i) => t.replace(/^<(a|span)/, `<$1 style="--r:${[-1.5, 1, -0.5, 1.5, -1][i % 5]}deg"`)).join("");
    rollBox.innerHTML = set + set.replace(/<(a|span) /g, '<$1 aria-hidden="true" ');
    rollBox.closest(".abento__roll").hidden = false;
  }

  // Contact — K5 block: big line, email (or "Start a project") with eyes, one row per channel with its note
  const kcLine = $('[data-render="kc-line"]');
  if (kcLine && C.cta && C.cta.line1) kcLine.innerHTML = `${esc(C.cta.line1)} <span>${esc(C.cta.line2 || "")}</span>`;
  const kcMail = $('[data-render="kc-mail"]');
  if (kcMail && email) { kcMail.href = "mailto:" + email; kcMail.textContent = email; }
  const kcRows = $('[data-render="kc-rows"]');
  if (kcRows) {
    const row = (href, brand, logo, name, note, ext = true) => `<a href="${escUrl(href)}"${ext ? ' target="_blank" rel="noopener"' : ""} style="--b:${brand}"><span class="kc__ic" aria-hidden="true">${logo}</span><span><b>${esc(name)}</b>${note ? `<small>${esc(note)}</small>` : ""}</span><em aria-hidden="true">↗</em></a>`;
    kcRows.innerHTML = [
      email ? row("mailto:" + email, /@gmail\.com$/i.test(email) ? "#ea4335" : "var(--acc)", MAIL, "Email", "Best for project briefs", false) : "",
      phone ? row(telHref(phone), PHONE_BRAND, PHONE, phone, "Call me", false) : "",
      ...socials.map((x) => row(x.url, (SOC[socKey(x)] || ["var(--acc)"])[0], socLogo(x), x.name, x.note)),
      S.location ? row(mapHref(S.location), PIN_BRAND, PIN, S.location, "Open to remote work") : "",
    ].join("");
  }

  // Home — about: dot grid behind the text; dots near the cursor grow and turn blue
  const gridCv = $(".kgrid");
  if (gridCv && hover && !reduce) {
    const box = gridCv.parentElement, ctx = gridCv.getContext("2d");
    let W = 0, H = 0, m = null, inside = false, glow = 0, raf = 0;
    const dark = () => document.documentElement.dataset.theme !== "light";
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const gap = 26, R = 150, base = dark() ? "rgba(255,255,255,.1)" : "rgba(6,6,18,.12)";
      const acc = (getComputedStyle(document.documentElement).getPropertyValue("--acc-rgb").trim() || "30 155 255").split(/[\s,]+/).join(","); // follows the site accent
      for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) {
        const k = m ? Math.max(0, 1 - Math.hypot(x - m.x, y - m.y) / R) * glow : 0;
        ctx.fillStyle = k > .02 ? `rgba(${acc},${.18 + k * .82})` : base;
        ctx.beginPath(); ctx.arc(x, y, 1.1 + k * 2.6, 0, 6.283); ctx.fill();
      }
    };
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = box.clientWidth; H = box.clientHeight; gridCv.width = W * d; gridCv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); draw(); };
    // the glow fades in when the cursor enters and out when it leaves (last position kept while fading)
    const loop = () => { const t = inside ? 1 : 0; glow += (t - glow) * .12; draw(); raf = Math.abs(t - glow) > .01 ? requestAnimationFrame(loop) : 0; };
    box.addEventListener("pointermove", (e) => { const r = box.getBoundingClientRect(); m = { x: e.clientX - r.left, y: e.clientY - r.top }; inside = true; if (!raf) raf = requestAnimationFrame(loop); });
    box.addEventListener("pointerleave", () => { inside = false; if (!raf) raf = requestAnimationFrame(loop); });
    new ResizeObserver(size).observe(box);
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  // ---------- New Projects layout (projects-new.html) — ideas from addxstudio.com, picked from samples/addx-work.html ----------
  // L2 #caseCards: one 16:9 card per case study that keeps "playing" (a full-page screen scrolls by itself, or the
  // case study's boards cross-fade); the pill shows the first real number from the case study.
  const caseCards = $("#caseCards");
  if (caseCards) {
    caseCards.innerHTML = realProjects.filter(hasCase).map((p) => {
      const cs = p.caseStudy, st = (cs.stats || []).find((s) => s.value), screen = (cs.screens || []).find((s) => s.image);
      const boards = [...(cs.process || []).map((s) => s.image), ...(cs.gallery || [])].filter(Boolean).slice(0, 5);
      const vis = screen ? `<div class="xl__pan"><img src="${esc(screen.image)}" alt="" loading="lazy" /></div>`
        : boards.length ? `<div class="xl__fade" style="--n:${boards.length}">${boards.map((b, i) => `<img src="${esc(b)}" alt="" style="--i:${i}" loading="lazy" />`).join("")}</div>`
        : coverImg(p, ' loading="lazy"');
      return `<a class="xl__card reveal" href="${caseUrl(p)}" aria-label="${esc(p.name)} case study"><div class="xl__vis">${vis}<span class="xl__live" aria-hidden="true"><i></i>Playing</span></div><div class="xl__foot"><div><b>${esc(p.name)}</b><small>${esc(p.category)} · ${esc(p.type)}</small></div>${st ? `<span class="xl__pill"><b>${esc(st.value)}</b> ${esc(st.label)}</span>` : ""}</div></a>`;
    }).join("");
    // (the scrolling screenshot stops at the bottom of its frame — done in CSS with container units, no measuring)
  }

  // W1 #workTiles: every piece of work in a 3-column grid; a click opens a lightbox. Real projects use their covers and
  // link to the case study; formats with no real work yet show drawn art marked "Sample".
  const workTiles = $("#workTiles");
  if (workTiles) {
    const vcard = (id) => (V.cards || []).find((c) => c.id === id) || {};
    const ART = {
      thumb: '<div class="xart xart--thumb"><b>Your video <i>title</i> here</b></div>',
      reel: '<div class="xart xart--reel"><div class="ph"><i></i></div></div>',
      pod: `<div class="xart xart--pod"><div class="wave">${[30, 60, 90, 45, 75, 100, 55, 35, 80, 65, 40, 90, 50, 25].map((h) => `<i style="--h:${h}"></i>`).join("")}</div></div>`,
      poster: '<div class="xart xart--poster"><div class="sheet"><i></i><i></i></div></div>',
      brochure: '<div class="xart xart--brochure"><div class="fold"><i></i><i></i><i></i></div></div>',
    };
    const toVideo = vOn ? { href: "#video", go: "See video work ↓" } : { href: "/contact.html?service=Video%20editing", go: "Ask about this ↗" };
    const items = [
      ...realProjects.map((p) => ({ name: p.name, kind: `${p.category} · ${p.type}`, pic: coverImg(p, ' loading="lazy"'), text: p.description || "", href: hasCase(p) ? caseUrl(p) : p.link || "/contact.html", go: hasCase(p) ? "Open case study ↗" : "Ask about this ↗" })),
      { name: vcard("thumbnails").title || "Thumbnail design", kind: "Video · Thumbnails", art: "thumb", text: vcard("thumbnails").text, ...toVideo, sample: true },
      { name: vcard("reels").title || "Reels & shorts", kind: "Video · Reels", art: "reel", text: vcard("reels").text, ...toVideo, sample: true },
      { name: vcard("podcasts").title || "Podcast editing", kind: "Video · Podcast", art: "pod", text: vcard("podcasts").text, ...toVideo, sample: true },
      { name: "Posters", kind: "Graphic · Print", art: "poster", text: "Poster work goes here once it's added.", href: "/contact.html?service=Graphic%20design", go: "Ask about this ↗", sample: true },
      { name: "Brochures & decks", kind: "Graphic · Print", art: "brochure", text: "Brochures and company decks go here once they're added.", href: "/contact.html?service=Graphic%20design", go: "Ask about this ↗", sample: true },
    ];
    workTiles.innerHTML = items.map((it, i) => `<button class="xw__tile reveal" type="button" data-i="${i}" aria-haspopup="dialog" aria-label="${esc(it.name)}${it.sample ? " (sample)" : ""}">
      <div class="xw__vis">${it.pic || ART[it.art]}${it.sample ? '<span class="xw__flag">Sample</span>' : ""}<span class="xw__play" aria-hidden="true">${it.art ? "▶" : "↗"}</span></div>
      <div class="xw__foot"><b>${esc(it.name)}</b><span>${esc(it.kind)}</span></div></button>`).join("");

    // Lightbox
    const lb = document.createElement("div");
    lb.className = "xlb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Work preview");
    lb.innerHTML = '<button class="xlb__x" type="button" aria-label="Close">✕</button><div class="xlb__box"><div class="xlb__vis"></div><div class="xlb__foot"></div></div>';
    document.body.appendChild(lb);
    let back = null;
    const close = () => { lb.classList.remove("is-on"); if (window.lenis) window.lenis.start(); if (back) back.focus(); };
    const open = (it, from) => {
      back = from;
      $(".xlb__vis", lb).innerHTML = it.pic ? it.pic.replace(' loading="lazy"', "").replace(/ srcset="[^"]*" sizes="[^"]*"/, "") : ART[it.art]; // big lightbox: the full cover
      $(".xlb__foot", lb).innerHTML = `<div><b>${esc(it.name)}</b><small>${esc(it.kind)}${it.sample ? " · sample" : ""}</small></div><p>${esc(it.text)}</p><a class="btn" href="${escUrl(it.href)}">${esc(it.go)}</a>`;
      lb.classList.add("is-on"); if (window.lenis) window.lenis.stop(); $(".xlb__x", lb).focus();
    };
    workTiles.addEventListener("click", (e) => { const t = e.target.closest(".xw__tile"); if (t) open(items[+t.dataset.i], t); });
    $(".xlb__x", lb).addEventListener("click", close);
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); else if (e.target.closest(".xlb__foot a")) { lb.classList.remove("is-on"); if (window.lenis) window.lenis.start(); } });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && lb.classList.contains("is-on")) close(); });
  }

  // ---------- Preview pages home-new.html + projects-v3.html (picked from samples/four-portfolios.html) ----------
  const pvScenario = { // one-line set-up for the story rows (from the case studies); other projects use their description
    milton: "Looking for a lunch box shouldn't mean scrolling past bottles, cookware and kettles. I redesigned Milton's store so every category is one tap away and every card shows the price and the saving first.",
    nexura: "Most tech logos are a letter in a box. For Nexura Infotech I drew a hexagon that hides all six letters of the name, then built the colours, type and pattern around it, and designed and built its 25-page website.",
  };
  const pvCases = realProjects.filter(hasCase);
  // P2 #pvCards: result cards (title + picture + up to two real numbers) and an honest empty slot
  const pvCards = $("#pvCards");
  if (pvCards) {
    pvCards.innerHTML = pvCases.map((p) => {
      const cs = p.caseStudy, st = (cs.stats || []).filter((s) => s.value).slice(0, 2);
      return `<a class="pvr__card reveal" href="${caseUrl(p)}"><h3>${esc(cs.title || p.name)}<i aria-hidden="true">↗</i></h3><div class="pvr__pic">${coverImg(p, ' loading="lazy"')}</div>${st.length ? `<div class="pvr__pills">${st.map((s) => `<span><b>${esc(s.value)}</b> ${esc(s.label)}</span>`).join("")}</div>` : ""}</a>`;
    }).join("") + (pvCases.length % 3 ? `<div class="pvr__soon reveal">next case study coming soon</div>` : "");
  }
  // P4 #pvTiles: the rest of the work as big tiles (case studies are already in the story rows above)
  const pvTiles = $("#pvTiles");
  if (pvTiles) {
    const iconFor = (p) => svgIc(/ui/i.test(p.category) ? "uiux" : /brand|graphic/i.test(p.category) ? "logo" : "product");
    const rest = C.projects.filter((p) => !hasCase(p));
    const tiles = rest.map((p) => `<a class="pvt__tile reveal" href="${p.sample ? "/contact.html" : "/projects.html#" + encodeURIComponent(p.id)}">${p.sample ? `<div class="pvt__art">${iconFor(p)}</div><span class="pvt__flag">Sample</span>` : coverImg(p, ' loading="lazy"', `<div class="pvt__art">${iconFor(p)}</div>`)}<span class="pvt__line">${esc(p.type)}</span><span class="pvt__veil"><span><b>${esc(p.name)}</b><span>${esc(p.category)} · ${esc(p.type)}</span></span></span></a>`);
    if (vOn) tiles.push(`<a class="pvt__tile reveal" href="#video"><div class="pvt__art">${svgIc("video")}</div><span class="pvt__line">Thumbnails, reels and podcasts</span><span class="pvt__veil"><span><b>Video work</b><span>Video · Editing</span></span></span></a>`);
    pvTiles.innerHTML = tiles.join("");
  }
  // P7 #pvStories: one row per case study — title greys in, scenario line, button, mockup slides in from the side
  const pvStories = $("#pvStories");
  if (pvStories) {
    pvStories.innerHTML = pvCases.map((p) => {
      const cs = p.caseStudy, sc = (cs.screens || []).map((s) => s.image).filter(Boolean), board = (cs.gallery || [])[1] || (cs.gallery || [])[0];
      const vis = sc.length ? `<div class="pvs__laptop"><div class="scr"><img src="${esc(sc[0])}" alt="" loading="lazy" /></div><div class="base"></div></div>${sc[1] ? `<div class="pvs__phone"><img src="${esc(sc[1])}" alt="" loading="lazy" /></div>` : ""}`
        : `<div class="pvs__board">${board ? `<img src="${esc(board)}" alt="" loading="lazy" />` : coverImg(p, ' loading="lazy"')}</div>`;
      return `<article class="pvs__row"><div class="pvs__txt"><h3>${esc(p.name)}<small>${esc(p.type)}</small></h3><p>${esc(pvScenario[p.id] || p.description || "")}</p><a class="btn" href="${caseUrl(p)}">Case study ↗</a></div><div class="pvs__vis" aria-hidden="true">${vis}</div></article>`;
    }).join("");
    const rows = $$(".pvs__row", pvStories);
    if (reduce) rows.forEach((r) => r.classList.add("in"));
    else { const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: .25 }); rows.forEach((r) => io.observe(r)); }
  }
  // P8 #pvSignoff: email (if shown) + social links under the one-line sign-off
  const pvSign = $("#pvSignoff");
  if (pvSign) pvSign.innerHTML = [email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : `<a href="/contact.html">Start a project</a>`, ...socials.map((x) => `<a href="${escUrl(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>`)].join("");

  // Eyes (Home hero + Contact): pupils look at the pointer and blink now and then
  const eyeSets = $$("[data-eyes]");
  if (eyeSets.length) {
    addEventListener("pointermove", (e) => {
      eyeSets.forEach((set) => $$(".eye", set).forEach((eye) => {
        const r = eye.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const a = Math.atan2(e.clientY - cy, e.clientX - cx), d = Math.min(1, Math.hypot(e.clientX - cx, e.clientY - cy) / 160) * r.width * .26;
        eye.style.setProperty("--px", (Math.cos(a) * d).toFixed(1) + "px"); eye.style.setProperty("--py", (Math.sin(a) * d).toFixed(1) + "px");
      }));
    }, { passive: true });
    if (!reduce) (function blink() { setTimeout(() => { eyeSets.forEach((s) => { s.classList.remove("is-blink"); void s.offsetWidth; s.classList.add("is-blink"); }); blink(); }, 2600 + Math.random() * 2600); })();
  }

  // Googly eyes (Home hero, and any other .eyes-scene): pupils look at the cursor anywhere on the page, blink every 3s
  const googly = $$(".eyes-scene .eye").map((eye) => ({ eye, pupil: $(".pupil", eye) }));
  if (googly.length) {
    const EYE_MAX = 28;    // px of pupil travel: (100 - 2*2 border)/2 - 36/2 = 30 of room, 28 keeps a white rim
    const EYE_DIV = 8;     // travel = distance / 8: bigger = lazier near the cursor
    const BLINK_EVERY = 3000, BLINK_HOLD = 150; // ms between blinks / ms shut
    let mx = 0, my = 0, queued = false;
    const look = () => {
      queued = false;
      googly.forEach(({ eye, pupil }) => {
        const r = eye.getBoundingClientRect(), dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
        const a = Math.atan2(dy, dx), d = Math.min(EYE_MAX, Math.hypot(dx, dy) / EYE_DIV);
        pupil.style.transform = `translate(calc(-50% + ${(Math.cos(a) * d).toFixed(1)}px), calc(-50% + ${(Math.sin(a) * d).toFixed(1)}px))`;
      });
    };
    // pointermove = mousemove plus touch drags; one update per frame
    addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; if (!queued) { queued = true; requestAnimationFrame(look); } }, { passive: true });
    if (!reduce) setInterval(() => {
      googly.forEach(({ eye }) => eye.classList.add("blink"));
      setTimeout(() => googly.forEach(({ eye }) => eye.classList.remove("blink")), BLINK_HOLD);
    }, BLINK_EVERY);
  }

  // Home hero — paint to reveal: the cursor (or a finger dragging sideways) drops blue blobs into an SVG
  // clip-path, which shows the blue copy of the hero (.kp__ink) on top of the faint one (.kp__base)
  const kp = $("#kp");
  if (kp) {
    const clip = $("#kpClip"), eyesBox = $("#kpEyes"), NS = "http://www.w3.org/2000/svg";
    const placeEyes = () => { // the real eyes sit exactly on the gap left in the title
      const spot = $(".kp__base .kp__spot", kp).getBoundingClientRect(), box = kp.getBoundingClientRect();
      eyesBox.style.left = spot.left - box.left + "px"; eyesBox.style.top = spot.top - box.top + "px";
    };
    // the eyes stay invisible until the title's real font has loaded and they sit in its gap, so they appear in place instead of jumping
    const showEyes = () => { placeEyes(); eyesBox.classList.add("is-placed"); };
    placeEyes(); addEventListener("resize", placeEyes); if (document.fonts) document.fonts.ready.then(showEyes); else showEyes();
    if (!hover) $(".kp__hint", kp).textContent = "tap to paint";
    if (reduce) {
      const all = document.createElementNS(NS, "rect"); all.setAttribute("width", 99999); all.setAttribute("height", 99999); clip.append(all); kp.classList.add("is-painted");
    } else {
      let last = null, count = 0;
      const dab = (x, y) => {
        const c = document.createElementNS(NS, "circle"), size = Math.max(60, kp.clientWidth * .08);
        c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1)); c.setAttribute("r", 0);
        clip.append(c); requestAnimationFrame(() => { c.setAttribute("r", (size * (.75 + Math.random() * .6)).toFixed(1)); queueNav(); });
        if (++count > 700) { clip.firstElementChild.remove(); count--; }
        kp.classList.add("is-painted");
      };
      const paintTo = (x, y) => {
        if (!last) { dab(x, y); last = { x, y }; return; }
        const dist = Math.hypot(x - last.x, y - last.y), step = 34;
        if (dist < step) return;
        for (let t = step; t <= dist; t += step) dab(last.x + (x - last.x) * t / dist, last.y + (y - last.y) * t / dist);
        last = { x, y };
      };
      // Nav items sitting over the blue paint switch to the on-accent colour (white on blue) so they stay readable;
      // once the nav turns into the solid scrolled pill (or the paint is scrolled away) they go back to normal.
      const topNav = $(".nav"), navBits = topNav ? $$(".nav__brand, .nav__links > a, .nav__links > .mega-wrap > a, .theme-btn, .nav__cta, .nav__menu", topNav) : [];
      let navRaf = 0;
      const navOverPaint = () => {
        navRaf = 0;
        const box = kp.getBoundingClientRect(), pill = topNav.classList.contains("is-pill"), dots = pill ? [] : [...clip.children];
        navBits.forEach((el) => {
          // test 5 points across the item; it turns white when most of it sits on the paint
          const r = el.getBoundingClientRect(), y = r.top + r.height / 2 - box.top;
          const hit = (x) => dots.some((c) => Math.hypot(x - c.cx.baseVal.value, y - c.cy.baseVal.value) < c.r.baseVal.value);
          const on = !!r.width && [.1, .3, .5, .7, .9].filter((f) => hit(r.left + r.width * f - box.left)).length >= 3;
          el.classList.toggle("on-paint", on);
        });
      };
      const queueNav = () => { if (topNav && !navRaf) navRaf = requestAnimationFrame(navOverPaint); };
      addEventListener("scroll", queueNav, { passive: true }); addEventListener("resize", queueNav);
      kp.addEventListener("pointermove", (e) => { const r = kp.getBoundingClientRect(); paintTo(e.clientX - r.left, e.clientY - r.top); queueNav(); });
      kp.addEventListener("pointerleave", () => (last = null));
      // Nothing paints by itself: the cursor paints on computers; on touch screens a tap drops a blob
      // and a sideways swipe paints a stroke (up/down swipes still scroll the page)
      kp.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") return; const r = kp.getBoundingClientRect(); last = null; paintTo(e.clientX - r.left, e.clientY - r.top); });
      ["pointerup", "pointercancel"].forEach((t) => kp.addEventListener(t, (e) => { if (e.pointerType !== "mouse") last = null; }));
      // keyboard focus on a hero button paints a stroke across it, so the real (blue-layer) button and its ring show
      $("#kpInk").addEventListener("focusin", (e) => {
        const a = e.target.closest("a"); if (!a) return;
        const r = a.getBoundingClientRect(), box = kp.getBoundingClientRect(), y = r.top - box.top + r.height / 2;
        last = null; paintTo(r.left - box.left - 20, y); paintTo(r.right - box.left + 20, y); last = null;
      });
    }
  }

  // Home — expertise panels (older layout; kept for pages that still use #expertisePanels)
  const panelBox = $("#expertisePanels");
  if (panelBox) {
    panelBox.innerHTML = C.services.map((s, i) => `<div${i ? "" : ' class="is-on"'} tabindex="0"><span class="panels__n">${pad(i + 1)}</span><span class="panels__v" aria-hidden="true">${esc(s.name)}</span><div class="panels__body"><h3>${esc(s.name)}</h3><p>${esc(s.summary)}</p><ul>${(s.skills || []).map((k) => `<li>${esc(k)}</li>`).join("")}</ul></div></div>`).join("");
  }

  // Services page — bento cards (Product design = big lead card); each Enquire link pre-selects the service on the contact form
  const rows = $("#serviceRows");
  if (rows) {
    // tools named in each service's own text → small coloured badges
    // [label, background, text] — Adobe's own app-icon colours (dark tile, bright letters) so the letters stay readable
    const TOOL_BADGE = { Figma: ["Fg", "#a259ff", "#000"], Illustrator: ["Ai", "#330000", "#ff9a00"], "After Effects": ["Ae", "#00005b", "#9999ff"], "Premiere Pro": ["Pr", "#00005b", "#9999ff"], Photoshop: ["Ps", "#001e36", "#31a8ff"] };
    const toolsFor = (s) => Object.keys(TOOL_BADGE).filter((t) => `${s.detail || ""} ${s.summary || ""}`.includes(t));
    const ic = (s) => (SVC_ICONS[s.id] ? `<svg viewBox="0 0 24 24" aria-hidden="true">${SVC_ICONS[s.id]}</svg>` : `<b>${esc(s.letter || s.name[0])}</b>`);
    rows.innerHTML = [...mainSvcs, ...alsoSvcs].map((s, i) => `<article class="sbento__card${s.also ? " sbento__card--also" : ""} reveal">
      <div class="sbento__top"><span class="sbento__ic">${ic(s)}</span><span class="sbento__num">${s.also ? "Also" : pad(i + 1)}</span></div>
      <div><h3>${esc(s.name)}</h3>${s.subtitle ? `<h4>${esc(s.subtitle)}</h4>` : ""}</div>
      ${i === 0 ? `<div class="sbento__art" aria-hidden="true">${ic(s)}</div>` : ""}
      <p>${esc(i === 0 ? s.detail || s.summary : s.summary || s.detail)}</p>
      ${(s.deliverables || []).length ? `<div class="sbento__get"><h5>Deliverables</h5><ul>${s.deliverables.map((d) => `<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>${esc(d)}</li>`).join("")}</ul></div>` : ""}
      <div class="sbento__foot"><a class="sbento__cta" href="/contact.html?service=${encodeURIComponent(s.name)}">Enquire <span aria-hidden="true">↗</span></a>
        <div class="sbento__tools">${toolsFor(s).map((t) => `<span title="${t}" style="background:${TOOL_BADGE[t][1]};color:${TOOL_BADGE[t][2]}">${TOOL_BADGE[t][0]}</span>`).join("")}</div></div></article>`).join("");
  }

  // Contact page — service dropdown
  const select = $("#serviceSelect");
  if (select) {
    // "CV request": the CV is sent by email to people who ask (it carries a phone number, so it is never a public file)
    // "Project access": from the "Private project" note on a locked project (…?service=Project%20access&project=NineFlow)
    select.innerHTML = [...C.services.map((s) => [s.name, s.id]), ["CV request", "cv"], ["Project access", "lock"], ["Something else", "other"]].map(([n, id]) => `<option data-ic="${esc(id)}">${esc(n)}</option>`).join("");
    const qs = new URLSearchParams(location.search), pre = qs.get("service"), proj = qs.get("project");
    if (pre) select.value = pre;
    const msg = form && form.elements.message, hint = msg ? msg.placeholder : "";
    const cvHint = () => { if (msg) msg.placeholder = select.value === "CV request" ? "Which role is it for? Company, role and location help me reply with the right CV."
      : select.value === "Project access" ? `Which project${proj ? ` (${proj})` : ""}, and a little about you: company, role, and why you'd like to see it.` : hint; };
    select.addEventListener("change", cvHint); cvHint();
  }

  // Every <select> on the site → a custom dropdown (.dd) that matches the site. The native select stays in the
  // form (hidden) so values, `required` and the mailto code keep working. Keyboard: ↑ ↓ Home End, Enter/Space, Esc, type to jump.
  SVC_ICONS.other = '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8"/>';
  SVC_ICONS.cv = '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>';
  const TICK = '<svg class="dd__tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  $$("select").forEach((sel, n) => {
    const opts = [...sel.options], id = "dd" + n;
    const ic = (o) => (SVC_ICONS[o.dataset.ic] ? `<span class="dd__ic" aria-hidden="true"><svg viewBox="0 0 24 24">${SVC_ICONS[o.dataset.ic]}</svg></span>` : "");
    const dd = document.createElement("div");
    dd.className = "dd";
    dd.innerHTML = `<button type="button" class="dd__btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}"><span class="dd__val"></span><svg class="dd__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
      <ul class="dd__list" id="${id}" role="listbox" tabindex="-1">${opts.map((o, i) => `<li role="option" id="${id}-${i}" data-i="${i}">${ic(o)}<span>${esc(o.text)}</span>${TICK}</li>`).join("")}</ul>`;
    sel.before(dd);
    sel.classList.add("dd__native"); sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true");
    const btn = dd.querySelector(".dd__btn"), list = dd.querySelector(".dd__list"), items = [...list.children];
    let active = 0;
    const sync = () => {
      const i = sel.selectedIndex;
      dd.querySelector(".dd__val").innerHTML = opts[i] ? ic(opts[i]) + `<span>${esc(opts[i].text)}</span>` : "";
      items.forEach((li, k) => li.setAttribute("aria-selected", k === i));
    };
    const mark = (i) => {
      active = Math.max(0, Math.min(items.length - 1, i));
      items.forEach((li, k) => li.classList.toggle("is-active", k === active));
      list.setAttribute("aria-activedescendant", items[active].id);
      // keep the active option in view by scrolling the list only (scrollIntoView would also move the page)
      const li = items[active];
      if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop - 6;
      else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight + 6;
    };
    const open = (on) => {
      dd.classList.toggle("is-open", on); btn.setAttribute("aria-expanded", on);
      if (on) { mark(sel.selectedIndex); list.focus({ preventScroll: true }); }
    };
    const pick = (i) => { sel.selectedIndex = i; sel.dispatchEvent(new Event("change", { bubbles: true })); sync(); open(false); btn.focus(); };
    btn.addEventListener("click", (e) => { e.preventDefault(); open(!dd.classList.contains("is-open")); });
    btn.addEventListener("keydown", (e) => { if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); open(true); } });
    items.forEach((li, i) => { li.addEventListener("click", () => pick(i)); li.addEventListener("pointermove", () => active !== i && mark(i)); });
    let typed = "", typedT;
    list.addEventListener("keydown", (e) => {
      const k = e.key;
      if (k === "ArrowDown") mark(active + 1); else if (k === "ArrowUp") mark(active - 1);
      else if (k === "Home") mark(0); else if (k === "End") mark(items.length - 1);
      else if (k === "Enter" || k === " ") pick(active);
      else if (k === "Escape" || k === "Tab") { open(false); if (k === "Escape") btn.focus(); return; }
      else if (k.length === 1) {
        clearTimeout(typedT); typed += k.toLowerCase(); typedT = setTimeout(() => (typed = ""), 600);
        const f = opts.findIndex((o) => o.text.toLowerCase().startsWith(typed)); if (f > -1) mark(f);
        return;
      } else return;
      e.preventDefault();
    });
    document.addEventListener("pointerdown", (e) => { if (!dd.contains(e.target)) open(false); });
    sel.addEventListener("change", sync);
    sync();
  });

  // Process steps (Home + Services) — a turning dial (idea from kraftbase.com). The section pins while you
  // scroll through it; the dial turns with the scroll and moves Discover → Define → Design → Deliver.
  // Clicking a step on the dial (or ← →) scrolls to it.
  const stepsBox = $("#processSteps");
  if (stepsBox && C.process.length) {
    const N = C.process.length, GAP = 16; // degrees between steps on the dial
    const body = (st) => `<h3>${esc(st.name)}</h3><p>${esc(st.text)}</p><ul>${(st.items || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    stepsBox.className = "kdial";
    stepsBox.innerHTML = `<div class="kdial__ring" id="stepRing">${C.process.map((st, i) => `<button type="button" class="kdial__dot${i ? "" : " on"}" style="--a:${i * GAP}deg" data-i="${i}" aria-label="Step ${i + 1}: ${esc(st.name)}"><span>${pad(i + 1)}</span></button>`).join("")}</div>
        <div class="kdial__body" id="stepBody" aria-live="polite">${body(C.process[0])}</div>
        <div class="kdial__count" aria-hidden="true"><span id="stepCount">01</span> / ${pad(N)}</div>`;
    const stepTabs = $$(".kdial__dot", stepsBox), stepBody = $("#stepBody"), ring = $("#stepRing");
    let current = 0, lockUntil = 0;
    const showStep = (i) => {
      if (i === current) return;
      current = i;
      stepTabs.forEach((b, j) => b.classList.toggle("on", i === j));
      $("#stepCount").textContent = pad(current + 1);
      stepBody.classList.add("is-swapping");
      setTimeout(() => { stepBody.innerHTML = body(C.process[current]); stepBody.classList.remove("is-swapping"); }, reduce ? 0 : 180);
    };

    // Tall wrapper = room to scroll. The whole section (label, heading, steps) is pinned inside it,
    // filling the screen height and centred, so there is no empty space while it's pinned.
    const wrap = document.createElement("div"), pin = document.createElement("div");
    wrap.className = "steps-scroll"; pin.className = "steps-pin";
    const section = stepsBox.parentNode;
    section.insertBefore(wrap, stepsBox);
    [...section.children].filter((el) => el.matches(".meta, .heading")).forEach((el) => pin.appendChild(el));
    pin.appendChild(stepsBox);
    wrap.appendChild(pin);
    const STEP = 0.55; // viewport heights of scrolling per step
    const stickyTop = () => parseFloat(getComputedStyle(pin).top) || 0;
    const size = () => { wrap.style.height = pin.offsetHeight + N * STEP * innerHeight + "px"; };
    const span = () => Math.max(wrap.offsetHeight - pin.offsetHeight, 1);
    const progress = () => Math.min(Math.max((stickyTop() - wrap.getBoundingClientRect().top) / span(), 0), 1);
    const sync = () => {
      const p = progress();
      ring.style.rotate = `${-Math.min(N - 1, Math.max(0, p * N - 0.5)) * GAP}deg`; // turns smoothly; a step sits on top in the middle of its stretch
      if (performance.now() > lockUntil) showStep(Math.min(N - 1, Math.floor(p * N)));
    };
    const goTo = (i, focus) => {
      showStep(i);
      if (focus) stepTabs[i].focus({ preventScroll: true });
      lockUntil = performance.now() + (reduce ? 0 : 900); // don't flick through the steps in between
      const top = wrap.getBoundingClientRect().top + scrollY - stickyTop() + ((i + 0.5) / N) * span();
      if (window.lenis) window.lenis.scrollTo(top, { duration: 1.1 });
      else scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    };
    stepTabs.forEach((b, i) => {
      b.addEventListener("click", () => goTo(i));
      b.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (d) { e.preventDefault(); goTo((i + d + N) % N, true); }
      });
    });
    size();
    addEventListener("resize", () => { size(); sync(); });
    addEventListener("load", () => { size(); sync(); });
    addEventListener("scroll", sync, { passive: true });
    sync();
  }

  // ------------------------------------------------------------------
  // Interactions on the rendered content
  // ------------------------------------------------------------------

  // Expertise panels: hover, focus or tap opens one panel
  const panels = $$(".panels > div");
  const openPanel = (p) => panels.forEach((x) => x.classList.toggle("is-on", x === p));
  panels.forEach((p) => ["mouseenter", "focus", "click"].forEach((ev) => p.addEventListener(ev, () => openPanel(p))));

  // Closing call to action: two Figma-style name cursors ("Kartikeyan" and "You") wander around it
  // like a shared design file (idea from kraftbase.com). Still when motion is reduced.
  const CUR_SVG = (fill, stroke) => `<svg viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.6-7.6L21 11z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  $$(".cta-block").forEach((box) => {
    box.insertAdjacentHTML("beforeend", `<div class="kcur" aria-hidden="true">${CUR_SVG("var(--acc)", "#fff")}<span>Kartikeyan</span></div><div class="kcur kcur--you" aria-hidden="true">${CUR_SVG("#f7c948", "#000")}<span>You</span></div>`);
    const [a, b] = $$(".kcur", box), spots = [[74, 26], [16, 64], [84, 70], [24, 22], [62, 80], [88, 18]];
    let k = 0;
    const wander = () => {
      const p = spots[k % spots.length], q = spots[(k + 3) % spots.length];
      a.style.left = p[0] + "%"; a.style.top = p[1] + "%"; b.style.left = q[0] + "%"; b.style.top = q[1] + "%"; k++;
    };
    wander();
    if (!reduce) setInterval(() => { const r = box.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight && !document.hidden) wander(); }, 2400);
  });

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

  // Glass pill cursor over cards (mouse only): OPEN for projects, VIEW for thumbnails / reels / podcasts,
  // IN PROGRESS for ongoing work, SAY HI on the contact card
  const CUR_ICON = {
    open: '<svg viewBox="0 0 24 24"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h3.6l2 2.2h6.4A2.5 2.5 0 0 1 20 8.7V9H7.3a2.5 2.5 0 0 0-2.4 1.8L3 17.3Z"/><path d="M6.3 11.1A1.6 1.6 0 0 1 7.8 10H21a1 1 0 0 1 1 1.3l-2 7.3a1.6 1.6 0 0 1-1.5 1.2H4.2a1 1 0 0 1-1-1.3Z"/></svg>',
    view: '<svg viewBox="0 0 24 24"><path d="M6.5 4h2.2l1 4.2A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 2.3.2l1-4.2h2.2l3.1 8.4A5 5 0 1 1 12.6 15h-1.2a5 5 0 1 1-8-2.6Zm-.6 8.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm12.2 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" fill-rule="evenodd"/></svg>',
    soon: '<svg viewBox="0 0 24 24"><path d="M8.5 2h7v2h-1v5.2l5.6 9.4A2.2 2.2 0 0 1 18.2 22H5.8a2.2 2.2 0 0 1-1.9-3.4l5.6-9.4V4h-1Zm3 2v5.8L9.8 12.7h4.4L12.5 9.8V4Z" fill-rule="evenodd"/></svg>',
    hi: '<svg viewBox="0 0 24 24"><path d="M12 3c5 0 9 3.4 9 7.6s-4 7.6-9 7.6c-1 0-2-.1-2.9-.4L4 20l1.3-4A7.2 7.2 0 0 1 3 10.6C3 6.4 7 3 12 3Z"/></svg>',
    locked: '<svg viewBox="0 0 24 24"><path d="M7 10V7.5a5 5 0 0 1 10 0V10h.5A2.5 2.5 0 0 1 20 12.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5v-7A2.5 2.5 0 0 1 6.5 10Zm2.5 0h5V7.5a2.5 2.5 0 0 0-5 0Zm2.5 4a1.6 1.6 0 0 0-.8 3v1.5h1.6V17a1.6 1.6 0 0 0-.8-3Z" fill-rule="evenodd"/></svg>',
  };
  const cards = $$(".pgrid a, .work");
  const vKind = (c) => ($(".vth", c) ? "thumbnail" : $(".vreel", c) ? "reel" : $(".vpod", c) ? "podcast" : "");
  if (cards.length && hover) {
    document.body.classList.add("has-pcur");
    const cur = document.createElement("div");
    cur.className = "pcur"; cur.setAttribute("aria-hidden", "true");
    document.body.appendChild(cur);
    let x = 0, y = 0, cx = 0, cy = 0, hw = 0, hh = 0, run = false;
    // The pill is its own glass (backdrop-filter) layer: at a fractional pixel position the browser resamples it and the
    // label goes blurry, so it is centred on the cursor in JS and snapped to whole pixels (no translate(-50%) in the CSS).
    const follow = () => {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      cur.style.left = Math.round(cx - hw) + "px"; cur.style.top = Math.round(cy - hh) + "px";
      if (run) requestAnimationFrame(follow);
    };
    cards.forEach((c) => {
      c.addEventListener("pointerenter", (e) => {
        const s = c.dataset.status, v = vKind(c), pc = c.dataset.cur;
        const k = v ? "view" : s === "soon" ? "soon" : s === "contact" ? "hi" : pc === "locked" || pc === "view" ? pc : "open";
        cur.innerHTML = CUR_ICON[k] + { view: "View", soon: "In progress", hi: "Say hi", open: "Open", locked: "Locked" }[k];
        cur.classList.toggle("is-soon", k === "soon" || k === "locked"); // locked uses the light grey glass pill too
        hw = cur.offsetWidth / 2; hh = cur.offsetHeight / 2;
        x = cx = e.clientX; y = cy = e.clientY;
        cur.classList.add("is-on");
        if (!run) { run = true; follow(); }
      });
      c.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; });
      c.addEventListener("pointerleave", () => { cur.classList.remove("is-on"); run = false; });
    });
  }

  // Locked projects (content.json "cursor": "locked", e.g. NineFlow, FinRoot): any link to them (cards, menu,
  // next-project card) doesn't open the page; a "Private project" note pops up with a link to ask for access.
  // Listens on window in the capture phase so it runs before the single-file viewer's own link handler.
  const lockedProjects = allProjects.filter((p) => p.cursor === "locked");
  if (lockedProjects.length) {
    const lockedOf = (a) => {
      if (a.dataset.cur === "locked") return allProjects.find((p) => p.id === a.id || (p.caseStudy && p.caseStudy.page && (a.getAttribute("href") || "").endsWith(p.caseStudy.page)));
      const h = (a.getAttribute("href") || "").split(/[?#]/)[0];
      return lockedProjects.find((p) => p.caseStudy && p.caseStudy.page && h.endsWith(p.caseStudy.page));
    };
    let note, noteT;
    const showNote = (p) => {
      if (!note) {
        note = document.createElement("div");
        note.className = "lnote"; note.setAttribute("role", "status"); note.setAttribute("aria-live", "polite");
        document.body.appendChild(note);
      }
      note.innerHTML = `${CUR_ICON.locked}<span><b>Private project</b><small>${esc(p.name)} isn't public yet. Ask me and I'll walk you through it.</small></span><a href="/contact.html?service=Project%20access&amp;project=${encodeURIComponent(p.name)}">Request access</a><button type="button" aria-label="Close">×</button>`;
      $("button", note).addEventListener("click", () => note.classList.remove("is-on"));
      requestAnimationFrame(() => note.classList.add("is-on"));
      clearTimeout(noteT); noteT = setTimeout(() => note.classList.remove("is-on"), 6000);
    };
    window.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || (note && note.contains(a))) return;
      const p = lockedOf(a);
      if (!p) return;
      e.preventDefault(); e.stopPropagation();
      showNote(p);
    }, true);
  }

  // Social links (Contact rows + footer): the platform logo (brand colour tile) follows the cursor.
  // In the footer the tile is smaller and sits beside the cursor so the link text stays readable.
  const socs = $$(".soc, .soc-link");
  if (socs.length && hover) {
    document.body.classList.add("has-scur");
    const sc = document.createElement("div");
    sc.className = "scur"; sc.setAttribute("aria-hidden", "true");
    document.body.appendChild(sc);
    let x = 0, y = 0, cx = 0, cy = 0, run = false;
    const follow = () => { cx += (x - cx) * 0.18; cy += (y - cy) * 0.18; sc.style.left = cx + "px"; sc.style.top = cy + "px"; if (run) requestAnimationFrame(follow); };
    socs.forEach((r) => {
      r.addEventListener("pointerenter", (e) => {
        sc.innerHTML = r.dataset.logo || $(".soc__ic", r).innerHTML;
        sc.classList.toggle("is-mini", r.classList.contains("soc-link"));
        sc.style.setProperty("--brand", r.style.getPropertyValue("--brand"));
        if (!sc.classList.contains("is-on")) { x = cx = e.clientX; y = cy = e.clientY; }
        sc.classList.add("is-on");
        if (!run) { run = true; follow(); }
      });
      r.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; });
      r.addEventListener("pointerleave", (e) => {
        if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".soc, .soc-link")) return; // moving straight to the next row
        sc.classList.remove("is-on"); run = false;
      });
    });
    // pointerleave doesn't fire when the page scrolls away under a still mouse or the pointer exits the window,
    // so re-check what's actually under the pointer and hide the tile if it's no longer over a link.
    const recheck = () => {
      if (!sc.classList.contains("is-on")) return;
      const el = document.elementFromPoint(x, y);
      if (!el || !el.closest(".soc, .soc-link")) { sc.classList.remove("is-on"); run = false; }
    };
    window.addEventListener("scroll", recheck, { passive: true });
    document.addEventListener("pointerout", (e) => { if (!e.relatedTarget) { sc.classList.remove("is-on"); run = false; } });
    window.addEventListener("blur", () => { sc.classList.remove("is-on"); run = false; });
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
  // folder zooms to fill the section with a card per tool (logo, name, what I use it for).
  // Tool logos: { style: "figma" } draws Figma's five-shape mark, { style: "tile", letters, tile, color }
  // draws an Adobe-style rounded tile, { style: "image", image } uses an uploaded logo file.
  const logoSvg = (l = {}) => l.style === "image" && l.image
    ? `<img src="${esc(l.image)}" alt="" style="width:100%;height:100%;object-fit:contain" />`
    : l.style === "figma"
    ? '<svg viewBox="0 0 38 57" aria-hidden="true"><path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/><path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/><path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/><path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/><path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/></svg>'
    : `<svg viewBox="0 0 240 234" aria-hidden="true"><rect width="240" height="234" rx="42.5" fill="${esc(l.tile)}"/><text x="120" y="160" text-anchor="middle" fill="${esc(l.color)}" font-family="Inter Tight, Arial, sans-serif" font-weight="600" font-size="118" letter-spacing="-2">${esc(l.letters)}</text></svg>`;

  // tools with group "ai" form a separate "AI tools" list below the apps when the folder is open
  const ALL = C.tools || [];
  const TOOLS = ALL.filter((t) => t.group !== "ai"), AI = ALL.filter((t) => t.group === "ai");
  const stage = $("#toolsFolder");
  if (stage && ALL.length) {
    const dense = ALL.length > 10; // icon beside text (wide screens) so everything fits the open folder
    const proList = (list, from) => `<ul class="pro${dense ? " pro--dense" : ""}" style="--cols:${Math.min(5, list.length > 5 ? Math.ceil(list.length / 2) : list.length)}">${list.map((t, k) => `<li style="--o:${from + k}"><span class="ic"><span class="logo">${logoSvg(t.logo)}</span></span><b>${esc(t.name)}</b><p>${esc(t.use)}</p></li>`).join("")}</ul>`;
    const counts = [TOOLS.length && `${TOOLS.length} apps`, AI.length && `${AI.length} AI tools`].filter(Boolean).join(" · ");
    if (!hover) $(".tfold__hint", stage).textContent = "Tap the folder, then tap the glass";
    const fan = (k) => (k % 2 ? -1 : 1) * Math.ceil(k / 2); // 0, -1, 1, -2, 2 … most used in the middle
    stage.insertAdjacentHTML("beforeend", `
      <div class="folder">
        <div class="folder__back"></div>
        <div class="folder__items" aria-hidden="true">${(TOOLS.length ? TOOLS : AI).slice(0, 5).map((t, k) => `<div class="fi" style="--i:${fan(k)};--o:${k};z-index:${5 - k}"><span class="logo">${logoSvg(t.logo)}</span><b>${esc(t.name)}</b></div>`).join("")}</div>
        <button class="folder__front" type="button" aria-expanded="false" aria-controls="toolsZoom" aria-label="Open my tools"><span>My toolkit <i>Open</i></span><span style="display:block"><b>Tools</b><br><span>${counts} · tap to see details</span></span></button>
      </div>
      <div class="zoom" id="toolsZoom" role="region" aria-label="Tools I use"><div class="zoom__in" data-lenis-prevent>
        <div class="zoom__top"><div><small>Toolkit</small><h3>Tools I use</h3></div><button class="zoom__close" type="button">Close ✕</button></div>
        ${TOOLS.length ? proList(TOOLS, 0) : ""}
        ${AI.length ? `<p class="pro__group">AI tools</p>${proList(AI, TOOLS.length)}` : ""}
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

/* ---------- Phone viewer: a project's whole MOBILE page inside a phone, behaving like the live site ----------
   For every project that has a website AND a mobile layout (Nexura, VSTAR): the web page has its own viewer,
   this one shows the phone page. Markup (each case study styles it in its own look):
     [data-pv data-w="390" data-hdr="<site header height>" data-top="<px the site scrolls before its header changes>"]
       [data-pv-in]   the scroller holding the page slices (img width/height set, so jumps land right)
       [data-pv-hdr]  the sticky header: 1st img = at the top, 2nd img = scrolled
       [data-pv-btn]  a button placed over the site's own menu icon
       [data-pv-menu] the open menu picture (hidden until the button is pressed)
   Returns a small API the page uses for its own controls (section list, play, progress). */
window.phoneView = function (root) {
  const sc = root && root.querySelector("[data-pv-in]");
  if (!sc) return null;
  const W = +root.dataset.w || 390, top = +root.dataset.top || 8, hdr = +root.dataset.hdr || 0;
  const btn = root.querySelector("[data-pv-btn]"), menu = root.querySelector("[data-pv-menu]");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  sc.setAttribute("data-lenis-prevent", "");   // the phone scrolls on its own, not with the page
  const k = () => sc.clientWidth / W;
  const subs = [];
  const tick = () => { root.classList.toggle("is-scrolled", sc.scrollTop > top * k()); subs.forEach((f) => f()); };
  const eager = () => sc.querySelectorAll("img[loading=lazy]").forEach((i) => { i.loading = "eager"; });
  const setMenu = (open) => {
    root.classList.toggle("is-menu", open);
    if (menu) menu.hidden = !open;
    if (btn) { btn.setAttribute("aria-expanded", String(open)); btn.setAttribute("aria-label", open ? "Close the site's menu" : "Open the site's menu"); }
  };
  if (btn) btn.addEventListener("click", () => { root.classList.add("is-used"); setMenu(!root.classList.contains("is-menu")); });
  if (menu) menu.addEventListener("click", () => setMenu(false));
  root.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("is-menu")) { setMenu(false); if (btn) btn.focus(); } });
  sc.addEventListener("scroll", tick, { passive: true });
  addEventListener("resize", tick);
  const api = {
    sc, k, eager, reduce, menu: setMenu,
    progress: () => { const m = sc.scrollHeight - sc.clientHeight; return m > 0 ? Math.min(1, sc.scrollTop / m) : 0; },
    // y = a section's top on the live mobile page (site px); lands just under the sticky header
    jump: (y) => { setMenu(false); eager(); sc.scrollTo({ top: Math.max(0, (y > 0 ? y - hdr : 0) * k()), behavior: reduce ? "auto" : "smooth" }); },
    // index of the section on screen, from a list of section tops (site px)
    current: (ys) => { const at = sc.scrollTop / k() + hdr + sc.clientHeight / k() * .3; let c = 0; ys.forEach((y, i) => { if (y <= at) c = i; }); return c; },
    on: (f) => { subs.push(f); f(); },
  };
  tick();
  return api;
};

// SAMPLE · Curved work gallery for Home "Selected works" (idea from ozgur.design).
// Scrolling down moves a row of project screens sideways; the screen in the middle sits flat and the ones
// at the sides turn in, like a curved wall. The caption under the middle names the project.
// Phones, touch screens and reduced motion get a plain sideways swipe with the same caption.
(function () {
  var G = "samples/assets/gallery/";
  var GROUPS = [
    { name: "NineFlow", sub: "Own product · planner, focus timer & work log", note: "Shipped on web, Windows & Android", color: "#FF6A13", href: "sample-nineflow.html",
      shots: [["nf-1", 1440, 900], ["nf-2", 1440, 900], ["nf-3", 462, 1000]] },
    { name: "FinRoot", sub: "Own product · one money plan for the family", note: "Seven buckets, one shared calendar", color: "#3FC495", href: "sample-finroot.html",
      shots: [["fr-1", 1440, 670], ["fr-2", 1440, 560], ["fr-3", 462, 1000]] },
    { name: "Nexura", sub: "Brand identity & 25-page website", note: "Designed and built for Nexura Infotech", color: "#7AACFF", href: "sample-nexura.html",
      shots: [["nx-1", 1600, 1000], ["nx-2", 1600, 1000], ["nx-3", 462, 1000]] },
    { name: "RESPAY", sub: "Money saving app · UI/UX", note: "Budgets, goals and savings in one place", color: "#8D97FF", href: "sample-respay.html",
      shots: [["rp-1", 559, 1000], ["rp-2", 561, 1000], ["rp-3", 570, 1000]] },
  ];

  function build(root) {
    var panels = [];
    var track = root.querySelector(".wgal__track");
    GROUPS.forEach(function (g, gi) {
      g.shots.forEach(function (s, si) {
        var a = document.createElement("a");
        a.className = "wgal__p" + (si === 0 && gi > 0 ? " is-first" : "");
        a.href = g.href;
        a.style.setProperty("--ar", s[1] / s[2]);
        a.style.setProperty("--c", g.color);
        a.setAttribute("aria-label", "Open the " + g.name + " case study");
        if (si) a.tabIndex = -1; // one tab stop per project
        a.innerHTML = '<img src="' + G + s[0] + '.jpg" alt="" decoding="async" />';
        a.dataset.g = gi;
        track.appendChild(a);
        panels.push(a);
      });
    });
    var rail = root.querySelector(".wgal__ticks");
    rail.innerHTML = GROUPS.map(function (g, i) { return '<li style="--c:' + g.color + '"><span>' + String(i + 1).padStart(2, "0") + "</span></li>"; }).join("");
    return panels;
  }

  function init() {
    var root = document.getElementById("wgal");
    if (!root) return;
    var panels = build(root);
    var stage = root.querySelector(".wgal__stage"), track = root.querySelector(".wgal__track");
    var cap = root.querySelector(".wgal__cap"), capName = cap.querySelector("b"), capSub = cap.querySelector("span"),
      capNote = cap.querySelector("em"), capNo = cap.querySelector("small"), ticks = root.querySelectorAll(".wgal__ticks li"),
      bar = root.querySelector(".wgal__bar i");
    var flat = matchMedia("(max-width: 760px), (hover: none), (prefers-reduced-motion: reduce)");
    var active = -1, x0 = 0, x1 = 0, ticking = false;

    function setCaption(gi) {
      if (gi === active) return;
      active = gi;
      var g = GROUPS[gi];
      cap.classList.remove("is-in"); void cap.offsetWidth; cap.classList.add("is-in");
      cap.style.setProperty("--c", g.color);
      capName.textContent = g.name; capSub.textContent = g.sub; capNote.textContent = g.note;
      capNo.textContent = String(gi + 1).padStart(2, "0") + " / " + String(GROUPS.length).padStart(2, "0");
      ticks.forEach(function (t, i) { t.classList.toggle("is-on", i === gi); });
    }

    function measure() {
      root.classList.toggle("is-flat", flat.matches);
      track.style.transform = "";
      panels.forEach(function (p) { p.style.transform = ""; p.style.filter = ""; });
      if (flat.matches) { root.style.height = ""; return; }
      var vw = stage.clientWidth;
      var first = panels[0], last = panels[panels.length - 1];
      x0 = vw / 2 - (first.offsetLeft + first.offsetWidth / 2);
      x1 = vw / 2 - (last.offsetLeft + last.offsetWidth / 2);
      root.style.height = (innerHeight + (x0 - x1) * 0.9) + "px";
      frame();
    }

    function frame() {
      ticking = false;
      if (flat.matches) return;
      var r = root.getBoundingClientRect();
      var span = root.offsetHeight - innerHeight;
      var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      var x = x0 + (x1 - x0) * p;
      track.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
      bar.style.transform = "scaleY(" + p.toFixed(4) + ")";
      var vw = stage.clientWidth, mid = vw / 2, best = 1e9, bestG = 0;
      panels.forEach(function (el) {
        var c = el.offsetLeft + el.offsetWidth / 2 + x;
        var d = (c - mid) / mid; // -1 left edge · 0 middle · 1 right edge
        var ad = Math.min(Math.abs(d), 1.6);
        var rot = Math.max(-34, Math.min(34, -d * 30));
        var z = -ad * 60;
        el.style.transform = "translate3d(0,0," + z.toFixed(1) + "px) rotateY(" + rot.toFixed(2) + "deg)";
        el.style.setProperty("--k", Math.min(1, Math.max(0, ad - 0.25)).toFixed(3));
        if (Math.abs(c - mid) < best) { best = Math.abs(c - mid); bestG = +el.dataset.g; }
      });
      setCaption(bestG);
    }

    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

    // Phones / reduced motion: caption follows the swipe
    track.addEventListener("scroll", function () {
      if (!flat.matches) return;
      var mid = track.scrollLeft + track.clientWidth / 2, best = 1e9, bestG = 0;
      panels.forEach(function (el) { var c = el.offsetLeft + el.offsetWidth / 2, dd = Math.abs(c - mid); if (dd < best) { best = dd; bestG = +el.dataset.g; } });
      setCaption(bestG);
    }, { passive: true });

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", measure);
    (flat.addEventListener ? flat.addEventListener("change", measure) : flat.addListener(measure));
    panels.forEach(function (p) { var im = p.querySelector("img"); if (im.decode) im.decode().catch(function () {}); });
    setCaption(0);
    measure();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

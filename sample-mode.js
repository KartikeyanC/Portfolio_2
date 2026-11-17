// SAMPLE MODE — loaded only by the sample-*.html pages (not published: publish.py copies only the real pages).
// It changes what the pages read from content.json for this visit only (nothing is saved), and keeps every
// link inside the sample pages, so the whole portfolio can be clicked through with the proposed changes.
//
// Every proposed change can be switched off, so samples/choose.html can preview any mix of them:
//   sample-index.html?off=works,stickers   (the choice is remembered in localStorage for the other pages)
//   years · works · clients · strip · stickers · herofix · call
(function () {
  var KEY = "content-json";
  var PAGES = ["index", "about", "projects", "services", "contact", "case", "posters",
    "ifortigo", "myshoptill", "nexura", "respay", "vstar", "nineflow", "finroot"];
  var FEATURED = ["nineflow", "finroot", "nexura", "respay"]; // Home → Selected works, in this order
  var FLAGS = ["years", "works", "clients", "strip", "stickers", "herofix", "call"];

  // Which changes are switched off
  var off = [];
  try {
    var q = new URLSearchParams(location.search);
    if (q.has("off")) { off = q.get("off").split(",").filter(function (f) { return FLAGS.indexOf(f) !== -1; }); localStorage.setItem("sample-off", off.join(",")); }
    else off = (localStorage.getItem("sample-off") || "").split(",").filter(Boolean);
  } catch (e) {}
  var isOff = function (f) { return off.indexOf(f) !== -1; };
  off.forEach(function (f) { document.documentElement.classList.add("off-" + f); });

  try { sessionStorage.removeItem(KEY); } catch (e) {}
  addEventListener("pagehide", function () { try { sessionStorage.removeItem(KEY); } catch (e) {} });

  function patch(c) {
    // 1 · Experience: 3+ years everywhere
    if (!isOff("years")) c = JSON.parse(JSON.stringify(c).split("14+ years").join("3+ years").split('"years":"14+"').join('"years":"3+"'));
    var list = c.projects || [];
    // 2 · Selected works: own products first, then Nexura and RESPAY; nothing else featured
    if (!isOff("works")) {
      list.forEach(function (p) { p.featured = FEATURED.indexOf(p.id) !== -1; });
      var first = FEATURED.map(function (id) { return list.find(function (p) { return p.id === id; }); }).filter(Boolean);
      c.projects = first.concat(list.filter(function (p) { return FEATURED.indexOf(p.id) === -1; }));
    }
    // 3 · Case-study links point at the sample copies
    c.projects.forEach(function (p) {
      if (p.caseStudy && p.caseStudy.page && !/^sample-/.test(p.caseStudy.page)) p.caseStudy.page = "sample-" + p.caseStudy.page;
    });
    return c;
  }

  var realFetch = window.fetch.bind(window);
  window.fetch = function (u, o) {
    if (String(u).indexOf("content.json") === -1) return realFetch(u, o);
    return realFetch(u, o).then(function (r) { return r.json(); }).then(function (c) {
      return new Response(JSON.stringify(patch(c)), { status: 200, headers: { "Content-Type": "application/json" } });
    });
  };

  // Keep links inside the sample: about.html → sample-about.html (also /about.html, ?query and #hash)
  var re = new RegExp("^/?(" + PAGES.join("|") + ")\\.html(?=$|[?#])");
  function fix(a) {
    var h = a.getAttribute("href");
    if (!h || h.indexOf("sample-") !== -1) return;
    if (h === "/" || h === "./") { a.setAttribute("href", "sample-index.html"); return; }
    if (re.test(h)) a.setAttribute("href", h.replace(re, "sample-$1.html"));
  }
  function fixAll(root) { (root.querySelectorAll ? root : document).querySelectorAll("a[href]").forEach(fix); }
  document.addEventListener("DOMContentLoaded", function () {
    // switched-off changes: hide the new version [data-x], show the live one [data-x-old]
    FLAGS.forEach(function (f) {
      document.querySelectorAll('[data-x="' + f + '"]').forEach(function (el) { el.hidden = isOff(f); });
      document.querySelectorAll('[data-x-old="' + f + '"]').forEach(function (el) { el.hidden = !isOff(f); });
      if (isOff(f)) document.querySelectorAll('[data-needs="' + f + '"]').forEach(function (el) { el.hidden = true; });
    });
    fixAll(document);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches("a[href]")) fix(n); fixAll(n); } });
        if (m.type === "attributes" && m.target.matches && m.target.matches("a[href]")) fix(m.target);
      });
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    var lg = document.getElementById("xsLegend");
    if (lg && innerWidth >= 900 && /sample-index/.test(location.pathname) && window.top === window) lg.open = true;
  });
})();

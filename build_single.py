"""Build the whole portfolio into ONE html file:  dist/kartikeyan-portfolio.html

    python build_single.py            build once
    python build_single.py --watch    rebuild on every saved change
    python build_single.py --lock     password-protected copy that stops opening after 24 hours
                                      (options: --password yourword  --hours 24)
    (python serve.py also rebuilds it automatically while the local server runs)

Every page (Home, About, Projects, Services, Contact, case studies, 404), the CSS, main.js,
content.json, the smooth-scroll library and all pictures found in assets/images/ are packed
inside that single file, so it opens straight from a folder, a USB stick or an email attachment.
Run it again after changing anything to get a fresh copy. Fonts still load from the web
(without internet the page falls back to system fonts).
"""
import base64, json, mimetypes, pathlib, re, urllib.request

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "dist" / "kartikeyan-portfolio.html"
PAGES = ["index.html", "about.html", "projects.html", "services.html", "contact.html", "case.html", "respay.html", "vstar.html", "nexura.html", "ifortigo.html", "myshoptill.html", "posters.html", "404.html"]
IMG = ROOT / "assets" / "images"
EXTS = [".jpg", ".png", ".webp", ".jpeg"]
LENIS = "https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.min.js"
_lenis = ""


def data_uri(path: pathlib.Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def find(base: pathlib.Path, exts=EXTS):
    """assets/images/.../<name> with the first extension that exists (same order the site tries)."""
    for e in exts:
        f = base.with_name(base.name + e)
        if f.exists():
            return f
    return None


CARD_WIDTHS = [640, 960, 1400, 2000]  # same list as COVER_W in js/main.js


def card_covers():
    """Project covers are exported big (3000-4000 px) for the case-study hero. Shrunk 5-8x by the browser into a
    ~450 px project card they go soft, so every cover gets sharp pre-shrunk copies next to it
    (cover@640.jpg ... cover@2000.jpg: Lanczos, light sharpening, full-colour JPEG) that the cards load through srcset.
    A copy is remade whenever cover.* changes (the cover's md5 is kept in the copy's JPEG comment).
    Needs Pillow (pip install pillow); without it nothing is made and the cards just load cover.*"""
    try:
        from PIL import Image, ImageFilter, ImageOps
    except ImportError:
        return
    import hashlib
    for d in sorted(p for p in (IMG / "projects").glob("*") if p.is_dir()):
        src = find(d / "cover")
        if not src:
            continue
        tag, im = hashlib.md5(src.read_bytes()).hexdigest().encode(), None
        with Image.open(src) as head:
            full_w = head.width
        for w in CARD_WIDTHS:
            out = d / f"cover@{w}.jpg"
            if w >= full_w:  # cover smaller than this size: no copy (the browser falls back to cover.*)
                out.unlink(missing_ok=True)
                continue
            if out.exists():
                try:
                    with Image.open(out) as o:
                        if o.info.get("comment") == tag:
                            continue
                except Exception:
                    pass
            if im is None:
                im = ImageOps.exif_transpose(Image.open(src))
                if im.mode in ("RGBA", "LA", "P"):
                    im = im.convert("RGBA")
                    bg = Image.new("RGB", im.size, "white"); bg.paste(im, mask=im.getchannel("A")); im = bg
                im = im.convert("RGB")
            small = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            small = small.filter(ImageFilter.UnsharpMask(radius=0.6, percent=60, threshold=1))
            small.save(out, "JPEG", quality=88, optimize=True, progressive=True, subsampling=0, comment=tag)
            print(f"  card copy: {out.relative_to(ROOT)}", flush=True)


def local(src: str):
    """A /assets/... or assets/... path from content.json → the file on disk (or None)."""
    if not src or src.startswith(("data:", "http:", "https:")):
        return None
    f = ROOT / src.lstrip("/").split("?")[0]
    return f if f.exists() else None


def embed_content(c: dict) -> dict:
    """Put every picture the site would pick up into content.json itself, as data: URIs."""
    fix = lambda src: data_uri(local(src)) if local(src) else src
    for p in c.get("projects", []):
        pic = local(p.get("image", "")) or find(IMG / "projects" / p["id"] / "cover")
        if pic and not local(p.get("image", "")):  # the folder's cover.* → its card-size copies too (main.js: coverSet)
            copies = [(f, w) for w in CARD_WIDTHS if (f := IMG / "projects" / p["id"] / f"cover@{w}.jpg").exists()]
            if copies:
                p["imageSet"] = ", ".join(f"{data_uri(f)} {w}w" for f, w in copies)
        if pic:
            p["image"] = data_uri(pic)
        cs = p.get("caseStudy") or {}
        if cs:
            gal = [fix(g) for g in cs.get("gallery", []) if g]
            if not gal:
                n = 1
                while (f := find(IMG / "projects" / p["id"] / "gallery" / str(n))):
                    gal.append(data_uri(f)); n += 1
            cs["gallery"] = gal
            for ft in cs.get("features", []) or []:
                if ft.get("image"):
                    ft["image"] = fix(ft["image"])
            # process boards, full-page screens and presentation slides (added later to the case study template)
            for st in (cs.get("process", []) or []) + (cs.get("screens", []) or []):
                if st.get("image"):
                    st["image"] = fix(st["image"])
            if cs.get("slides"):
                cs["slides"] = [fix(s) for s in cs["slides"] if s]
    v = c.get("video") or {}
    for i, t in enumerate(v.get("thumbnails", []) or []):
        pic = local(t.get("image", "")) or find(IMG / "video" / "thumbnails" / str(i + 1))
        if pic: t["image"] = data_uri(pic)
    for i, r in enumerate(v.get("reels", []) or []):
        vid = local(r.get("video", "")) or find(IMG / "video" / "reels" / str(i + 1), [".mp4"])
        if vid: r["video"] = data_uri(vid)
        pic = local(r.get("poster", "")) or find(IMG / "video" / "reels" / str(i + 1))
        if pic: r["poster"] = data_uri(pic)
    for i, p in enumerate(v.get("podcasts", []) or []):
        pic = local(p.get("poster", "")) or find(IMG / "video" / "podcasts" / str(i + 1))
        if pic: p["poster"] = data_uri(pic)
    sr = v.get("showreel") or {}
    pic = local(sr.get("poster", "")) or find(IMG / "video" / "showreel" / "poster")
    if pic: sr["poster"] = data_uri(pic)
    for t in c.get("tools", []) or []:
        logo = t.get("logo") or {}
        if isinstance(logo, dict) and logo.get("image"):
            logo["image"] = fix(logo["image"])
    return c


def patch_js(js: str) -> str:
    """main.js reads its content, page name and query from the page address; in the single file
    those come from window.__SITE_CONTENT__ and window.__LOC (set per page by the shell)."""
    swaps = [
        ('try { cached = sessionStorage.getItem(CACHE); } catch (e) {}', ""),
        # nothing is read back from the visit cache here, and the embedded content is far too big for it anyway
        ('const remember = (txt) => { try { sessionStorage.setItem(CACHE, txt); } catch (e) {} };', "const remember = () => {};"),
        ('fetch("/content.json", { cache: "no-cache" }).then((res) => { if (!res.ok) throw new Error(res.status); return res.text(); })',
         "Promise.resolve(window.__SITE_CONTENT__)"),
        ("location.pathname", "__LOC.pathname"),
        ("location.search", "__LOC.search"),
        ("location.hash", "__LOC.hash"),
    ]
    for a, b in swaps:
        if a not in js:
            raise SystemExit(f"build_single.py: main.js changed, can't find: {a[:60]}")
        js = js.replace(a, b)
    return js


def page_doc(html: str) -> str:
    """One page's HTML with its external files replaced by markers the shell fills in."""
    html = re.sub(r'<link rel="stylesheet" href="/?css/style\.css" />', "<!--@CSS-->", html)
    html = re.sub(r'<script src="/?js/main\.js"></script>', "<!--@JS-->", html)
    html = re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/lenis[^"]*"[^>]*></script>', "<!--@LENIS-->", html)
    html = re.sub(r'\s*<link rel="icon" href="/?favicon\.ico"[^>]*>', "", html)
    html = re.sub(r'\s*<link rel="apple-touch-icon"[^>]*>', "", html)
    html = re.sub(r'<link rel="icon" href="/?assets/favicon\.svg"', '<link rel="icon" href="<!--@ICON-->"', html)
    html = re.sub(r'\s*<link rel="expect"[^>]*>', "", html)
    # static image paths written in a page (e.g. respay.html) become data URIs so the single file works offline
    def _img(m):
        f = ROOT / "assets" / "images" / m.group(2)
        return m.group(1) + data_uri(f) if f.is_file() else m.group(0)
    html = re.sub(r"""(["'])/?assets/images/([^"'\s]+?\.(?:jpg|jpeg|png|webp|svg))""", _img, html)
    html = html.replace("decodeURIComponent(location.pathname)", "decodeURIComponent(__LOC.pathname)")
    for m in ("<!--@CSS-->", "<!--@JS-->"):
        if m not in html:
            raise SystemExit(f"build_single.py: a page is missing its {m} tag")
    return html


def main(lock=None):
    card_covers()
    content = embed_content(json.loads((ROOT / "content.json").read_text(encoding="utf-8")))
    css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
    js = patch_js((ROOT / "js" / "main.js").read_text(encoding="utf-8"))
    global _lenis
    if not _lenis:  # downloaded once per run (watch mode rebuilds reuse it)
        try:
            _lenis = urllib.request.urlopen(LENIS, timeout=20).read().decode("utf-8")
        except Exception as e:  # no internet while building → the page just uses normal scrolling
            print("  (smooth-scroll library not downloaded:", e, ")")
    lenis = _lenis
    icon = data_uri(ROOT / "assets" / "favicon.svg")
    pages = {p: page_doc((ROOT / p).read_text(encoding="utf-8")) for p in PAGES}
    title = re.search(r"<title>(.*?)</title>", pages["index.html"]).group(1)

    bundle = {"content": json.dumps(content, ensure_ascii=False), "css": css, "js": js, "lenis": lenis, "icon": icon, "pages": pages}
    if lock:
        return build_locked(bundle, title, icon, **lock)
    payload = json.dumps(bundle, ensure_ascii=False).replace("</", "<\\/")  # safe inside <script>

    shell = SHELL.replace("__VIEWER__", VIEWER).replace("__TITLE__", title).replace("__ICON__", icon).replace("__PAYLOAD__", payload)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(shell, encoding="utf-8")
    print(f"Built {OUT.relative_to(ROOT)}  ({OUT.stat().st_size / 1024 / 1024:.2f} MB, {len(pages)} pages)", flush=True)


# The single file: a full-screen frame that shows one page at a time. The address keeps the page in
# the hash (…/kartikeyan-portfolio.html#/projects.html), so Back / Forward and bookmarks work.
SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>__TITLE__</title>
<link rel="icon" href="__ICON__" type="image/svg+xml" />
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}</style>
</head>
<body>
<iframe id="site" title="Kartikeyan portfolio"></iframe>
<script id="bundle" type="application/json">__PAYLOAD__</script>
<script>
__VIEWER__
startSite(JSON.parse(document.getElementById("bundle").textContent));
</script>
</body>
</html>
"""


# The page viewer shared by the open and the locked file: shows one page at a time in a full-screen frame.
VIEWER = """const startSite = (B) => {
  let live = document.getElementById("site"), pending = null, started = false;
  const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const known = Object.keys(B.pages);
  const END = "<" + "/script>"; // written in two parts so this script block doesn't end early
  const esc = (s) => s.replace(/<\\/script/gi, "<\\\\/script");
  // The content (every project picture embedded, ~55 MB) is kept here once. Each page reads it from its parent
  // (window.__SITE_CONTENT__=parent.__SITE_CONTENT__) instead of getting its own copy written into its HTML,
  // which made every page change re-parse all of it (5-10 s even for a small page like Services).
  window.__SITE_CONTENT__ = B.content;

  // Which page an address points to: "about.html", "/case.html?p=milton", "projects.html#video", "/" …
  const parse = (href) => {
    const m = String(href).match(/^(?:\\.?\\/)?([\\w-]*\\.html)?(\\?[^#]*)?(#.*)?$/);
    if (!m) return null;
    const page = m[1] || "index.html";
    return { page: known.includes(page) ? page : "404.html", search: m[2] || "", hash: m[3] || "" };
  };
  const route = () => parse(decodeURIComponent(location.hash.replace(/^#\\/?/, "")) || "index.html") || { page: "index.html", search: "", hash: "" };

  const build = (r) => {
    const loc = { pathname: "/" + (r.page === "404.html" ? "missing-page" : r.page), search: r.search, hash: r.hash };
    // links inside the page: other pages stay in this file, everything else (mailto, other sites) works normally
    const nav = `document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href]");if(!a||e.defaultPrevented||a.target==="_blank"||e.ctrlKey||e.metaKey||e.shiftKey)return;var h=a.getAttribute("href");if(/^(?:[a-z]+:|\\\\/\\\\/)/i.test(h))return;if(h.charAt(0)==="#"){var t=document.getElementById(decodeURIComponent(h.slice(1)));if(t){e.preventDefault();t.scrollIntoView({behavior:"smooth"});}return;}e.preventDefault();parent.__go(h);},true);`;
    return B.pages[r.page]
      .replace("<!--@CSS-->", () => "<style>" + B.css + "</style>")
      .replace("<!--@ICON-->", () => B.icon)
      .replace("<!--@LENIS-->", () => (B.lenis ? '<script id="lenisLib">' + esc(B.lenis) + END : ""))
      .replace("<!--@JS-->", () => "<script>window.__LOC=" + JSON.stringify(loc) + ";window.__SITE_CONTENT__=parent.__SITE_CONTENT__;" + nav + END + "<script>" + esc(B.js) + END);
  };

  // Opening a project = the OLD transition (as css/style.css does for the "project" view-transition type): the old
  // page fades out, the case study fades in with a small lift, and the picture of the card you clicked flies into
  // the case study header (cropped, never stretched, in a rounded frame that morphs between the two shapes).
  const openProject = (old, f, d, done) => {
    // the case study header picture (its style text may read "name: shot-x" once the page has touched it)
    const to = d.querySelector('[style*="view-transition-name"][style*="shot-"]');
    if (!to) return false;
    const id = to.getAttribute("style").split("shot-")[1].split(";")[0].trim();
    const od = old.contentDocument, vh = innerHeight;
    const from = od && [...od.querySelectorAll("img[data-shot]")].find((i) => {   // the card's picture, if it is on screen
      if (i.getAttribute("data-shot").replace(/[^A-Za-z0-9_-]/g, "") !== id) return false;
      const b = i.getBoundingClientRect(); return b.width > 0 && b.bottom > 0 && b.top < vh;
    });
    const bg = d.defaultView.getComputedStyle(d.body).backgroundColor;
    document.documentElement.style.background = bg && bg !== "rgba(0, 0, 0, 0)" ? bg : "";   // no dark flash on light pages
    const runs = [];
    old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
    runs.push(f.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: 80, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }).finished);
    f.style.clipPath = "";
    const pic = (el) => (el.tagName === "IMG" ? el : el.querySelector("img"));
    const copy = (img) => {   // the picture as its page already shows it, so the flight starts at once
      if (!img || !img.naturalWidth) return null;
      const c = document.createElement("canvas"), k = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      try { c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); } catch (e) { return null; }
      c.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:" + img.ownerDocument.defaultView.getComputedStyle(img).objectPosition;
      return c;
    };
    const a = from && copy(from), z = from && copy(pic(to));
    let fly = null;
    if (a && z) {
      const A = from.getBoundingClientRect(), Z = to.getBoundingClientRect();
      const box = (b) => ({ transform: "translate(" + b.left + "px," + b.top + "px)", width: b.width + "px", height: b.height + "px" });
      const t = { duration: 700, easing: "cubic-bezier(.65,0,.15,1)", fill: "both" };
      fly = document.createElement("div");
      fly.style.cssText = "position:fixed;left:0;top:0;z-index:5;overflow:hidden;border-radius:22px;pointer-events:none";
      fly.append(a, z); document.body.append(fly);
      from.style.visibility = "hidden"; to.style.visibility = "hidden";
      runs.push(fly.animate([box(A), box(Z)], t).finished, z.animate([{ opacity: 0 }, { opacity: 1 }], t).finished);
    }
    const end = () => { if (fly) fly.remove(); to.style.visibility = ""; document.documentElement.style.background = ""; done(); };
    Promise.all(runs).then(end, end);
    return true;
  };

  // Moving between pages = the site's page transition (css/style.css "Page transitions"): the next page loads in a
  // second frame on top, hidden; then the old page darkens and sinks while the new one wipes down from the top,
  // washed out at first, and comes up to full strength. Opening a project uses openProject above instead.
  // The first page and reduced motion just appear.
  const show = () => {
    const r = route();
    if (pending) pending.remove();
    let f = live, old = null;
    if (started) {
      old = live;
      f = pending = document.createElement("iframe");
      f.title = old.title; f.style.display = "block"; f.style.clipPath = "inset(0 0 100% 0)";
      old.after(f);
    }
    started = true;
    f.onload = () => {
      const d = f.contentDocument;
      if (d) document.title = d.title;
      if (r.hash && d) { const t = d.getElementById(decodeURIComponent(r.hash.slice(1))); if (t) setTimeout(() => t.scrollIntoView(), 60); }
      f.focus();
      if (!old) return;
      pending = null; live = f;
      const done = () => { old.remove(); f.style.clipPath = ""; f.getAnimations().forEach((a) => a.cancel()); };
      if (calm || !f.animate) return done();
      if (d && openProject(old, f, d, done)) return;
      const light = d && d.documentElement.dataset.theme === "light";
      old.animate([{ transform: "none", filter: "none" }, { transform: "translateY(5vh)", filter: "brightness(.12)" }], { duration: 500, easing: "cubic-bezier(.45,0,.8,.4)", fill: "forwards" });
      f.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 380, delay: 100, easing: "cubic-bezier(.7,0,.25,1)", fill: "both" });
      f.animate([{ filter: light ? "contrast(.065) brightness(1.81)" : "brightness(.15)" }, { filter: "none" }], { duration: 500, delay: 380, easing: "cubic-bezier(.3,0,.2,1)", fill: "both" })
        .finished.then(done, done);
    };
    f.srcdoc = build(r);
  };
  window.__go = (href) => {
    const r = parse(href);
    if (!r) return;
    const next = "#/" + r.page + r.search + r.hash;
    if (location.hash === next) show(); else location.hash = next;
  };
  addEventListener("hashchange", show);
  show();
};"""


LOCKED = ROOT / "dist" / "kartikeyan-portfolio-locked.html"
ITERATIONS = 310000  # PBKDF2-SHA256 rounds (slows down password guessing)

# Encryption runs in Node.js (built-in crypto, nothing to install): AES-256-GCM with a key made from the
# password by PBKDF2-SHA256 — the same algorithms the browser's WebCrypto uses to open the file.
NODE_ENCRYPT = r"""
const c = require("crypto"); let d = "";
process.stdin.on("data", (x) => (d += x)).on("end", () => {
  const { password, text, iterations } = JSON.parse(d);
  const salt = c.randomBytes(16), iv = c.randomBytes(12);
  const key = c.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const ci = c.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([ci.update(text, "utf8"), ci.final(), ci.getAuthTag()]);
  process.stdout.write(JSON.stringify({ salt: salt.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64") }));
});
"""


def build_locked(bundle, title, icon, password=None, hours=24):
    """dist/kartikeyan-portfolio-locked.html: the same site, encrypted. It asks for the password and stops
    opening once the expiry time has passed. The expiry is sealed inside the encrypted data, so it can't be
    edited out of the file (only fooled by setting the viewer's computer clock back)."""
    import secrets, subprocess, time, datetime
    if not password:
        alphabet = "abcdefghjkmnpqrstuvwxyz23456789"  # no look-alikes (l/1, o/0)
        password = "-".join("".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(3))
    exp = int((time.time() + hours * 3600) * 1000)
    plain = json.dumps({"exp": exp, "bundle": bundle}, ensure_ascii=False)
    res = subprocess.run(["node", "-e", NODE_ENCRYPT], input=json.dumps({"password": password, "text": plain, "iterations": ITERATIONS}),
                         capture_output=True, text=True, encoding="utf-8")
    if res.returncode:
        raise SystemExit("build_single.py: encryption needs Node.js — " + res.stderr.strip())
    enc = json.loads(res.stdout)
    data = json.dumps({**enc, "exp": exp, "iter": ITERATIONS})
    html = LOCK_SHELL.replace("__VIEWER__", VIEWER).replace("__TITLE__", title).replace("__ICON__", icon).replace("__DATA__", data)
    LOCKED.parent.mkdir(exist_ok=True)
    LOCKED.write_text(html, encoding="utf-8")
    until = datetime.datetime.fromtimestamp(exp / 1000).strftime("%d %b %Y, %I:%M %p")
    print(f"Built {LOCKED.relative_to(ROOT)}  ({LOCKED.stat().st_size / 1024 / 1024:.2f} MB)")
    print(f"  Password : {password}")
    print(f"  Opens until: {until} (your computer's time)")
    print("  Send the file and the password separately (e.g. file by email, password by WhatsApp).")


# Locked file: a password screen first; the site is decrypted in the browser only with the right
# password and only before the expiry time.
LOCK_SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>__TITLE__</title>
<link rel="icon" href="__ICON__" type="image/svg+xml" />
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden;color:#fff;font:16px/1.5 "Inter Tight",system-ui,-apple-system,"Segoe UI",sans-serif}
iframe{position:fixed;inset:0;width:100%;height:100%;border:0;display:none}
.gate{position:fixed;inset:0;display:grid;place-items:center;padding:20px;background:radial-gradient(60% 60% at 70% 80%,rgba(30,155,255,.35),transparent 70%),#000}
.card{width:min(420px,100%);padding:34px 30px;border-radius:22px;background:#0f0f11;border:1px solid rgba(255,255,255,.1);box-shadow:0 30px 80px rgba(0,0,0,.5);text-align:center}
.card img{width:64px;height:64px}
.card h1{margin:16px 0 6px;font-size:24px;letter-spacing:.02em;text-transform:uppercase}
.card p{margin:0 0 22px;color:#b5b5b5;font-size:15px}
.card form{display:flex;gap:10px}
.card input{flex:1;min-width:0;padding:14px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:#050505;color:#fff;font:inherit;outline:none}
.card input:focus{border-color:#1e9bff;box-shadow:0 0 0 3px rgba(30,155,255,.25)}
.card button{padding:14px 20px;border:0;border-radius:10px;background:#1e9bff;color:#fff;font:600 15px inherit;cursor:pointer}
.card button:disabled{opacity:.6;cursor:wait}
.msg{min-height:22px;margin:14px 0 0;font-size:14px;color:#ff8a8a}
.card small{display:block;margin-top:18px;color:#8c8c8c;font-size:13px}
</style>
</head>
<body>
<div class="gate" id="gate">
  <div class="card">
    <img src="__ICON__" alt="" />
    <h1>Kartikeyan · Portfolio</h1>
    <p id="lead">This portfolio is private. Enter the password you received.</p>
    <form id="form"><input id="pw" type="password" autocomplete="off" placeholder="Password" aria-label="Password" required /><button id="go" type="submit">Open</button></form>
    <div class="msg" id="msg" role="alert"></div>
    <small id="until"></small>
  </div>
</div>
<iframe id="site" title="Kartikeyan portfolio"></iframe>
<script>
__VIEWER__
(() => {
  const D = __DATA__;
  const $ = (id) => document.getElementById(id);
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const when = (t) => new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const expired = () => {
    $("form").remove(); $("until").remove();
    $("lead").textContent = "This copy has expired. Please ask Kartikeyan for a new one.";
  };
  if (Date.now() > D.exp) return expired();
  $("until").textContent = "Available until " + when(D.exp);
  if (!window.crypto || !crypto.subtle) { $("msg").textContent = "Please open this file in an up-to-date browser (Chrome, Edge, Safari or Firefox)."; return; }
  $("pw").focus();
  $("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("go").disabled = true; $("msg").textContent = "";
    try {
      const base = await crypto.subtle.importKey("raw", new TextEncoder().encode($("pw").value), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(D.salt), iterations: D.iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(D.iv) }, key, b64(D.ct));
      const box = JSON.parse(new TextDecoder().decode(plain));
      if (Date.now() > box.exp) return expired();
      $("gate").remove();
      $("site").style.display = "block";
      startSite(box.bundle);
    } catch (err) {
      $("msg").textContent = "Wrong password. Please try again.";
      $("go").disabled = false; $("pw").select();
    }
  });
})();
</script>
</body>
</html>
"""


def sources():
    """Every file that ends up inside the single file."""
    files = [ROOT / p for p in PAGES] + [ROOT / "css" / "style.css", ROOT / "js" / "main.js", ROOT / "content.json", ROOT / "assets" / "favicon.svg"]
    files += [f for f in IMG.rglob("*") if f.is_file()] if IMG.exists() else []
    return files


def snapshot():
    return {str(f): f.stat().st_mtime for f in sources() if f.exists()}


def watch(interval=1.0, quiet=False):
    """Rebuild dist/kartikeyan-portfolio.html whenever a page, the CSS, main.js, content.json or a
    picture in assets/images changes (checked once a second). serve.py runs this in the background."""
    import time
    last = snapshot()
    try:
        main()
    except SystemExit as e:
        print(e)
    while True:
        time.sleep(interval)
        now = snapshot()
        if now != last:
            time.sleep(0.4)  # let the editor finish writing
            last = snapshot()
            try:
                main()
            except (SystemExit, Exception) as e:  # keep watching even if one build fails
                print("  single-file build failed:", e)


if __name__ == "__main__":
    import sys
    args = sys.argv[1:]
    if "--watch" in args:
        print("Watching for changes… (Ctrl + C to stop)")
        watch()
    elif "--lock" in args:
        # python build_single.py --lock [--password mysecret] [--hours 24]
        opt = lambda name, default=None: args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default
        main(lock={"password": opt("--password"), "hours": float(opt("--hours", 24))})
    else:
        main()

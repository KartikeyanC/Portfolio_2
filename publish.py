"""Netlify build step: copy only the public site into _site/ and write its security headers (_site/_headers).

Run by Netlify (see netlify.toml). Locally:  python publish.py   (then _site/ is exactly what goes online)

Why a copy: publishing the project folder as-is would also put build tools, notes, test pages and editor
settings online. Only the files and folders listed below are published; anything new must be added here.

Why it writes the headers: each page's small inline <script> must be allowed by its exact hash in the
Content-Security-Policy. The hashes are worked out here on every deploy, so editing a page never breaks it.
"""
import base64
import hashlib
import os
import re
import shutil
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "_site")

# The public pages (without .html). Test pages such as home-new / projects-v3 stay off the live site.
PAGES = ["index", "about", "projects", "services", "contact", "404"]
PROJECT_PAGES = ["case", "posters", "ifortigo", "myshoptill", "nexura", "respay", "vstar", "nineflow", "finroot"]
FILES = ["content.json", "favicon.ico", "robots.txt", "sitemap.xml"]
FOLDERS = ["assets", "gk", "prototypes"]
# Readable source -> minified file that goes online (the HTML is pointed at the minified one below)
MINIFY = ["assets/css/style.css", "assets/js/main.js", "assets/js/fluid-cursor.js"]
ESBUILD = "esbuild@0.25.10"
SKIP = shutil.ignore_patterns(".gitkeep", "README.txt", "*-info.json", "Thumbs.db", ".DS_Store")

# Content-Security-Policy for the public pages. Only these outside sites may supply anything:
#   cdn.jsdelivr.net   Lenis smooth scroll        fonts.googleapis.com / fonts.gstatic.com   Google Fonts
#   api.fontshare.com / cdn.fontshare.com   Clash Display font    youtube-nocookie.com / i.ytimg.com   videos
SITE_CSP = [
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net {hashes}",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com",
    "img-src 'self' data: blob: https://i.ytimg.com",
    "media-src 'self' blob:",
    "frame-src https://www.youtube-nocookie.com",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' mailto:",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
]

# The gk dashboard (Decap CMS) needs more: it is loaded from unpkg, compiles code at runtime ('unsafe-eval'),
# talks to GitHub through Netlify, and shows images from GitHub.
GK_CSP = [
    "default-src 'self'",
    "script-src 'self' https://unpkg.com 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://api.github.com https://api.netlify.com https://*.githubusercontent.com https://unpkg.com http://localhost:8081",
    "frame-src 'self' https://api.netlify.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
]

INLINE = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", re.S | re.I)


def inline_hashes(html):
    # Browsers turn CRLF into LF before checking a script against its hash.
    hashes = []
    for m in INLINE.finditer(html):
        script = m.group(1).replace("\r\n", "\n").replace("\r", "\n")
        h = "'sha256-" + base64.b64encode(hashlib.sha256(script.encode("utf-8")).digest()).decode() + "'"
        if h not in hashes:
            hashes.append(h)
    return hashes


def min_name(path):
    stem, ext = os.path.splitext(path)
    return stem + ".min" + ext


def minify():
    """Write the .min files into _site. If the minifier can't run, publish the readable file under the same name."""
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    for rel in MINIFY:
        src = os.path.join(OUT, rel)
        dst = min_name(src)
        try:
            subprocess.run([npx, "--yes", ESBUILD, src, "--minify", "--charset=utf8", "--log-level=error", "--outfile=" + dst], check=True, timeout=180)
            os.remove(src)
        except Exception as e:
            print(f"  not minified: {rel} ({e})")
            os.replace(src, dst)


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, "projects"))
    for folder in FOLDERS:
        shutil.copytree(os.path.join(ROOT, folder), os.path.join(OUT, folder), ignore=SKIP)
    for f in FILES:
        shutil.copy2(os.path.join(ROOT, f), os.path.join(OUT, f))
    minify()

    rules = []
    all_pages = [(p + ".html", "/" + p) for p in PAGES] + [(f"projects/{p}.html", f"/projects/{p}") for p in PROJECT_PAGES]
    for rel, clean in all_pages:
        html = open(os.path.join(ROOT, rel), encoding="utf-8", newline="").read()
        for src in MINIFY:
            html = html.replace("/" + src, "/" + min_name(src).replace(os.sep, "/"))
        with open(os.path.join(OUT, rel), "w", encoding="utf-8", newline="") as fh:
            fh.write(html)
        csp = "; ".join(SITE_CSP).format(hashes=" ".join(inline_hashes(html)))
        paths = [clean + ".html", clean] + (["/"] if clean == "/index" else [])
        for path in paths:
            rules.append(f"{path}\n  Content-Security-Policy: {csp}\n")
    # Standalone product prototypes and decks: each HTML file gets a policy for its own inline scripts.
    for folder, _, names in os.walk(os.path.join(OUT, "prototypes")):
        for name in names:
            if not name.endswith(".html"):
                continue
            file = os.path.join(folder, name)
            url = "/" + os.path.relpath(file, OUT).replace(os.sep, "/")
            csp = "; ".join(SITE_CSP).format(hashes=" ".join(inline_hashes(open(file, encoding="utf-8", newline="").read())))
            paths = [url, url[: -len(".html")]]
            if name == "index.html":
                paths = [url, url[: -len("index.html")], url[: -len("/index.html")]]
            for path in paths:
                rules.append(f"{path}\n  Content-Security-Policy: {csp}\n")
    for path in ["/gk", "/gk/*"]:
        rules.append(f"{path}\n  Content-Security-Policy: {'; '.join(GK_CSP)}\n")

    with open(os.path.join(OUT, "_headers"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("# Generated by publish.py on every deploy. Do not edit; change publish.py instead.\n\n")
        fh.write("\n".join(rules))
    print(f"_site ready: {len(all_pages)} pages, {len(rules)} header rules")


if __name__ == "__main__":
    main()

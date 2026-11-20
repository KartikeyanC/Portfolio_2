// Password gate for the private case studies (NineFlow and FinRoot).
// Runs on Netlify's free plan as an Edge Function, before the page is served.
//
// The password is NOT in this file (the repository is public). Set it in Netlify:
//   Site configuration → Environment variables → Add a variable
//   Key: PROJECTS_PASSWORD   Value: your password   Scopes: include "Functions"
// then redeploy. With no PROJECTS_PASSWORD set, the pages stay open, so nothing breaks.
//
// After the right password, the browser keeps a signed cookie for 30 days, so visitors type it once.
// Changing the password signs everyone out. The project cards (cover*.webp) stay public.

const COOKIE = "kp_projects";
const DAYS = 30;
const enc = new TextEncoder();

async function token(pass) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pass), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("kartikeyan-private-projects-v1"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Same-time compare, so the answer does not leak through timing
function same(a, b) {
  a = String(a ?? ""); b = String(b ?? "");
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function readCookie(request, name) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

// Only send people back to a page on this site
const safeBack = (to) => (typeof to === "string" && to.startsWith("/") && !to.startsWith("//") && !to.includes("\\") ? to : "/projects.html");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function page(back, wrong) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Private project — Kartikeyan</title><link rel="icon" href="/favicon.ico">
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{display:grid;place-items:center;padding:24px 16px;background:radial-gradient(80% 60% at 50% 110%,#123b8a 0%,#07102a 55%,#04070f 100%);color:#fff;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.box{width:100%;max-width:400px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:32px 28px}
h1{margin:0 0 6px;font-size:26px;line-height:1.2;letter-spacing:-.01em}
p{margin:0 0 22px;color:rgba(255,255,255,.72)}
label{display:block;font-size:14px;margin-bottom:8px;color:rgba(255,255,255,.85)}
input{width:100%;font:inherit;color:#fff;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:13px 14px;outline:none}
input:focus{border-color:#1e9bff;box-shadow:0 0 0 3px rgba(30,155,255,.3)}
button{margin-top:14px;width:100%;font-family:inherit;font-weight:600;font-size:16px;line-height:1;color:#fff;background:#1e9bff;border:0;border-radius:12px;padding:15px;cursor:pointer}
button:hover{background:#3aa8ff}
.err{margin:12px 0 0;color:#ff9b9b;font-size:14px}
a{color:#8ec9ff}.foot{margin:20px 0 0;font-size:14px}
</style></head><body><main class="box">
<h1>This project is private</h1>
<p>Enter the password to see this case study.</p>
<form method="post" action="/__private-login">
<input type="hidden" name="to" value="${esc(back)}">
<label for="pw">Password</label>
<input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
${wrong ? '<p class="err" role="alert">That password is not right. Please try again.</p>' : ""}
<button type="submit">View project</button>
</form>
<p class="foot">Need access? <a href="/contact.html">Ask me for the password</a> · <a href="/projects.html">All work</a></p>
</main></body></html>`;
  return new Response(html, {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
  });
}

export default async (request, context) => {
  const pass = globalThis.Netlify?.env?.get("PROJECTS_PASSWORD");
  if (!pass) return context.next(); // no password set yet → pages stay open

  const url = new URL(request.url);
  const good = await token(pass);

  if (url.pathname === "/__private-login") {
    if (request.method !== "POST") return Response.redirect(new URL("/projects.html", url), 303);
    const form = await request.formData();
    const back = safeBack(form.get("to"));
    if (!same(form.get("password"), pass)) return page(back, true);
    return new Response(null, {
      status: 303,
      headers: {
        location: back,
        "cache-control": "no-store",
        "set-cookie": `${COOKIE}=${good}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  if (same(readCookie(request, COOKIE), good)) {
    const res = await context.next();
    res.headers.set("cache-control", "private, no-store"); // never let a shared cache keep a private page
    return res;
  }
  return page(url.pathname + url.search, false);
};

export const config = {
  path: [
    "/__private-login",
    "/projects/nineflow", "/projects/nineflow.html", "/nineflow", "/nineflow.html",
    "/projects/finroot", "/projects/finroot.html", "/finroot", "/finroot.html",
    "/assets/images/projects/nineflow/*",
    "/assets/images/projects/finroot/*",
  ],
  // the project-card pictures on the public Projects/Home pages stay visible
  excludedPath: [
    "/assets/images/projects/nineflow/cover*",
    "/assets/images/projects/finroot/cover*",
  ],
};

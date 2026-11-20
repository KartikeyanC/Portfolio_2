# Kartikeyan — Portfolio

A static portfolio site (Home, About, Projects, Services, Contact) with a content dashboard called **gk**.

- All content lives in **`content.json`**: projects, services, process steps, tools, hero words, page text, contact details, social links, the “Open to opportunities” card and the closing call to action.
- The **gk** dashboard at `/gk` edits `content.json` with forms (Decap CMS). Uploaded images go to `assets/uploads/`.
- Main pages are in the root, case studies in `projects/`. Design and code live in `assets/css/style.css` and `assets/js/main.js`; `publish.py` puts minified copies online.
- **Site colour** is chosen in `/gk` → *Site colour*: Electric blue (default), Acid lime, Signal orange, Soft violet, or a Custom colour. Button and text shades are worked out automatically so text stays readable.

## Run it on your computer

Open two terminals in this folder:

```bash
python serve.py
```

```bash
npx decap-server
```

- Website: http://localhost:5173
- Dashboard: http://localhost:5173/gk → click **Login** (no password locally). Changes are written straight to `content.json`.

> Always open the site through `python serve.py`, not by double-clicking the HTML files — browsers block `content.json` on `file://` pages.

## Put it online (free: GitHub + Netlify)

1. **GitHub** — create an account and an empty repository (e.g. `portfolio`). Then in this folder:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/portfolio.git
   git push -u origin main
   ```
2. **gk/config.yml** — already points at `KartikeyanC/Portfolio_2`. If you move or rename the repository, update `repo:` there.
3. **Netlify** — sign up with GitHub → *Add new site* → *Import an existing project* → pick the repository → **Deploy** (no build settings needed; `netlify.toml` handles it). Rename the site under *Site configuration → Site details* (e.g. `kartikeyan` → `kartikeyan.netlify.app`).
4. **Dashboard login** — on GitHub: *Settings → Developer settings → OAuth Apps → New OAuth App*
   - Homepage URL: `https://kartikeyan.netlify.app`
   - Authorization callback URL: `https://api.netlify.com/auth/done`

   Copy the Client ID and create a Client Secret, then in Netlify: *Site configuration → Access & security → OAuth → Install provider → GitHub* and paste them.
5. Open `https://kartikeyan.netlify.app/gk` → **Login with GitHub**. Only GitHub accounts with write access to the repository can log in.

## Password for private projects (NineFlow, FinRoot)

`netlify/edge-functions/private-projects.js` puts a password page in front of `/projects/nineflow.html` and `/projects/finroot.html` (and every image in their folders except the card covers). It works on Netlify's free plan. The password is never stored in the code:

1. Netlify → your site → *Site configuration → Environment variables → Add a variable → Add a single variable*
2. Key `PROJECTS_PASSWORD`, value = your password, scope includes **Functions** → *Create variable*
3. *Deploys → Trigger deploy → Deploy site*

Visitors type it once; the browser remembers it for 30 days. To change it, edit the variable and redeploy (everyone is signed out). Delete the variable to open the pages again.

## Connect your domain

Netlify → *Domain management → Add a domain* → follow the DNS steps shown (change the nameservers at your registrar, or add the A/CNAME records). HTTPS is added automatically. Then update `site_url` and `display_url` in `gk/config.yml`.

## How publishing works

Edit in `/gk` → **Publish** → the change is committed to GitHub → Netlify redeploys (about 30–60 seconds) → the live site updates. Every change is in the Git history and can be undone.

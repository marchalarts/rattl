# Hosting notes (FramerExporter static export)

Your ZIP is **fully static** HTML, CSS, JS, images, and binary assets — including
`.framercms` files that Framer already downloaded at export time. Nothing calls Framer
or a CMS API in production.

Framer's runtime may request those local files with `?range=…` query parameters.
Every HTML page includes a small inline script (`framexporter-framercms-shim`) that
handles that in the browser so **any static HTTP server** works (Netlify, Vercel,
GitHub Pages, FTP, cPanel, etc.).

Also included:

- `_headers` — Netlify MIME types for `.mjs`, `.framercms`, `.lottie`
- `_redirects` — Netlify fallback for legacy flat layouts (new exports use nested folders)
- `vercel.json` — Vercel MIME headers
- `.htaccess` — Apache / cPanel / Hostinger MIME types

## Static site vs opening files from disk

| How you open the export | What works |
|-------------------------|------------|
| **Published on HTTP/HTTPS** (Netlify, Vercel, `npx serve`, preview FramerExporter) | Full site: routes, Lottie, search, CMS snapshot |
| **Double-click `index.html` (`file://`)** | Partial: homepage and assets often load; **Lottie and ES modules usually fail**; internal links need the file-protocol shim (included) |

“Static site” in production means **files served over HTTP**, not PHP or a database — not
“opened directly from Finder/Explorer.” Browsers restrict `file://` for security (especially
`type="module"` scripts such as Framer bundles and `dotlottie-player`).

### Test locally before deploy

From the unzipped folder:

```bash
npx serve .
# or: python3 -m http.server 8080
```

Then open `http://localhost:3000` (or `:8080`). Routes like `/projects/mar` match
`projects/mar/index.html` on disk.

### If you must use `file://`

- Prefer opening each page file directly, e.g. `projects/mar/index.html`, for that screen only.
- A small script (`framexporter-file-protocol-shim`) helps **in-app links** map routes to
  the correct relative HTML when you start from `index.html`.
- **Lottie (`.lottie`)** still requires HTTP — the player is an ES module the browser
  blocks on `file://`. Use Netlify/preview/`npx serve` to verify animations.

## Production

Serve over **HTTPS** (or HTTP on localhost), not `file://`.

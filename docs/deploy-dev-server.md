# Deploy VibeCheck to a dev server (e.g. `vibecheck.eplecheck.no`)

VibeCheck builds to **static HTML** (`apps/site/dist`), so "deploying" is: clone →
install → build → point a web server at `dist`, with TLS for your subdomain. There is
**no application server to run** (the optional MCP server is separate — see the bottom).

This doc doubles as a runbook you can hand to Claude Code on the dev server: paste the
**"Prompt for Claude Code"** block below, or just follow the numbered steps yourself.

---

## Prompt for Claude Code (paste this on the dev server)

> Clone `https://github.com/EpleCheck/vibecheck`, install with npm (Node 22+), and build
> the static site with `SITE_URL=https://vibecheck.eplecheck.no`. The output is
> `apps/site/dist`. Then serve it over HTTPS at `vibecheck.eplecheck.no` using Caddy
> (automatic TLS). Create a `deploy.sh` that pulls, reinstalls, and rebuilds, and verify
> the site responds. Do not run any dev server in production — serve the static `dist`.

---

## Prerequisites

- **Node 22+** and **npm** (`node -v` → v22 or newer). Install via
  [nodejs.org](https://nodejs.org) or `nvm install 22 && nvm use 22`.
- **git**, and access to the repo. If it's private, authenticate first — either an SSH
  key (`git@github.com:EpleCheck/vibecheck.git`) or a GitHub token over HTTPS.
- A web server with TLS. **Caddy** is recommended below (one line of config, automatic
  Let's Encrypt). nginx + certbot is given as an alternative.
- **DNS**: an `A` (and `AAAA` if you have IPv6) record for `vibecheck.eplecheck.no`
  pointing at this server's public IP. Set this up first — Caddy needs it resolvable to
  issue the certificate.

## 1. Clone

```bash
sudo mkdir -p /srv && sudo chown "$USER" /srv
cd /srv
git clone https://github.com/EpleCheck/vibecheck.git
cd vibecheck
```

## 2. Install & build

`SITE_URL` makes canonical URLs and the sitemap correct for your domain. `BASE_PATH`
stays `/` (the default) because you're serving at a subdomain root, so you don't set it.

```bash
npm ci                                           # clean, lockfile-exact install
SITE_URL=https://vibecheck.eplecheck.no npm run build
# -> validates every page against the schema, then writes static HTML to:
#    apps/site/dist
```

A green build means the content is valid (same gate CI runs). Sanity-check the output
locally before wiring up the web server:

```bash
npx --yes serve apps/site/dist -l 8080   # then curl http://localhost:8080/
```

## 3. Serve over HTTPS

### Option A — Caddy (recommended: automatic TLS)

Install Caddy ([docs](https://caddyserver.com/docs/install)), then `/etc/caddy/Caddyfile`:

```caddy
vibecheck.eplecheck.no {
    root * /srv/vibecheck/apps/site/dist
    encode zstd gzip
    try_files {path} {path}/ {path}.html /404.html
    file_server
    handle_errors {
        @404 expression {http.error.status_code} == 404
        rewrite @404 /404.html
        file_server
    }
}
```

```bash
sudo systemctl reload caddy   # Caddy fetches a Let's Encrypt cert automatically
```

That's it — `https://vibecheck.eplecheck.no` is live. Astro emits directory-style URLs
(`/about/` → `about/index.html`), which the `try_files` line handles.

### Option B — nginx + certbot

```nginx
# /etc/nginx/sites-available/vibecheck
server {
    listen 80;
    server_name vibecheck.eplecheck.no;
    root /srv/vibecheck/apps/site/dist;
    index index.html;
    location / { try_files $uri $uri/ $uri.html /404.html; }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vibecheck /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d vibecheck.eplecheck.no   # adds the 443 server block + cert
```

## 4. Updating (redeploy on content/code change)

Create `/srv/vibecheck/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /srv/vibecheck
git pull --ff-only
npm ci
SITE_URL=https://vibecheck.eplecheck.no npm run build
echo "Rebuilt -> apps/site/dist ($(date))"
```

```bash
chmod +x /srv/vibecheck/deploy.sh
```

Run `./deploy.sh` whenever `main` changes. Because the server points straight at
`apps/site/dist`, the new build is live the moment the build finishes — no service
restart needed. To automate, add a cron entry or a CI webhook that runs this script.

## Notes

- **Subdomain root, not a subpath** — keep `BASE_PATH` unset (`/`). `BASE_PATH` is only
  for serving under a path like `example.com/vibecheck/` (e.g. GitHub Pages project sites).
- **Static only** — never run `astro dev`/`astro preview` as the production server; they
  are dev tools. Serve the built `dist` with Caddy/nginx as above.
- **Forms/integrations** — form sections post to endpoints from the integration registry
  (`apps/site/src/lib/integrations.ts`), read from env at **build** time. If you wire up a
  live endpoint, set the matching env var (e.g. `CONTACT_ENDPOINT=…`) in the build step
  alongside `SITE_URL`. The endpoint is public; real secrets live in the receiving service.
- **Optional MCP server** — only needed to let an agent edit content remotely; it's a
  separate Node service, not required to serve the site. See the "Running the MCP server"
  section of the top-level `README.md` / `CLAUDE.md`.
```


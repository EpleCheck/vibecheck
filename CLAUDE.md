# VibeCheck — repo guide

VibeCheck is "the CMS you talk to": a git-backed, schema-safe headless CMS you edit
by chatting with an AI agent. A page is **typed data, not markup**, so
machine-generated content can't break the build. This file orients both Claude and
human contributors working in the repo.

## Requirements

- **Node 22+** and **npm** (uses workspaces)
- **git**
- Optional, only to run the MCP server: a **GitHub token** and (for the container)
  **Docker**

## Layout (npm-workspaces monorepo)

```
packages/schema   @vibecheck/schema — the content contract (zod). Single source of truth.
apps/site         the Astro site — renderer + content. Deploys as static HTML.
apps/mcp          @vibecheck/mcp — the MCP server (lets an agent edit from anywhere).
```

`site` and `mcp` both import `@vibecheck/schema` — **never define a schema in two
places.**

## Setup & commands

```bash
npm install
npm run build          # build:schema -> build:site (validates content) -> typecheck:mcp
npm run dev -w site    # local preview at http://localhost:4321
```

## Editing content (the main task)

Pages are YAML in `apps/site/src/content/pages/**/*.yaml`. A page is a `title` plus a
list of typed `sections`:
`hero | features | pricing | cta | richtext | faq | testimonials | form`.
Only `richtext` carries raw HTML.

- Add/edit a page → edit the YAML directly. `home.yaml` is the front page.
- A nested file `a/b.yaml` becomes `/a/b/` and gets an automatic breadcrumb.
- **Always run `npm run build` before committing** — it validates every page against
  the schema. A green build means the content is valid (this is exactly what CI runs).

### Reach for a typed section before `richtext`

`richtext` is the escape hatch, not the default — raw HTML is the one thing that can
break the build, so prefer a typed section whenever one fits:

- **FAQ** → use the `faq` section (`faq.yaml` is the worked example). It emits
  `FAQPage` JSON-LD for SEO; faking one with `features` or `richtext` does not.
- **Testimonials/reviews** → use the `testimonials` section (`home.yaml` is the
  worked example). It emits `Review` JSON-LD; set `subject` so each review names
  what it's reviewing. Don't fake quotes with `features` or `richtext`.
- **Feature/service grid, team** → `features` (title + body, optional image/href).
  Don't hand-write card markup in `richtext`.
- **Plans/tiers** → `pricing`. **Lead-in + button** → `hero` or `cta`.

Only fall back to `richtext` for genuinely freeform prose that no typed section models.

## Adding a section type

Update **both** `packages/schema/src/index.ts` (the zod union) **and** the renderer in
`apps/site/src/components/PageRenderer.astro`. The MCP picks up the schema change
automatically. The `faq` section is a minimal worked example of this two-file change
(schema variant + renderer branch, plus `FAQPage` JSON-LD in the renderer).

## Conventions

- Content is data, not markup — no HTML in pages except inside `richtext`.
- The schema is the source of truth; keep site + mcp in lockstep via `@vibecheck/schema`.
- URLs are sacred: preserve slugs; rename, don't delete+create.
- Static output — don't add server-only code to the site.
- Internal links use absolute paths (`/about/`); the renderer base-path-prefixes them
  via `withBase()`, so the site works at a domain root or under a subpath.

## Running the MCP server (optional)

The MCP commits structured content into a GitHub (or GitLab) repo, so you can edit from
claude.ai / Desktop / your phone without a local checkout.

```bash
cp apps/mcp/.env.example apps/mcp/.env   # fill GITHUB_TOKEN, GITHUB_REPO, MCP_AUTH_TOKEN
npm run build
npm start -w @vibecheck/mcp              # listens on :8787, POST /mcp
# — or self-host with Docker —
docker compose up -d --build
```

Then add it to Claude as an HTTP MCP connector at `http://<host>:8787/mcp` with header
`Authorization: Bearer <MCP_AUTH_TOKEN>`.

> **Monorepo note:** if the MCP edits *this* repo, set
> `VIBECHECK_PAGES_DIR=apps/site/src/content/pages` (the default `src/content/pages`
> assumes the site is the repo root). See `apps/mcp/.env.example`.

## Deploy

Static. Vercel / Netlify / Cloudflare Pages serve `apps/site/dist` with zero config
(set the project root to `apps/site`). GitHub Pages: `.github/workflows/pages.yml`
builds with `BASE_PATH` for subpath serving.

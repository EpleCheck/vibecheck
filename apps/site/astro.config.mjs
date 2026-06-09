// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Set `site` to your production URL. Vercel/Netlify/Cloudflare Pages serve the
// static `dist/` output with zero extra config.
export default defineConfig({
  site: 'https://example.com',
  integrations: [sitemap()],
  output: 'static',
});

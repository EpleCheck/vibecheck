import { z } from 'zod';

/**
 * VibeCheck content contract — the single source of truth.
 *
 * Both the site renderer (apps/site) and the MCP server (apps/mcp) import these
 * schemas, so a page that validates in the MCP will always build on the site.
 *
 * A page is data, not markup: a list of typed `sections`. Only `richtext`
 * carries raw HTML, so machine-generated content can't break the build.
 */

export const seoSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
  })
  .optional();

const hero = z.object({
  type: z.literal('hero'),
  heading: z.string(),
  subheading: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  image: z.string().optional(),
});

const features = z.object({
  type: z.literal('features'),
  heading: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string(),
        body: z.string(),
        href: z.string().optional(),
        image: z.string().optional(),
      }),
    )
    .default([]),
});

const pricing = z.object({
  type: z.literal('pricing'),
  heading: z.string().optional(),
  plans: z
    .array(
      z.object({
        name: z.string(),
        price: z.string(),
        unit: z.string().optional(),
        features: z.array(z.string()).default([]),
        ctaLabel: z.string().optional(),
        ctaHref: z.string().optional(),
        highlighted: z.boolean().default(false),
      }),
    )
    .default([]),
});

const cta = z.object({
  type: z.literal('cta'),
  heading: z.string(),
  body: z.string().optional(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
});

const richtext = z.object({
  type: z.literal('richtext'),
  html: z.string(),
});

const form = z.object({
  type: z.literal('form'),
  heading: z.string(),
  body: z.string().optional(),
  action: z.string(),
  subject: z.string().optional(),
  successHref: z.string().optional(),
  submitLabel: z.string().default('Send'),
  fields: z
    .array(
      z.object({
        name: z.string(),
        label: z.string(),
        type: z.string().default('text'),
        required: z.boolean().default(false),
        options: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export const sectionSchema = z.discriminatedUnion('type', [
  hero,
  features,
  pricing,
  cta,
  richtext,
  form,
]);

export const pageSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  seo: seoSchema,
  /** BCP-47 language for this page's <html lang>. Defaults to the site default. */
  lang: z.string().optional(),
  draft: z.boolean().default(false),
  sections: z.array(sectionSchema).default([]),
});

export type Page = z.infer<typeof pageSchema>;

/**
 * Blog post frontmatter. Posts render at the site root (/<slug>/); the Markdown
 * body is stored separately from this frontmatter. (Optional — the starter
 * template ships pages-only; add a `blog` collection to enable posts.)
 */
export const postSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  draft: z.boolean().default(false),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  seo: seoSchema,
});

export type Post = z.infer<typeof postSchema>;

/** Slug must be URL-safe: lowercase letters, digits, hyphens, optional nesting. */
export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/,
    'Slug must be lowercase, hyphen-separated, e.g. "about" or "pricing/teams".',
  );

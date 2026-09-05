import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** Posts sharing a series name get a "See also in" navigation block */
    series: z.string().optional(),
    /** Cover image (path in /public or remote URL), used for Open Graph too */
    image: z.string().optional(),
    /** Link the post title elsewhere instead of rendering a page */
    externalLink: z.url().optional(),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Screenshot, GIF or video poster (path in /public or remote URL) */
    image: z.string().optional(),
    skills: z.array(z.string()).default([]),
    /** Where the work lives — shown as the "View project" button (external URL or internal path) */
    link: z.string().optional(),
    /** Optional repository link, shown as a secondary "Source code" button */
    sourceCode: z.string().optional(),
    /** Small label above the title */
    kicker: z.string().default('Project'),
    /** Lower comes first */
    order: z.number().default(99),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, projects };

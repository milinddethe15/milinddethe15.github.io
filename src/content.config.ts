import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Post ids mirror the file path, which mirrors the live Hugo URLs:
//   day-1-ai-platform-engineering.md -> /posts/day-1-ai-platform-engineering/
//   mlops/day1.md                    -> /posts/mlops/day1/
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { posts };

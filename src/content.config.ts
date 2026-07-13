import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const schema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(), // created — never changes
  updated: z.coerce.date().optional(), // bumped on every content revision
  draft: z.boolean().default(false),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema,
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema,
});

export const collections = { notes, blog };

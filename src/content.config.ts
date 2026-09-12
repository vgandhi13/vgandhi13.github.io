import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const schema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(), // created — never changes
  updated: z.coerce.date().optional(), // bumped on every content revision
  draft: z.boolean().default(false),
  bibliography: z.array(z.object({
    id: z.string(),
    authors: z.string(),
    title: z.string(),
    source: z.string(),
    sourcePrefix: z.string().optional(),
    details: z.string().optional(),
    year: z.number().int(),
    url: z.string().url(),
  })).default([]),
  // still being written: publishes as normal but is badged "in progress", so a
  // reader knows it's incomplete. `draft` hides an entry entirely; this doesn't.
  wip: z.boolean().default(false),
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

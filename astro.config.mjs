// @ts-check
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  site: 'https://vgandhi13.github.io',
  // the note was retitled and its slug followed; keep the old URL alive so links
  // already shared don't 404. Static builds emit a meta-refresh page for these.
  redirects: {
    '/notes/group-relative-policy-optimization': '/notes/rl-for-llms',
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});

# Personal Website

Minimal academic personal site built with [Astro](https://astro.build). Static output, no client-side JS except the light/dark toggle.

## Commands

```sh
npm install      # once
npm run dev      # local dev server at http://localhost:4321
npm run build    # static site into dist/
npm run preview  # preview the built site
```

## How to maintain

### Add a note
Create `src/content/notes/my-note.md`:

```md
---
title: My Note
description: One-line summary (optional).
date: 2026-07-06
---

Markdown body. Inline math like $\eta$ and display math:

$$
L = -\sum \log P(x)
$$
```

The filename becomes the URL (`/notes/my-note/`). Footnotes (`[^1]`) and GFM tables work.

### Add a blog post
Same thing in `src/content/blog/`. See `src/content/blog/example-post.md` for a template — set `draft: false` to publish.

### Edit the homepage
Everything (bio, social links, About / Research / Experience / Teaching sections) lives in `src/pages/index.astro`. Commented-out HTML templates for research/experience entries are in there.

### Update the profile photo
Replace `public/profile.jpg` (keep it small — e.g. `sips -Z 640 photo.jpg --out public/profile.jpg`).

## Before deploying

- Replace the placeholder social URLs in `src/pages/index.astro` (marked `YOUR_GITHUB`, `YOUR_LINKEDIN`, etc.).
- Set `site` in `astro.config.mjs` to your real URL.
- Deploy `dist/` anywhere static (GitHub Pages, Vercel, Netlify, Cloudflare Pages).

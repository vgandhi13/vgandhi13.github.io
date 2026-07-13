# CLAUDE.md

Personal academic website for Varun Gandhi (MS CS @ UMass Amherst, AI research / LLM post-training).
Static Astro site. Design goal: **minimal and easy to maintain** — resist adding dependencies,
frameworks, or client-side JS beyond what exists.

## Commands

```sh
npm run dev      # dev server at http://localhost:4321 (hot reload)
npm run build    # static build into dist/ — ALWAYS run to verify changes
npm run preview  # serve dist/
```

No tests. Verification = clean build + grep the built HTML in `dist/` for expected output.
After making changes, if `npm run dev` isn't already running, start it in the background by
default so the user can manually look at the result in a browser.

**Deploy**: live at https://vgandhi13.github.io — pushing to `main` on
github.com/vgandhi13/vgandhi13.github.io triggers `.github/workflows/deploy.yml`
(withastro/action → GitHub Pages).

## Layout of the repo

- `src/pages/index.astro` — the entire homepage: hero (profile pic, bio, social icon links),
  jump-nav (News · Research · Teaching), Karpathy-style experience **timeline**, scrollable
  **News** box, Research (papers), Teaching. All homepage edits happen here.
- `src/layouts/Base.astro` — header/footer, theme toggle, **all global CSS + color variables**.
- `src/layouts/Entry.astro` — wrapper for a single note/blog post (imports KaTeX CSS).
- `src/content/notes/*.md`, `src/content/blog/*.md` — content collections (schema in
  `src/content.config.ts`: `title`, `description?`, `date`, `updated?`, `draft`). Filename =
  URL slug. `date` = created (immutable); bump `updated` to today whenever revising content —
  the entry page shows "· Updated <date>" when it differs from `date`.
- `src/components/Search.astro` + `src/pages/search-index.json.ts` + `src/lib/stopwords.js` —
  client-side full-text search (see below).
- `public/profile.jpg`, `public/logos/*.png`, `public/images/notes/*` — static assets.
- `Notes/` and `Context/` — **the user's raw source material, NOT built into the site.**
  One folder per topic: `Notes/<Topic>/main.md` with source images alongside it (e.g.
  `Notes/InstructionFinetuning/main.md` + `lr1image.png`). These rough drafts get converted
  into `src/content/notes/` (see the publish-content skill). `Context/*.txt` holds bio/CV
  facts used to fill homepage sections.

## Conventions & gotchas

- **After adding any new feature or convention**, check whether it should be recorded for
  future sessions: update an existing skill (`.claude/skills/`), create a new one if it's a
  repeatable workflow, or add a line here — so the next agent can pick up where this one left
  off. Prefer one home per fact (skill for authoring workflows, CLAUDE.md for site-wide
  facts/gotchas) to avoid drift.

- **Never use em dashes (—)** in notes, blog posts, or any prose on this site. Use a comma,
  colon, semicolon, or parentheses instead, whichever fits the sentence. En dashes (–) in
  numeric ranges (e.g. `5–8 × 10^-5`) or compound modifiers are fine and not affected by this rule.
- **Stale Vite dep cache**: if client-side JS (e.g. search) silently stops working in dev and
  the console shows `504 Outdated Optimize Dep`, kill the dev server, `rm -rf
  node_modules/.vite`, and restart. Happens when deps change while the server runs.
- **Astro scoped styles don't reach JS-created DOM.** Any element built with
  `document.createElement` needs its styles in a `<style is:global>` block (this bit us in
  Search.astro). Keep such selectors namespaced (`.search-*`).
- **Theme**: light/dark via `data-theme` on `<html>`, set pre-paint by an inline script in
  Base.astro, persisted in localStorage, falls back to `prefers-color-scheme`. All colors are
  CSS variables in Base.astro (`--bg, --text, --heading, --text-muted, --link, --border,
  --surface, --mark-bg`). Dark palette was contrast-tuned (WCAG AA, body ~10:1, muted ~5:1);
  keep headings brighter than body text.
- **Search**: `/search-index.json` is generated at build from both collections. Each doc has
  `text` (stop-word-stripped, for Fuse.js fuzzy matching), `plain` (readable, for sentence
  previews), and `description` (frontmatter, shown when only the title matches). Stop words
  live in `src/lib/stopwords.js`, shared by index and query side. Result cards: query words
  are highlighted in the title whenever they match; preview priority is body sentence
  (deep-linked via `#:~:text=`) → description → first 140 chars. Mid-word/inflected queries
  are handled two ways: preview matching falls back to the token's longest prefix ≥3 chars
  ("sweepin" still finds and marks "sweep"), and a zero-hit Fuse search retries with
  end-trimmed tokens ("sweeping" scores worse than "sweepin" in Fuse and would otherwise
  return nothing). `<Search scope="note|blog">`
  sets the placeholder and ranks that collection first (other collection still shown, badged).
  Stay dependency-light: Fuse.js only.
- **Verifying client-side JS** (search etc.): grepping `dist/` isn't enough — drive it with
  playwright headless against the dev server, `chromium.launch({ channel: 'chrome' })` to use
  installed Chrome (no browser download). Playwright is NOT installed globally or in the repo:
  `npm init -y && npm i playwright` in the session scratchpad first. Test scripts go in the
  scratchpad, not the repo. Capture console errors; that's how the 504 bug below was found.
  (Screenshot artifact: a dark pill-shaped Chrome-extension overlay can appear mid-page in
  headless screenshots — it's not part of the site.)
- **Math**: remark-math + rehype-katex are configured; `$...$` / `$$...$$` in any markdown.
  GFM footnotes (`[^name]`) work. Footnote sections are styled globally in Base.astro
  (`.footnotes`: divider + smaller muted text) and the auto-generated "Footnotes" h2 is
  **intentionally hidden** via `.sr-only` — its absence on the page is not a bug.
- **Images**: compress before adding — `sips -Z 640 -s format jpeg -s formatOptions 80 in.jpg
  --out public/...` for photos; note figures go in `public/images/notes/`. To size an image
  down in markdown, use an inline `<img width="450">` tag instead of `![]()`. Diagrams saved
  from slides/web often carry huge white margins that push figcaptions away — trim them (no
  ImageMagick on this machine; use a Pillow venv in the scratchpad, `ImageChops.difference`
  vs white + `getbbox`). Cited figures use `<figure>`/`<figcaption>` (global styles in
  Base.astro); details in the publish-content skill.
- **Logos** for timeline entries: `curl -sL -o public/logos/<domain>.png
  "https://www.google.com/s2/favicons?domain=<domain>&sz=128"`.
- The homepage header hides the site name (`hideSiteName` prop on Base) because the hero shows
  it; subpages show it top-left.
- **Intentional easter eggs — do not remove**: the HTML comment in Base.astro, the console.log
  in the theme script, and `public/humans.txt` (credits: Claude Code, Karpathy/Weng design
  inspiration).
- User's email: vgandhi@umass.edu. LinkedIn: varunriteshgandhi. Scholar ID: RCLwIEMAAAAJ.

## Current state / open TODOs

- **LeetCode URL is a placeholder** in `src/pages/index.astro` (`YOUR_LEETCODE`) —
  ask the user for the real username. (GitHub is set: vgandhi13.)
- **Analytics undecided**: user wants per-page views + referrers; GoatCounter was
  recommended (free, no-cookie, one script tag in Base.astro). Wire it in when they decide.
- Blog is intentionally empty (`draft: true` template at `src/content/blog/example-post.md`).
- Motional logo is low-res (48px favicon upscale) — replace `public/logos/motional.com.png`
  if the user provides a better one.
- Content tension the user hasn't resolved: the packing footnote in the instruction-finetuning
  note says packing isn't used in SFT, but the OLMo 3 paragraph says its SFT infra uses
  sequence packing.
- **No favicon** — every page 404s on `/favicon.ico` (visible in console). User was offered
  one (e.g. "V" monogram SVG) but hasn't decided.
- The CS231n learning-rate figure in the instruction-finetuning note credits its source only
  in alt text; the newer convention is a visible `<figcaption>` (see policy-gradients note).
  User was offered the retrofit but hasn't decided.

---
name: publish-content
description: Convert a raw note from Notes/ (or a draft idea) into a published note or blog post on the site. Use when the user says "add this note", "publish this", "accommodate this in note", or points at files in Notes/.
---

# Publish a note or blog post

The user drafts rough notes in `Notes/<Topic>/main.md` (plain text, unicode math, sometimes
embedded instructions), with any source images alongside it in the same folder. **One folder
per topic, one published note per folder** — `Notes/InstructionFinetuning/main.md` →
`src/content/notes/instruction-finetuning.md` (blog: `src/content/blog/<slug>.md`). If a
`main.md` turns up holding multiple top-level `#` headings, that's drift — split it into
separate topic folders (as was done for Pretraining/InstructionFinetuning) rather than
publishing multiple notes from one file. The site version is a **faithful but cleaned-up**
rendering — same voice and claims, better formatting.

Beware pasted-from-ChatGPT math: it often arrives as vertical unicode debris (one
character/subscript per line). Reconstruct the intended equation and write it as LaTeX.

## Steps

1. Read the raw source. If a site version already exists, diff mentally against it — the user
   often extends the raw note and expects the site to sync (new paragraphs, images, examples).
   Sync goes both ways: when the user asks for an edit directly on the published note (new
   fact, footnote, section), mirror it back into `Notes/<Topic>/main.md` so the draft never
   goes stale.
2. Frontmatter (all required except description):
   ```yaml
   ---
   title: Human Title Case
   description: One-line summary — always write it; it's the search-result preview when
     someone's query matches only the title, plus the meta description.
   date: YYYY-MM-DD      # created — set once, NEVER change on later edits
   updated: YYYY-MM-DD   # add/bump to today on EVERY content revision (not for typo fixes
                         # the user didn't ask for); omit on first publish
   ---
   ```
   Filename becomes the URL: `instruction-finetuning.md` → `/notes/instruction-finetuning/`.
3. Convert as you go:
   - Unicode/ASCII math → LaTeX: `$...$` inline, `$$...$$` display. E.g.
     `θ new =θ−η∇ θ L` → `$\theta_{\text{new}} = \theta - \eta \nabla_\theta L$`.
   - ASCII diagrams / token examples → fenced ```text blocks.
   - Long lists of prose points → `## Section` headings + numbered lists.
   - `[Note for AI: ...]` instructions embedded in the text → **execute them** (e.g. "put this
     in a footnote" → GFM footnote `[^name]`), then remove the bracket.
   - `Insert <x> image` markers → embed the image (see step 4).
   - When prose refers back to an earlier equation ("using the factorization from the
     preliminaries"), don't number equations (`\tag` renumbering is a maintenance burden and
     "Eq. (3)" reads poorly on the web). Instead drop `<span id="descriptive-slug"></span>`
     on its own line just above the `$$` block and link the descriptive phrase:
     `[trajectory factorization](#descriptive-slug)`. A global `scroll-margin-top` on `[id]`
     in Base.astro keeps jump targets from landing flush at the viewport top.
   - Fix obvious typos/spelling; do NOT rewrite the user's phrasing or add content. Flag (in
     your reply, not the note) any factual tensions you notice.
4. Images: copy from `Notes/...` to `public/images/notes/<name>.png`, embed with
   `![descriptive alt](/images/notes/<name>.png)`. If the user wants it smaller, use
   `<img src="..." alt="..." width="450" />`. Compress photos with sips first if >300KB.
   Check the raw file with `file` first — browser-saved "PNGs" are sometimes AVIF/HEIC;
   convert with `sips -s format png`. Slide/web diagrams usually have large baked-in white
   margins that leave an ugly gap before the caption — trim to content (no ImageMagick here;
   Pillow venv in the scratchpad: `ImageChops.difference` against white + `getbbox`, ~12px
   pad), then screenshot the page to confirm the caption hugs the figure.
   **Cited figures**: when the image marker carries a `[source: <url>]`, embed as a figure
   with a caption (global `figure`/`figcaption` styles live in Base.astro):
   ```html
   <figure>
     <img src="/images/notes/<name>.png" alt="descriptive alt" />
     <figcaption>Short caption. Source: <a href="<url>">Name</a>.</figcaption>
   </figure>
   ```
   Recurring source: Stanford CS224R figures → `Source: <a
   href="https://cs224r.stanford.edu/">Stanford CS224R</a>`.
5. Verify: `npm run build`, then grep `dist/notes/<slug>/index.html` for a few expected strings
   (katex markup if math, image paths, new paragraphs). The search index picks up new content
   automatically — no action needed.

Blog posts: identical, in `src/content/blog/`. A `draft: true` template exists at
`src/content/blog/example-post.md`. Set `draft: false` to publish.

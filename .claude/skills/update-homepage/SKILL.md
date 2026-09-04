---
name: update-homepage
description: Add or edit homepage content — timeline entries, news items, papers, teaching, social links. Use when the user shares a new internship/paper/award/course or wants homepage sections changed.
---

# Update the homepage

Everything is in `src/pages/index.astro`. Match the existing patterns exactly.

## Timeline entry (new job / internship / program / award)

Newest first. Each `<li>` in `ul.timeline`:

```astro
<li>
  <span class="tl-date">2026</span>
  <img class="tl-logo" src="/logos/<domain>.png" alt="Company" width="52" height="52" loading="lazy" />
  <div class="tl-body">
    First-person past/present sentence with a link to the
    <a href="https://company.com" target="_blank" rel="noopener">company</a>. Mentors, teams,
    and one-line what-you-did are welcome; keep it to 2–3 sentences.
  </div>
</li>
```

Get the logo first: `curl -sL -o public/logos/<domain>.png
"https://www.google.com/s2/favicons?domain=<domain>&sz=128"` — check it's ≥64px with `file`;
warn the user if only a small favicon exists. Dates are plain years ("2026"); the user
dislikes dangling range dashes ("2025 –").

## News item (short dated announcement)

Prepend to the `news` array in the frontmatter: `{ date: 'Mon YYYY' | 'Summer YYYY', text: '...' }`.
The box shows ~4 items and scrolls; never prune old ones. News and the timeline intentionally
overlap — news is announcements, timeline is the curated story.

## Paper (Research section)

Copy an existing `.paper` div — two-column layout: figure thumbnail (left, links to arXiv)
and info (right): linked title, author line with `<strong>Varun Gandhi</strong>`, venue line
(`arXiv preprint, YYYY`; once it lands somewhere, switch to the venue and wrap it in
`<span class="venue-accepted">` for an archival venue or `<span class="venue-workshop">` for a
workshop, and make sure the string itself names the tier — see CLAUDE.md),
1–2 sentence summary, then `.paper-links` buttons (arXiv abs + PDF; add Project Page / Code
if they exist). Figure: user supplies an image; compress with `sips -Z 800` (or 640 if still
>500KB) into `public/images/papers/<kebab-slug>.png`. Thumbnails render letterboxed in a
fixed 230×150 frame (`object-fit: contain`) so any aspect ratio works — but suggest a simple
single-panel figure if the user's image is a dense multi-panel diagram that won't read at
that size. If given only an arXiv link, fetch the page for exact title/authors. Newest first.
Usually also warrants a news item — ask or just add both.

## Teaching

Copy an existing `.entry`: **plain (unlinked) course title** in the `h3`, then a meta line
`<Role> · UMass Amherst, <term>`. Spell the role out (`Graduate Teaching Assistant`,
`Undergraduate Course Assistant`, `Instructor`); UCA/GTA don't travel outside UMass. Add
`, N sections` after the role when a course ran more than one.

A course site does **not** go on the title. It gets its own button below the meta line, reusing
the Research section's button style:

```astro
<div class="entry-links">
  <a href="https://..." target="_blank" rel="noopener">Course website</a>
</div>
```

`.entry-links` is comma-joined onto the `.paper-links` rules rather than being a second copy of
them, so the two sections' buttons can't drift apart. Newest term first.

## Social links

The `socials` array in the frontmatter — each entry is a label, URL, and inline SVG stroke-icon
path (feather/lucide style, 24×24 viewBox). GitHub and LeetCode are still `YOUR_*` placeholders.

## Verify

`npm run build`, grep `dist/index.html` for the new strings. Keep the page structure:
hero → jump-nav (News · Research · Teaching) → timeline (no heading) → News → Research → Teaching.

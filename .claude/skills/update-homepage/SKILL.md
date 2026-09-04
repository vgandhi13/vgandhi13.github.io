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
`Undergraduate Course Assistant`, `Lead Instructor (Teaching Associate)`); UCA/GTA don't travel
outside UMass. Add `, N sections` after the role when a course ran more than one.

Wrap a role in `<strong>` when it carried materially more ownership than the others (the lead
instructor roles do; a TA line doesn't). `.entry-meta strong` steps that role out of the muted
meta color up to `--text` while the rest of the line stays muted, so the list has a visible
hierarchy instead of six interchangeable rows. It only works as a signal while it stays rare.

Separators are written `·&nbsp;` (space before the dot, nbsp after), which binds the dot to the
segment that **follows** it. These lines wrap on a phone, and a `·` left at the end of a line
reads as truncation. Same reason the link's separator lives inside `.meta-link`.

A course site does **not** go on the title, and does **not** get a `.paper-links`-style button:
one link on some entries doesn't earn the box a five-link paper does, and a third row breaks the
two-line rhythm the rest of the list has. Fold it into the meta line as another `·` item:

```astro
<p class="entry-meta">
  Instructor, 2 sections · UMass Amherst, Fall 2025
  <span class="meta-link">· <a href="https://..." target="_blank" rel="noopener">Course website<svg …/></a></span>
</p>
```

The separator lives **inside** `.meta-link` (which is `white-space: nowrap`), so when the line
wraps on a phone the whole "· Course website ↗" moves down together instead of stranding a
trailing `·` at the end of the previous line. Copy the 11px arrow `<svg>` from an existing entry.
Newest term first.

## Social links

The `socials` array in the frontmatter — each entry is a label, URL, and inline SVG stroke-icon
path (feather/lucide style, 24×24 viewBox). GitHub and LeetCode are still `YOUR_*` placeholders.

## Verify

`npm run build`, grep `dist/index.html` for the new strings. Keep the page structure:
hero → jump-nav (News · Research · Teaching) → timeline (no heading) → News → Research → Teaching.

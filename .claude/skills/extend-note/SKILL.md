---
name: extend-note
description: Incrementally grow an already-published note, one small paste-in at a time: the user drops a garbled math/prose fragment (often OCR'd from a slide screenshot) and says "add this", "add this next", "put this in a footnote", "link this to X", "revert". Use for this turn-by-turn derivation-building pattern, as distinct from publish-content's one-shot Notes/-draft-to-site conversion.
---

# Extend a note, one fragment at a time

This is the pattern for sessions that build up a technical note (a derivation, an algorithm
walkthrough) over dozens of small turns, rather than publishing a finished draft in one shot.
Each turn is small: the user pastes one fragment, or asks to move/link/trim something already
there. Treat every turn as its own tiny edit-and-verify cycle, not a batch to save up.

## Per-fragment loop

1. **Clean the paste.** Pasted math from screenshots/slides often arrives as vertical unicode
   debris (`θ`, `∑`, subscripts on their own lines) or duplicated fragments (the same equation
   rendered twice, once as MathML fallback text). Reconstruct the intended equation, write it as
   `$...$` / `$$...$$`, fix obvious typos, and strip stray "specifically:" / OCR artifacts. Never
   use em dashes (site-wide rule): comma, colon, semicolon, or parens instead.
2. **Reuse the note's existing notation.** Before introducing a symbol, check what's already
   established earlier in the note (index convention like $\tau=(s_1,a_1,\dots,s_T,a_T)$ starting
   at $t=1$, names like $r(\tau)$ for return, $J(\theta)$ for the objective). If the pasted
   source uses different conventions (e.g. $t=0$ indexing, $\rho$/$P$ instead of $p(s_1)$/
   $p(s_{t+1}\mid s_t,a_t)$), silently adapt it to match rather than introducing a second
   convention mid-note.
3. **Decide main body vs. footnote**, then act: don't ask permission for a reversible,
   low-stakes formatting call; give a one-sentence recommendation and do it. Rule of thumb:
   - **Main body**: the next step of the forward derivation, a result later steps depend on, or
     the closing payoff/insight of a section.
   - **Footnote**: worked numerical examples, "why doesn't the naive approach work" tangents,
     proofs/derivations backing a claim just made, illustrative images. This note's convention:
     the reader should be able to follow the main thread top-to-bottom on equations alone, with
     examples one click away.
   - When the user pastes something clearly meant to justify a sentence that already exists,
     attach it as a footnote reference on that sentence rather than inserting inline and
     breaking the flow.
4. **Cross-reference instead of duplicating.** If new content restates an equation already
   derived earlier (e.g. the trajectory factorization), don't re-derive it; link back with
   `<span id="descriptive-slug"></span>` on its own line above the earlier `$$` block, then
   `[descriptive phrase](#descriptive-slug)` from the new spot. Caveat: if a heading's own text
   already slugs to that id (Astro auto-generates heading ids), don't add a redundant manual
   span, since it produces a duplicate `id` in the HTML. Check with
   `grep -o 'id="the-slug"' dist/notes/<slug>/index.html | wc -l` (should be 1).
5. **Consolidate when the user points out duplication.** A closing "Intuition" section that
   restates a footnote almost verbatim, or a fact mentioned once inline and again fully in a
   footnote, should collapse into one place, keeping whichever framing is more complete and
   folding in any unique detail from the one you remove.
6. **Footnote numbers follow reference order in the body text, not declaration order in the
   file.** Don't reshuffle footnote declarations to match numbering; just keep new declarations
   roughly near footnotes they relate to for readability.
7. **Images**: view the screenshot first. Write real alt text and a figcaption (cite the
   recurring source if there is one, e.g. `Source: <a href="https://cs224r.stanford.edu/">
   Stanford CS224R</a>`). Compress before publishing:
   `sips -Z 400 -s format jpeg -s formatOptions 75 <src> --out public/images/notes/<descriptive-name>.jpg`
   (smaller than the usual 640px if it's a small inline/footnote figure; add a `width` attribute
   on the `<img>` too if it should render small). Give the file a name that describes its
   content, not the screenshot timestamp. Move the original screenshot out of the project root
   into `Notes/<Topic>/<DescriptiveName>.png` (that folder is the note's source material per
   `publish-content`; don't leave raw screenshots sitting in the repo root).
8. **Verify after every single edit**, not batched at the end: `npm run build`, then grep
   `dist/notes/<slug>/index.html` for the new string, the KaTeX markup (confirms `$...$` wasn't
   left as literal text: this happens if content lands inside a raw HTML block without the
   blank-line trick), and footnote count/numbering
   (`grep -o 'aria-label="Back to reference [0-9]*"' dist/... | wc -l`).
9. **Handle "revert"** by undoing precisely the last edit (Edit back to the prior string);
   don't guess at a different fix or re-litigate the placement decision.
10. At the end of a session that meaningfully changed the content, bump `updated: YYYY-MM-DD`
    (today) in the frontmatter (see `publish-content` for the frontmatter schema). If the note
    has a `Notes/<Topic>/main.md` draft, mirror substantial changes back into it so the draft
    doesn't go stale (also from `publish-content`).

## Common breakages to watch for

- **Unquoted YAML frontmatter with a colon in the value** (`description: How X differs from Y:
  a, b, c.`) breaks the build: quote the whole string when a description contains `: `.
- **Raw HTML blocks swallow inner markdown.** A `<div>`/`<figure>` wrapping a numbered list or
  math needs a blank line right after the opening tag and right before the closing tag, so the
  content in between is parsed as ordinary markdown (CommonMark HTML-block rules) instead of
  passed through as literal text with unrendered `$...$`.
- **Duplicate `id`s** between a manual `<span id="...">` anchor and an auto-generated heading id
  that happens to slug to the same string.

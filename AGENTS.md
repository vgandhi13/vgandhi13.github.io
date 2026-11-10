# AGENTS.md

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

**Gemma 4 publishing restriction**: Do not commit or push the Gemma 4 notes/blog post
(`src/content/blog/gemma-4-developer-agent-kaggle-competition.md`) or related content until
the user explicitly asks to push Gemma 4. A general "push" request applies only to other
changes; leave Gemma 4 work local and exclude it from those commits.

## Layout of the repo

- `src/pages/index.astro` — the entire homepage: hero (profile pic, bio, social icon links),
  jump-nav (News · Research · Teaching), Karpathy-style experience **timeline**, scrollable
  **News** box, Research (papers), Teaching. All homepage edits happen here.
- `src/layouts/Base.astro` — header/footer, theme toggle, **all global CSS + color variables**.
- `src/layouts/Entry.astro` — wrapper for a single note/blog post (imports KaTeX CSS).
- `src/pages/me.astro` — interests and goals; bump its explicit `lastUpdated` date when revising the content. The date below the title reflects edits, not builds.
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

- **Supabase Collections**: use the repository skill at
  `.agents/skills/manage-supabase/SKILL.md` for content edits, backend changes,
  login/passkeys, migrations, verification, and deployment configuration. Its
  references are the maintained runbook. Supabase is the sole Collections content
  source; database edits do not require encryption or redeployment. Read ignored `.private/supabase-setup.json`
  for current account/project details and verified setup state.

- Use plain language, short sentences, and avoid dense or overly compressed phrasing.
- **After adding any new feature or convention**, check whether it should be recorded for
  future sessions: update an existing skill (`.agents/skills/`), create a new one if it's a
  repeatable workflow, or add a line here — so the next agent can pick up where this one left
  off. Prefer one home per fact (skill for authoring workflows, AGENTS.md for site-wide
  facts/gotchas) to avoid drift.

- **Never use em dashes (—)** in notes, blog posts, or any prose on this site. Use a comma,
  colon, semicolon, or parentheses instead, whichever fits the sentence. En dashes (–) in
  numeric ranges (e.g. `5–8 × 10^-5`) or compound modifiers are fine and not affected by this rule.
- **Stale Vite dep cache**: if client-side JS (e.g. search) silently stops working in dev and
  the console shows `504 Outdated Optimize Dep`, kill the dev server, `rm -rf
  node_modules/.vite`, and restart. Happens when deps change while the server runs.
  The same staleness also hits **scoped CSS**, with no console error at all: a newly added
  `.foo` rule in a page's `<style>` is present in the HTML the dev server serves (curl shows
  it) yet never applies in the browser, and `el.matches()` against `document.styleSheets`
  reports only `*` matching. Don't go restructuring the markup chasing a specificity or
  flex-layout bug that isn't there: check the built output first (`npm run build` and
  `npx astro preview --port <other>`), and if it behaves correctly there, it's this, so
  restart dev with the cache cleared.
- **Astro scoped styles don't reach JS-created DOM.** Any element built with
  `document.createElement` needs its styles in a `<style is:global>` block (this bit us in
  Search.astro). Keep such selectors namespaced (`.search-*`).
- **Theme**: light/dark via `data-theme` on `<html>`, set pre-paint by an inline script in
  Base.astro, persisted in localStorage, falls back to `prefers-color-scheme`. All colors are
  CSS variables in Base.astro (`--bg, --text, --heading, --text-muted, --link, --border,
  --surface, --mark-bg, --venue, --venue-workshop`). Dark palette was contrast-tuned (WCAG AA,
  body ~10:1, muted ~5:1); keep headings brighter than body text.
- **Accepted papers** in the Research section wrap their venue in a span so it renders semibold
  in an accent color, while a still-unaccepted `arXiv preprint, YYYY` stays muted — the two read
  as different states in the list. Two tiers, two hues: `.venue-accepted` → `--venue` amber
  (`#8a6412` light 5.37:1 / `#d9a93a` dark 7.88:1) for archival venues (main conference,
  Findings); `.venue-workshop` → `--venue-workshop` green (`#146c3f` light 6.47:1 / `#5fd39a`
  dark 9.17:1) for workshops. Reuse the tokens for the next acceptance rather than hardcoding a
  hex. **The venue string must name the tier itself** (say "Workshop" when it is one) — the
  color is decoration, the words are the claim, and abbreviating a workshop paper to just
  "RLC 2026" would read as a main-conference paper. User picked amber from a rendered comparison
  of green/blue/amber/teal and pill variants (pill rejected as too much furniture), then chose
  green for workshops; they were told green-as-success next to amber-as-caution can imply the
  workshop is the stronger result, and accepted that tradeoff.
- **Collections** (`src/pages/collections.astro`, `/collections/`): ten private tabs
  (Ideas, Stories, Psychology, Neuroscience, Learnings, Thoughts, Finance, Social Sciences,
  Philosophy, First Principles). Content loads from Supabase only after authenticated access.
  `src/lib/collections-page.js` owns login, tabs, and shared links;
  `src/lib/collection-content.js` owns validators and card renderers. Stories combines the
  History and Inspiration source collections. Legacy `#history` and `#inspiration` open Stories,
  `#cognitive-science` opens Psychology, `#communication` opens Learnings, and `#proverbs`
  opens Thoughts. Entry ids stay stable. Database keys and authoring are in the Supabase skill.
- **Collections access**: entering `/collections/` opens the login dialog immediately.
  After canceling, one click on the 🧠 heading opens it again; keyboard Enter/Space works too.
  Clicking the heading while signed in relocks. Successful login reveals the tabs
  and lock icon. Relocking clears private DOM, hides the hourglass, and signs out the
  in-memory session. Canceling or superseding a login invalidates its pending result.
  The gesture is a discoverability choice, not security. Preserve password-manager hints:
  `name="password"`, `autocomplete="current-password"`, and email's username hint.
- **Collection tabs** ship hidden and stay hidden without JS. Explicit `[hidden]` rules
  override flex display. Keep one horizontally scrollable row with nonshrinking tabs; selecting
  a tab scrolls only the bar, including keyboard and shared-link navigation. Selected tabs use
  colour plus a rule, never font-weight, which changes width and reflows the bar.
- **Collection share links** use stable explicit ids and real `<a href="#id">` controls.
  The picker opens the target panel before jumping; notes expand and collapsed entries open
  after login. Links into a filtered-out entry reset its filter first. Legacy `/quotes/`
  and `/ideas/` pages redirect to `/collections/` while preserving the fragment. The
  `.share-text` inline grid stacks a hidden “Copy link” sizer with the live label so changing
  it to “Copied” cannot shrink the control and reflow the card. Do not replace it with a
  hardcoded pixel width.
- **Collection rendering**: Ideas shuffle after loading; other entries retain display order.
  `author` selects a quotation, while `subject` or `title` selects prose. First Principles and
  Philosophy notes use native `<details>`; Philosophy supports subcategory filters. Body HTML,
  commentary, and SVG are trusted owner-authored content; metadata is escaped. Dynamic cards
  need global CSS namespaced under `.collections`, since Astro's scoped attributes do not
  reach JS-created DOM. Use neutral source credits such as “Source: Video”, with Video linked.
- **Collections hourglass**: the heading and footer link are 🧠, while the URL and accessible
  labels remain Collections. `LifeHourglass.astro` loads private settings from authenticated
  `collection_settings.content.hourglass`, never public source. `collections:unlock` supplies
  validated settings; `collections:lock` clears text, links, dates, and timer. Preserve the
  curved-bulb area integration, continuous grain animation, IST accessible durations, and
  updates on returning to the tab. Keep the grey rounded design, no visible time caption,
  reflection beside the glass on desktop and below on mobile, and an explicit
  `.life-hourglass[hidden]` override.
- **Collection figures**: raster data URIs live inside private entry JSONB; no public asset
  URLs or Storage bucket are used. `image` supports `alt`, `plain`, `credit`, `creditUrl`,
  and optional `width`; default widths stay small. Grayscale line art uses multiply in light
  mode and invert plus screen in dark mode to blend away its white background. Use `plain`
  for colored art, especially transparent PNGs; do not discard meaningful color. Inline SVG
  uses `svg.markup`, with sizes and theme tokens in inline styles because it is injected DOM.
  `credit`/`creditUrl` add a caption; credits without a URL stay plain text. A width cap must
  retain `min(100%, ...)` so images fit phones.
- **Private data lifecycle**: the old encrypted bundle, encryption password, and editable local
  source copies have been retired. Keep only ignored setup metadata, verified backups, and
  archived unmatched source material under `.private/`. Never commit that directory or `.env`.
  Earlier ciphertext and historical plaintext may still exist in Git history and other clones;
  removing current files does not revoke copies. Do not merge or force-push old history back
  into a cleaned branch. Follow the Supabase skill for database edits and backups.

- **Search**: `/search-index.json` is generated at build from both collections. Each doc has
  `text` (stop-word-stripped, for Fuse.js fuzzy matching), `plain` (readable, for sentence
  previews), and `description` (frontmatter, shown when only the title matches). Stop words
  live in `src/lib/stopwords.js`, shared by index and query side. Result cards: query words
  are highlighted in the title whenever they match; preview priority is body sentence
  (deep-linked via `#:~:text=`) → description → first 140 chars. `<Search scope="note|blog">`
  sets the placeholder and ranks that collection first (other collection still shown, badged).
  Stay dependency-light: Fuse.js only.
- **Search ranking is scope → literal overlap → Fuse score**, in that order (`Array.sort` is
  stable, so Fuse's own order, including its 2× title weight, breaks ties). "Literal overlap"
  = for each query token, the length of its longest prefix literally present in title+`plain`,
  **summed across tokens** so multi-token queries rank on total coverage. Summing matters: on
  "proximal policy optimization" both RL notes tie at 12 on the longest single token
  ("optimization"), and only the sum (26 vs 25) separates a full `proximal` from `proxima`
  found inside "ap**proxima**tion".
  This exists because Fuse ranks by *edit distance*, so an unrelated near-miss can beat a real
  hit by a rounding error: on "clipped", `flipped` in policy-gradients (1 substitution, score
  .9600) outranked `grad clip` in instruction-finetuning (.9631) — a 0.3% gap deciding the
  whole order. Don't "fix" that class of bug by lowering Fuse's `threshold`; it would take
  inflection recall with it. Add ranking evidence instead.
- **Search prefix matching** (`prefixMatch`, drives highlighting, previews, deep links, and
  the overlap key): a query token matches its own longest prefix present in the text, but at
  least **half the token, min 3 chars**. Half is load-bearing — `clip` is 4/7 of "clipped" and
  must keep matching, while `cli` (3/7, from "**cli**mb") must not, so a flat 60% floor is
  wrong. Known wart: 2–4 char queries keep the 3-char floor, so "kl" still marks *quic**kl**y*
  and "clip" still marks *cli* in *climb*; both rank last now, but a word-boundary bonus is
  the real fix if it ever matters.
- **Search recall fallback** retries with end-trimmed tokens while *no hit has any literal
  overlap* — deliberately **not** gated on zero hits. A fully-typed inflection scores worse in
  Fuse than its own prefix ("sweeping" .9713 vs "sweepin" .9631), so "sweeping" returned two
  notes that don't contain "sweep" and missed the only one that does; the junk hits were
  exactly what suppressed the retry. A retry never replaces hits with none.
- **Search `<mark>` styling must be `.search-hit mark`**, not `.search-snippet mark` — both the
  title and the snippet get marks, and scoping it to the snippet left title marks on the
  browser default (black-on-yellow), which only shows up when a query matches a *title*.
  Unresolved: dark-mode marks are below the AA the rest of the palette holds to, because
  `color: inherit` puts low-contrast text on `--mark-bg` `#5c4d12` (snippet/muted 2.51:1,
  title/link 3.97:1). `color: var(--heading)` would take both to 7.28:1; user hasn't decided.
- **Verifying client-side JS** (search etc.): grepping `dist/` isn't enough — drive it with
  playwright headless against the dev server, `chromium.launch({ channel: 'chrome' })` to use
  installed Chrome (no browser download). Playwright is NOT installed globally or in the repo:
  `npm init -y && npm i playwright` in the session scratchpad first. Test scripts go in the
  scratchpad, not the repo. Capture console errors; that's how the 504 bug below was found.
  (Screenshot artifact: a dark pill-shaped Chrome-extension overlay can appear mid-page in
  headless screenshots — it's not part of the site.)
- **A literal `<token>` in prose must be backticked.** `<eos>` written bare is parsed as an HTML
  tag and vanishes from the output: no build error, no warning, the word is simply gone from the
  rendered page. Same silent-failure family as the blank-line-in-an-HTML-block rule below, and it
  bites whenever a note discusses special tokens (`<eos>`, `<|im_start|>`, `<think>`). Backticks
  also render it as code, which is what you want anyway. Check with
  `grep -c '<eos>' dist/notes/<slug>/index.html` (should be 0; the escaped form is `&#x3C;eos>`).
- **Math**: remark-math + rehype-katex are configured; `$...$` / `$$...$$` in any markdown.
  GFM footnotes (`[^name]`) work. Footnote sections are styled globally in Base.astro
  (`.footnotes`: divider + smaller muted text) and the auto-generated "Footnotes" h2 is
  **intentionally hidden** via `.sr-only` — its absence on the page is not a bug.
- **Bibliographies**: notes and blog posts can declare a `bibliography` array in frontmatter
  (schema in `src/content.config.ts`). `Entry.astro` renders a numbered section after the
  article's explanatory footnotes, under `h2#bibliography`. Each entry takes `id`, `authors`,
  `title`, `source`, `year`, `url`, plus optional `sourcePrefix` and `details`. Cite in prose
  with `[[1]](#ref-<id>)`; array order is **citation order, not alphabetical**. `sourcePrefix: in`
  gives the "in *NeurIPS*, 2023" form; a bare `source` gives the journal or preprint form.
  Spell authors in full up to about four names, then `First Author et al.`. Titles keep their
  own punctuation; the renderer omits the following comma for titles ending in `?` or `!`.
  Use bibliography entries for sources and GFM footnotes for explanations, derivations, and
  worked examples. Do not put a citation in a footnote or leave both numbering systems next to
  each other. `rl-for-llms.md` is the reference example. Verify author lists against the arXiv
  API rather than memory (`https://export.arxiv.org/api/query?id_list=<id>`, not plain HTTP).
- **Images**: compress before adding — `sips -Z 640 -s format jpeg -s formatOptions 80 in.jpg
  --out public/...` for photos; note figures go in `public/images/notes/`. To size an image
  down in markdown, use an inline `<img width="450">` tag instead of `![]()`. Diagrams saved
  from slides/web often carry huge white margins that push figcaptions away — trim them (no
  ImageMagick on this machine; use a Pillow venv in the scratchpad, `ImageChops.difference`
  vs white + `getbbox`). Cited figures use `<figure>`/`<figcaption>` (global styles in
  Base.astro); details in the publish-content skill.

- **Figure width is a DEFAULT-NARROW decision, and it is on you to make it without being
  asked.** The user has repeatedly had to come back and say an image is too big, so treat this
  as part of adding a figure, not a follow-up. Reach for `<figure class="narrow">` (caps at
  34rem, centred, global rule in Base.astro) as the default, and only leave a figure at the
  full 58rem prose column when shrinking it would actually cost legibility: a genuinely dense
  diagram with many small labels (`deepseek-r1-pipeline.png`, `ppo-vs-grpo.png`), or a wide,
  short screenshot where full width costs no vertical space anyway. A simple line chart with
  two axis labels, a three-box flow, or a bar chart with one caption is always `narrow`: at
  column width it eats a screenful of height for very little ink. Check with the rendered
  numbers, not the source file's pixels — measure `getBoundingClientRect()` per figure in
  playwright and look at the height. `narrow`'s `max-width` is `min(34rem, 100%)`, not a bare
  `34rem`, because a bare value overrides the global `img { max-width: 100% }` and overflows a
  phone viewport; always re-run the 390px overflow check after touching figure widths.
  Two ways the exemptions get over-claimed, both corrected by the user after the fact:
  **an annotated equation strip is not a "wide, short screenshot"** just because its aspect ratio
  is wide. The three REINFORCE figures went in at 880/880/1280 and all three were too big; at
  `narrow` (544px) the equation labels ("KL Penalty Coefficient", "Sample / Completion") are still
  perfectly legible. And **a dense diagram is only `.wide` if it fails at 880px**, not merely
  because it is dense: `reinforce-bandit-flow.png` has four token columns of numbers and reads
  fine in the plain prose column. Settle it by rendering the actual figure at 544 and 880 and
  looking, which takes one playwright pass, instead of arguing from the source file's pixels.
- **Wide diagrams**: `<figure class="wide">` breaks out of the 58rem prose column up to 1280px
  and scrolls below ~1024px instead of shrinking (global styles in Base.astro). Shrink-to-fit is
  right for a photo and wrong for a dense diagram: at column width the `train_async` SVG's 11px
  labels became ~7px. Verified no page-level horizontal scroll at 1440/1024/390 — the `100vw`
  breakout leaves 2.5rem of slack so the scrollbar can't push the body sideways.
  Known: an SVG carrying its own light background rect renders as a bright slab in dark mode
  (`/images/blog/train_async_diagram.svg` does, though the scheduling-RL post no longer embeds
  it — that image is now an orphaned asset, kept in case a future post wants it). That one is
  *written* against `currentColor` (26 uses), so inlining it into the page instead of
  `<img>`-ing it would make it theme-aware, but its two accents (`#4A90CF`, `#D98A24`) would
  then need retuning per theme — `#4A90CF` is only ~3.3:1 on white. User hasn't decided; the
  white-slab version is consistent with the white-background figures already in the notes.

- **A figure with a companion box beside it** (the PPO walkthrough in `actor-critic-methods.md`):
  a `<figure class="wide ppo-figure">` holding a flex `.ppo-row` of `<img>` + `<pre>`, with the
  layout CSS in a sibling `<style>` block in the note, not Base.astro. Two things to know before
  copying it. (1) **Specificity**: Base.astro's `figure.wide` rules are `0,1,1`, so a plain
  `.my-figure` override silently loses (the breakout stayed 1280px wide and `figure.wide img`'s
  `min-width: 1024px` stayed in force). Write the overrides as `figure.my-figure.wide`. (2) The
  box needs no styling of its own: the global `pre` rule is already `--surface` + 1px `--border`
  + 6px radius, which is exactly the boxed-code look, so a bare `<pre><code>` matches the theme
  in both modes for free. Side-by-side is the one case that justifies breaking out of the prose
  column against the deliberate no-breakout rule on Base.astro's `.figure-row`: 880px cannot
  hold a legible diagram *and* a second column. Below the width where the row fits, undo the
  breakout (`width: 100%; left: auto; transform: none`) and stack, rather than inheriting
  `figure.wide`'s horizontal scroll.

- **Inline `<svg>` diagrams** (hand-drawn box/flow diagrams written directly in the markdown,
  as in the scheduling-RL post): pick plain `<figure>` vs `<figure class="wide">` by comparing
  the diagram's `viewBox` width to the ~880px prose column, not by reflex — three diagrams at
  `viewBox="0 0 900 …"` were first shipped as `.wide` (breaking out to 1280px) and visibly
  overhung the text on both sides once compared side by side with the paragraphs; dropping
  `.wide` let them size to the column (900→880 is a ~2% shrink, no legibility loss). Reserve
  `.wide` for a diagram genuinely denser than the column, like `train_async_diagram.svg` above.
  A plain (non-wide) `<figure svg>` still needs `width: 100%; height: auto` in Base.astro's
  global styles — unlike `<img>`, a `viewBox`-only `<svg>` has no intrinsic size to shrink from
  and falls back to the browser's 300×150 replaced-element default without it. Color the boxes
  with the `--diagram-green/-blue/-purple/-orange` tokens (plus `-border` variants) in Base.astro
  rather than hardcoding hex, so they retune with the theme like everything else; text inside
  the SVG should stay on `currentColor`/`var(--text-muted)` for the same reason.
  **Never leave a blank line inside an HTML block** (a `<figure>…</figure>` or any raw HTML
  embedded in markdown) — CommonMark's raw-HTML-block rule ends at the first blank line, so
  everything after it reverts to markdown parsing; indented SVG child lines (4+ spaces deep from
  nesting) then read as an indented code block and get syntax-highlighted as literal text
  instead of rendering as a diagram. No build error, no warning — this only shows up as visibly
  wrong output, so if a `<figure>` renders as a wall of text, blank lines inside it are the
  first thing to check. Keep multi-part diagrams visually separated with comments or extra
  indentation, never blank lines.

- **Animated/interactive walkthroughs in a note** (the GRPO advantage demo in
  `group-relative-policy-optimization.md` is the reference): the site's no-client-side-JS rule
  bends when the user explicitly asks for an animation, but keep it dependency-free and
  self-contained. Pattern: a `<style>` block, the markup, and a `<script>` block as three
  *sibling* raw-HTML blocks in the markdown (blank lines **between** them are fine and in fact
  necessary; the blank-line ban applies only *inside* one block). Astro passes `<style>`/
  `<script>` in markdown straight through unprocessed, so plain DOM APIs work and nothing gets
  bundled. Rules that make it degrade well: base CSS state is the *finished* state (so no-JS
  readers get a static diagram, not an invisible one), animation only fires under a JS-added
  class, controls ship with the `hidden` attribute and are un-hidden by the script (no dead
  buttons without JS), the reveal is CSS keyframes staggered by an inline `--i` custom property
  rather than timers, playback starts on `IntersectionObserver` rather than page load (otherwise
  it's over before the reader scrolls to it), pause is `animation-play-state` and replay is
  `classList.remove(...)` + `void el.offsetWidth` + re-add to force a restart, and
  `prefers-reduced-motion` drops both the animation and the now-pointless pause button. Keep
  colours on theme tokens (or locally-defined `--gd-*` vars with a
  `:root[data-theme='dark']` override) so it works in both themes. Styles live in the note, not
  Base.astro, so a one-off widget's CSS doesn't load on every page.

- **LoRA rank explorer** in `efficient-llm.md`: the inline `.lora-rank-demo` widget compares one illustrative attention or FFN projection at a time. Keep A shaped `r × input`, B shaped `output × r`, and parameter count `r(input + output)`. Its SVG shapes are schematic; controls stay hidden without JS, with a static rank-8 example visible.

- **Tabbed code blocks** (`.code-tabs` in the PPO section of `rl-for-llms.md`): keep code in
  real fenced blocks so Astro's Shiki highlighting still applies. Deliberately break the raw
  HTML block: `<div class="code-tabs-pane">` on its own line, a blank line, the fence, a blank
  line, then `</div>`. Each HTML line is a separate CommonMark block; the output nests correctly.
  Base state shows all panes with filename labels. `.is-interactive` reveals the tab bar,
  hides labels, and collapses to one pane. Cap long listings at `max-height: 32rem`; a
  `.code-scroll` wrapper shares the same cap for standalone code. Keep these gotchas:
  `.code-tabs-bar[hidden] { display: none }` is needed to beat `display: flex`; Shiki uses
  `github-dark` in both themes, so match the bar to its `#24292e` background with local `--ct-*`
  variables; and scope stacked sibling spacing to `.code-tabs:not(.is-interactive)` because
  a hidden pane is still a previous sibling. Check every tab, not just the first.

- **Table of contents** (`Entry.astro`): built from Astro's `render()` headings, listing h2,
  h3, and h4 with progressively deeper indentation, filtering `footnote-label`, and appending the separately rendered bibliography.
  Fewer than three entries means no TOC. One `<details id="entry-toc">` is a working disclosure
  without JS; JS sets `open` and `.is-rail` at `min-width: 1320px` to match the CSS breakpoint.
  On narrower screens it collapses after clicking a link. Keep both breakpoint values in sync.
  Anchor the fixed rail with both `left` and `right` plus `max-width` so it fits the available
  margin. Use `.toc li.toc-sub`, not a bare `.toc-sub`, to beat `.toc li` specificity. Mark the
  active item with colour and a bullet, **never `font-weight`**, which would re-wrap the list.
  Scroll-spy uses a rAF-throttled listener and the last heading past the trigger line, with a
  bottom-of-page clamp, not IntersectionObserver. For long lists, nudge `toc.scrollTop` using
  `getBoundingClientRect()`, not `offsetTop` (the fixed/relative offset parents make it wrong)
  or `scrollIntoView()` (which also moves the page).
  Wide figures would overlap the rail: Base.astro's `article.has-toc figure.wide` uses
  `left: auto; transform: none` to grow right from the prose column and a `max-width` clamp
  rather than competing with widths defined inside notes. Recheck figure-left versus rail-right
  at 1920/1600/1440/1320/1319px after touching either feature.

- **"Up next" list**: `src/components/UpNext.astro`, used by `notes/index.astro` and
  `blog/index.astro`, each passing its own `planned` array of plain topic strings. These are
  deliberately not links or content entries because no page exists yet. Remove a topic when
  its note or post ships. Rows use a hollow `○` marker and no border; keep the styling shared
  in the component rather than duplicating it on both pages.

- **Logos** for timeline entries: `curl -sL -o public/logos/<domain>.png
  "https://www.google.com/s2/favicons?domain=<domain>&sz=128"`.
- **A small logo/icon PNG with an opaque white background** (e.g. `public/logos/arxiv.org.png`,
  used in `.paper-links`) is the same white-slab-in-dark-mode problem as the wide-diagram SVGs
  above, for a raster asset: chroma-key the white to transparent instead of leaving it. Compute
  alpha per pixel from `255 - min(r,g,b)` (distance from pure white) with a small threshold
  (~40) below which alpha ramps to 0 and above which it's fully opaque — this keeps a soft edge
  on anti-aliased pixels near the background while leaving saturated foreground colors
  (including grays that read as "light" by pure luminance) fully solid. A flat luminance
  threshold or a hard cutoff both misfire here: gray strokes near-white in brightness would
  either vanish or keep a visible fringe. Pillow venv in the scratchpad, same as the
  white-margin-trimming recipe elsewhere in this file. Verify by compositing onto a dark swatch
  before trusting it, not just by eyeballing the PNG on this tool's (white) preview background.
- The homepage header hides the site name (`hideSiteName` prop on Base) because the hero shows
  it; subpages show it top-left.
- **Intentional easter eggs — do not remove**: the HTML comment in Base.astro, the console.log
  in the theme script, and `public/humans.txt` (credits: Claude Code, Karpathy/Weng design
  inspiration).
- User's email: vgandhi@umass.edu. LinkedIn: varunriteshgandhi. Scholar ID: RCLwIEMAAAAJ.

## Current state / open TODOs

- **Analytics undecided**: user wants per-page views + referrers; GoatCounter was
  recommended (free, no-cookie, one script tag in Base.astro). Wire it in when they decide.
- Blog contains the scheduling-RL post. `src/content/blog/example-post.md` remains a
  `draft: true` template.
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

- **Philosophy asides**: notes in ignored `.private/philosophy-notes.json` may set `presentation: "aside"` to render as a smaller standalone footnote beneath the Philosophy notes, outside subcategory filters. The title becomes an accessible label; the body stays visible after unlocking. Keep the stable id and added date. Encrypt and build after edits.

- **Category filter toggles**: Learnings, Finance, Social Sciences, and Philosophy subcategories support multiple selections (intersection / AND matching). Thoughts alone uses single selection via `renderTaggedEntries(..., { multiple: false })`: clicking a category replaces the previous choice; All resets the list. In the collections with multiple selections, clicking another category keeps existing selections; clicking a selected category removes it. All clears selections, and deselecting the last category returns to All. Card tags share the toggle state. Shared-link resets and relocking still clear filters.

- **Long collection entries**: `renderEntries` collapses bodies over 650 visible text characters to an 11.5em preview, with a Read more/down-arrow button and Read less on expansion. Short cards stay unchanged. Attribution, tags, source, and share controls remain outside the preview. Shared links expand the target before scrolling; relock removes disclosure state with private DOM. Collapsed body links leave the Tab order until expansion. Styles are global under `.collections`.

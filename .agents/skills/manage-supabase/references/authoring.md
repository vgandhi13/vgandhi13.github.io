# Content and settings authoring

## Source of truth

Supabase is the sole content source. A Table Editor or MCP change takes effect on the next load without redeployment. Per-collection JSON sources and working image copies have been retired. Inspect the current database row before editing it; use complete snapshots for backups.

For an ordinary content request, use targeted inserts or updates through the connected Supabase MCP. Avoid replacing the entire database snapshot just to add one entry. Read back the affected database data after writing. Do not recreate local authoring copies or an encryption workflow.

## Tables and fields

`collection_entries` has `owner_id`, `id`, `collection`, `position`, and `content` JSONB. Its primary key is `(owner_id, id)`, so ids are unique across all collections for an account. `content.id` must equal the row's `id`. `position` is a nonnegative display order within the source collection.

| Database collection key | Display |
| --- | --- |
| `ideas` | Ideas; shuffled after loading |
| `history` | Stories, with History added as a filter tag |
| `inspiration` | Stories; defaults to Inspiration unless tagged otherwise |
| `psychology` | Psychology |
| `neuroscience` | Neuroscience |
| `learnings` | Learnings with tag filters |
| `thoughts` | Thoughts |
| `finance` | Finance |
| `social-sciences` | Social Sciences |
| `philosophy` | Legacy Philosophy entries |
| `philosophyNotes` | Philosophy disclosures and subcategories |
| `firstPrinciples` | First Principles disclosures |

`stories` is a combined UI panel, not a database collection key. Do not merge or rename the two source collections to match it.

Entries use the existing Entry fields: explicit stable `id`, `added` ISO date, `text` as a string or paragraph array, and at most one of `author`, `subject`, or `title`. Optional fields include `tags`, `note`, source attribution, image metadata, and inline SVG. A titled entry with `text: []` is a valid placeholder. Learnings subcategories are entry tags, not separate tables. Read their actual names from private data rather than putting them in public documentation.

Notes use `id`, `title`, `added`, `body` as trusted HTML, and optional `summary`, `presentation`, or `subcategory`. An empty body is a valid placeholder. Follow the user’s content classification and AGENTS.md's writing and figure conventions.

Use `validateEntries`, `validatePrinciples`, and, for a complete snapshot, `validatePrivateContent` from `src/lib/collection-content.js`. Per-entry validation does not check all database ids, so also check for an existing id and preserve reserved panel/legacy hash names.

## Targeted edit workflow

1. Read the owner identity from ignored setup state. Verify the connected project and inspect only the destination rows needed for the task.
2. Clean the supplied prose and attribution without changing its meaning. Preserve existing ids; give new entries an explicit id and the user's current local date as `added`.
3. Validate the new or revised object. New entries append at the destination collection's next `position`, unless the user requests another order.
4. Use structured SDK arguments when available. For MCP SQL, serialize JSON and escape SQL string literals correctly; do not interpolate raw user prose into executable SQL. Scope `WHERE` clauses and inserts to the owner, and use a transaction when changing related rows/settings.
5. Read back the affected row and verify its collection, position, and content. Keep any requested backup in ignored `.private/backups/`; do not overwrite unrelated rows.

There is no public browser editing interface in the current implementation. Do not imply that logging into Collections exposes an editor; authoring is through MCP or the Supabase Table Editor.

## Settings

`collection_settings` has one row per `owner_id`, with a `content` JSONB object. Update only the requested key, preserving the others: `descriptions`, `learningCategories`, `thoughtCategories`, `socialScienceCategories`, or `hourglass`.

Populated category filters usually come from entry `tags`; the category arrays also support empty categories. Preserve Stories' source-specific tagging and the existing single-select versus multi-select filter behavior.

## Images and HTML

The current database embeds raster images as data URIs inside entry JSONB. No Supabase Storage bucket was created. Encode new raster images into data URIs on the client before writing entries. Stage source files temporarily outside tracked public assets.

The renderer accepts supported raster data URIs, not arbitrary private Storage URLs. Moving to signed URLs requires a renderer and storage-policy change, not just changing `image.src`. Inline SVG uses `svg.markup`. Note body images also stay embedded or inline. Preserve `alt`, width, color treatment, and credits. Do not accumulate duplicate working image files after a verified upload; archive a unique original if needed.

Bodies, commentary, and SVG are trusted author-controlled HTML, as before migration. Do not introduce writes from untrusted visitors into those fields without revisiting this trust boundary.

## Backup commands and restore

- `npm run collections:check`: authenticated read and anonymous-access checks.
- `npm run collections:export`: complete readable snapshot under ignored `.private/backups/`, with embedded images.

These commands read `.env` and optional ignored `.private/supabase-login.json` containing `email` and `password`. That login file may not exist; it was not needed for the MCP migration. Do not ask for passwords in chat. Prefer the already-connected MCP for ordinary authoring.

For a restore, validate an explicitly selected snapshot with `validatePrivateContent`, reconcile newer database changes, and use the existing authenticated `replace_collection_content(entries, settings)` RPC within the user's authorized restore scope. It replaces that owner's full snapshot transactionally. The old source-directory import command was removed; backups are snapshots rather than ongoing local content sources.

The initial verified JSON snapshot remains under `.private/backups/`. One unmatched original image and two unmatched raw drafts were preserved separately in a source-material archive during cleanup. Treat these as backups, not active authoring inputs.

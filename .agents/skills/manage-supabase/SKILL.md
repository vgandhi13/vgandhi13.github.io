---
name: manage-supabase
description: Manage this site's Supabase-backed Collections, including adding or revising private entries, login and passkeys, database migrations, backups, and deployment configuration. Use for private Collections content requests even when Supabase is not named. Homepage, notes, and blog authoring use their existing skills.
---

# Manage Supabase Collections

Keep this site's Collections private and maintainable while the rest of the Astro site stays static on GitHub Pages. This skill describes this repository's implementation, not a template for unrelated Supabase projects.

## Establish the current state

Read ignored `.private/supabase-setup.json` for the project reference, owner account, and last verified setup state. Read only the needed connection variables from ignored `.env`; do not print secrets. Confirm the intended project through available Supabase tools before remote writes. Local state can become stale, so verify whichever live facts the task depends on.

The initial setup on November 6, 2026 imported and verified 116 entries, images, and settings. Email/password login worked locally. Production passkeys and GitHub build variables were configured. At skill creation, publishing the code and enrolling the actual Apple passkey were still pending. Check local state and the live site before treating either step as done.

Choose the relevant reference:

- **Add or edit content, categories, or settings:** [Authoring](references/authoring.md).
- **Connect MCP, configure login/passkeys, diagnose access, or prepare deployment:** [Operations](references/operations.md).
- **Change schema, import a large snapshot, or verify a migration:** [Migrations and verification](references/migrations.md).

Do not load every reference for a small content edit.

## Implementation map

| File | Responsibility |
| --- | --- |
| `src/pages/collections.astro` | Static shell, login form, required connection settings, passkey controls |
| `src/lib/collections-page.js` | Login/cancel/lock lifecycle, tabs, shared links, mounting cards |
| `src/lib/supabase-collections.js` | Official SDK client, paginated reads, session disposal |
| `src/lib/collection-content.js` | Shared validators and card renderers |
| `scripts/sync-collections.mjs` | Authenticated check and backup export commands |
| `supabase/migrations/` | Tracked schema only, with filenames matching applied migration versions |
| `.github/workflows/deploy.yml` | Supplies public Supabase variables to the static build |

## Keep these invariants

- The user chose ordinary private database records protected by login and row-level security. Do not silently restore browser-only encryption or replace the authentication provider.
- Both `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are required to build. Supabase is the sole content source. The encryption fallback, old password, bundle, and local authoring copies have been removed; do not recreate them.
- A publishable key can ship in the browser. A secret/service-role key, password, login token, readable collection content, and private assets must not enter tracked files, public assets, build output, or logs. Keep `.env` and `.private/` ignored.
- MCP SQL is privileged and can bypass row-level security. Scope every content mutation to the intended owner. A successful admin query does not prove that ordinary browser access is correctly restricted.
- Preserve stable ids and share links. Collections use shared validators, card HTML, filters, disclosures, and hourglass events after authenticated loading.
- Sessions stay in memory. Reloading signs the user out; relocking clears private DOM and signs out the session. Canceled or superseded login attempts must not reveal content later.
- Use existing user authorization for the requested work. This skill does not authorize unrelated publication, account access, or destructive replacement. Preserve the repository's Gemma 4 publishing restriction.

## Finish the requested scope

For content-only database edits, read back the affected data. Do not recreate per-collection local JSON copies. Use an ignored snapshot backup when needed; database content changes need no rebuild or deployment.

For repository changes, run `npm run build` and inspect the relevant built HTML. Exercise actual browser behavior when changing client-side code. Follow AGENTS.md for starting or reusing the development server. Report backend setup, local verification, live deployment, and real passkey enrollment as distinct states.

# Migrations, bulk transfers, and verification

## Existing schema

The initial schema is tracked at `supabase/migrations/20261106200531_collections.sql`. It was already applied remotely with the name `collections`. Do not apply it again. Its filename was aligned with `list_migrations` after MCP assigned the actual version, so future CLI workflows do not mistake it for a missing migration.

`collection_entries` and `collection_settings` use owner-scoped row-level security plus membership checks. `collection_members` permits a signed-in user to see only their own membership and has no browser write grant. The import RPC, `replace_collection_content(entries, settings)`, is `SECURITY INVOKER`, fixes its search path, derives the owner from `auth.uid()`, and requires approved membership. A failed import rolls back its deletes and inserts. Anonymous callers cannot execute it.

For a schema change, inspect the current tables and migration history, consult the current Supabase Postgres guidance when available, and apply a new migration. Preserve existing policies and data unless the requested change calls for altering them. Avoid embedding generated user ids or private content in tracked migrations.

## Initial large import findings

The verified source had 116 entries and approximately 3.3 MB of JSON, mostly embedded images. The now-retired source loader validated the separate ignored source files and expanded raster paths into data URIs. Its output matched the old encrypted snapshot before migration. Those working sources and encryption code were subsequently removed after preserving verified backups.

A single MCP SQL request carrying the full snapshot failed with **“Request body is too large.”** It was rejected before any rows or membership were created. Five bounded batches succeeded; the largest successful SQL query was about 850,000 characters. This is an observed working size, not a documented service limit. Leave room for JSON/SQL escaping and use smaller batches if needed.

For a comparable new-project import:

1. Confirm the owner Auth account exists and is confirmed; confirm the destination has no entries that would be replaced.
2. Load and validate local content on the client. Build structured row data with the existing ids, collection keys, positions, and content.
3. Insert bounded owner-scoped batches under the already-authorized admin connection. Keep the new account's membership absent until the complete import is verified, so partially staged content stays inaccessible through the browser.
4. Verify every entry, its collection/order, and the settings against the source. Activate settings and membership only after verification. Keep local originals and an ignored verified backup.

That staging approach was for a new empty project. Do not disable an existing user's membership or clear their data as a routine retry. If a batch fails, inspect what was actually committed and resume within the original import scope; do not blindly repeat successful inserts or replace newer data.

The source-directory CLI import was removed during cleanup. For an authorized restore, validate a selected snapshot and use the existing transactional import RPC; reconcile newer database edits first.

## Transferring private data through tools

Private content belongs in the explicitly approved Supabase project. Do not paste it into tracked SQL files, public docs, or user-facing progress output.

For the initial import, the persistent Node REPL read local source files and built SQL. `functions.exec` consumed that tool result directly and called the Supabase SQL tool, printing only batch counts and success metadata. This avoided copying megabytes of image data through the model or echoing plaintext in progress messages. Check for tool errors and incomplete/truncated transfers before executing generated SQL. Escape JSON as SQL data, never as executable prose.

SQL executes on Supabase's server. Client-side file loading does not authorize SQL server-file access, OS commands, or reading credentials through the database.

## Exact comparison without downloading large images again

For small updates, read back and compare the affected JSON directly. The initial bulk verification compared a client-computed digest for every source entry with `md5(content::text)` from Postgres, alongside its id, collection, and position. Settings were checked separately. All matched.

Plain `JSON.stringify()` is not the same representation as Postgres `jsonb::text`. For this source's ordinary JSON values, this serializer reproduced its spacing and key order:

```javascript
const pgJson = value => Array.isArray(value)
  ? '[' + value.map(pgJson).join(', ') + ']'
  : value && typeof value === 'object'
    ? '{' + Object.keys(value)
        .sort((a, b) => Buffer.byteLength(a) - Buffer.byteLength(b)
          || Buffer.compare(Buffer.from(a), Buffer.from(b)))
        .map(key => JSON.stringify(key) + ': ' + pgJson(value[key]))
        .join(', ') + '}'
    : JSON.stringify(value);
```

Hash its UTF-8 bytes with Node's `createHash('md5')`. This verifies transfer fidelity, not security authenticity. Do not assume this serializer covers every numeric representation Postgres can produce; if it disagrees for new content types, compare parsed JSON or SQL JSONB equality instead of treating the digest mismatch as data loss. Avoid recreating this machinery for a one-paragraph edit.

## Verification that matters

- Privileged MCP reads verify stored content, not the browser's access boundaries. Verify actual anonymous REST requests with only the publishable key; the live setup rejected reads on all three tables with 401/403.
- Under authenticated SQL role/JWT claims, the owner could see 116 entries and one settings row. An unapproved identity saw no private rows and could not grant itself membership, write settings, or invoke the import RPC. Use transactions and roll back fixture changes.
- Local PostgreSQL tests also checked cross-owner isolation and rollback after a duplicate-id import failure. Temporary test tools and scripts stayed outside the repository.
- Headless Chrome tests verified password login, passkey enrollment/login with a virtual WebAuthn authenticator, pagination beyond 100 rows, filters, shared links, cancellation, relocking, no persisted Supabase session, and a 390px layout. The user separately confirmed real email/password login against the live backend through the local site.
- For client changes, exercise the relevant behaviors again with fixtures or the live user flow as appropriate. A virtual authenticator does not verify Apple Touch ID hardware or complete enrollment for the user.
- Run the required Astro build for repository changes. Built Collections HTML should contain the login form and public connection values, with neither private entry content nor `philosophy-payload`. There should be no secret/service-role key in source or output. Missing connection variables must fail the build; there is no encrypted fallback.

References: [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [database testing](https://supabase.com/docs/guides/database/testing/overview).

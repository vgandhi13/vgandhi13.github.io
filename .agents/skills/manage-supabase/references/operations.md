# Connection, authentication, and deployment

## MCP connection

Inspect available tools first. The existing server is named `supabase` and is scoped to the project recorded in `.private/supabase-setup.json`. Its configured URL follows this shape:

```text
https://mcp.supabase.com/mcp?project_ref=PROJECT_REF&features=database,development
```

The connection was added with `codex mcp add supabase --url '...'`, followed by the normal OAuth flow. The user approved Supabase's organization-level API permissions; the server's `project_ref` restricts this connection's tools to the intended project. Do not silently remove that scope or replace an already working connection.

Use `get_project_url` and `get_publishable_keys` to verify client connection details. Inspect existing tables before schema changes; use `apply_migration` for DDL and `execute_sql` for scoped data changes. MCP SQL runs on the remote database: never use server-file or OS access through SQL.

The installed server exposes database/development tools, not Auth configuration methods. For settings absent from MCP, guide the user through the exact dashboard page. Collections content edits use MCP; do not request Chrome access for them.

### MCP connection recovery

1. Discover deferred Supabase tools before assuming they are absent. In this runtime, filter `ALL_TOOLS` for names containing `supabase`, then call the matching method through `tools` in `functions.exec`. Working names include `mcp__supabase__get_project_url` and `mcp__supabase__execute_sql`. Rediscover after a reconnect or a new tool-availability notice; an earlier empty list does not establish the current state.
2. If tools are still missing, inspect `codex mcp get supabase` (or `codex mcp list`) to confirm the configured server and project scope. `Auth: Unknown` alone does not prove an authentication failure. Generic MCP resource listing is not a tool inventory: Supabase can return `-32601: Method not found` for `resources/list` while its database tools work. Do not treat that response as a login failure.
3. If the configured server is enabled but its tools remain missing, or a call reports an OAuth failure, run `codex mcp login supabase` once as the normal recovery step. Do not require an explicit authentication error before trying it, and do not make the user suggest the sign-in command. Missing tools and `Auth: Unknown` do not establish the cause; describe login as a recovery attempt, not proof that credentials expired. If the sandbox denies the command, request the normal execution escalation rather than trying browser control. Give the user the emitted authorization link, let them authorize in their browser, then poll the running command for `Successfully logged in to MCP server 'supabase'`. Do not save OAuth links or tokens in this skill.
4. After successful login, rediscover tools and test `get_project_url` when it becomes available. Tool availability can update later in the same conversation: rediscover on each retry and immediately after a tool-availability notice, including one that arrives after an empty discovery result. Distinguish successful authentication from tools still being unavailable. If discovery still fails after login, request one connection restart or a fresh project conversation, then check again when the user returns. Do not repeat login after it succeeded unless a new authentication error appears, or loop through restart requests without new evidence.
5. **Claude Code** uses its own MCP config, separate from Codex, and has no command-line login. If `claude mcp get supabase` shows no server, add it with `claude mcp add --transport http -s local supabase '<URL above>'`. The user may need to approve that config change. A server added partway through a session may not load until the session restarts. If it shows "Needs authentication", ask the user to run `/mcp`, choose `supabase`, then Authenticate; this opens the same browser approval Codex used. Then load the tools with ToolSearch (`select:mcp__supabase__execute_sql`).
6. Once tools are available, verify the project URL against ignored setup metadata, inspect the destination rows, validate the entry, perform the owner-scoped write, and read it back. Continue the original content request without asking for permission again. No Chrome access, Collections password, rebuild, or deployment is needed for this flow.

## Public connection versus credentials

- `.env` holds `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The URL is the HTTPS project base, without `/rest/v1/`. The frontend expects a modern `sb_publishable_` key.
- The publishable key identifies the app/project. The user's login token and database rules determine private access. The public key is intentionally present in browser HTML.
- Secret/service-role keys bypass important restrictions and never belong in frontend variables or tracked files. A secret was pasted into the original conversation; rotation was recommended, but completion was not verified. Do not reuse or copy it from chat history. No such key was needed for the MCP migration.
- The database password, Supabase dashboard login, and Collections account password are different credentials. Do not substitute one for another. The legacy encryption password was retired with the fallback.

## Email/password and membership

The user created a confirmed email/password account through Authentication > Users. Login credentials were entered by the user, not stored in the skill or repository.

`collection_members` is administrator-managed. Merely creating an Auth account grants no Collections data. Approved accounts can only read or write rows with their own `owner_id`; membership writes are denied to ordinary browser clients. Anonymous users cannot read any of the three Collections tables. Refer to the migration for the actual policies rather than inventing broader ones.

The setup guide recommended disabling public signups, but that setting was not verified during the initial setup. Do not claim it is disabled. The allowlist remains the database access boundary regardless.

Entering `/collections/` opens the login dialog immediately, including navigation from the footer's 🧠 link and shared entry links. After canceling, one click on the heading opens it again; pressing Enter or Space on the heading button also works. Clicking the heading while signed in relocks. One successful login mounts all the existing panels. The password field keeps `name="password"` and `autocomplete="current-password"`; email uses the username autofill hint.

The SDK uses `persistSession: false`, `autoRefreshToken: false`, and `detectSessionInUrl: false`. Sessions remain in memory. Relock disposes of the client and signs out locally without revoking the user's sessions on other devices. A stale, canceled, or superseded login must not mount content. Passkey enrollment after session expiry requires signing in again.

## Live Collections updates

`20261116193849_collections_live_updates.sql` adds triggers for entry and settings inserts, updates, and deletes. They use `realtime.send` to send an empty private `change` signal to `collections:<owner id>`. Supabase adds a message id; private content is never copied into notification payloads. The SELECT policy on `realtime.messages` permits only the matching authenticated owner with Collections membership. No client broadcast write policy is granted, and the content tables keep their existing RLS.

`watchCollections` in `src/lib/supabase-collections.js` subscribes after login, debounces signals, and reloads through the existing authenticated, paginated, validated reader. It also refreshes on subscription/reconnection, returning to the tab, and coming online. Transient read failures retry; denied reads relock. There is no continuous polling. Relocking aborts pending reads, removes listeners and channels, and clears private DOM. Sessions still stay in memory with automatic auth refresh disabled.

`mountContent` in `src/lib/collections-page.js` preserves the current tab, filters, disclosures, expanded cards, focus, and reading position. Unchanged panels reuse their DOM, so an unrelated update does not reshuffle Ideas. Replacement rendering temporarily detaches the old private DOM to avoid duplicate-id validation failures and restores it if rendering fails. Keep late responses from canceled sessions from mounting content.

Verification used browser fixtures for live insert/delete/settings, preserved UI state, relocking during a delayed response, fresh login, and 390px layout. Transactional database checks verified signals for insert/update/delete/settings and owner, cross-owner, unapproved-user, and anonymous authorization; fixture changes rolled back. A real signed-in WebSocket session must be distinguished from these fixture and SQL checks. The backend migration is applied; publishing frontend changes follows the normal authorized deployment flow.

## Apple passkeys

Production configuration was saved by the user and a live authentication challenge confirmed the relying party id:

- Display name: `Varun Gandhi Collections`
- Relying party id: `vgandhi13.github.io`
- Allowed origin: `https://vgandhi13.github.io`

The code uses the official Supabase SDK's `signInWithPasskey()` and `registerPasskey()`, with explicit passkey opt-in in client options. Supabase's documentation labeled this experimental during setup; check current official documentation when changing the SDK or configuration.

`PUBLIC_SUPABASE_PASSKEYS=true` enables controls for a supported secure browser. After deploying, the user signs in with email/password and chooses **Add passkey**, then completes the native Apple Passwords/iCloud Keychain and Touch ID/Face ID prompt themselves. Subsequent sign-ins can use **Sign in with passkey**. Password login remains available. The site receives no fingerprint data.

Production passkeys cannot be enrolled on localhost. The local `.env` leaves the passkey flag false; the GitHub build variable is true. Changing the relying party domain invalidates the applicability of existing credentials and requires new enrollment. Configuring the backend or testing with a virtual authenticator does not mean the user's real Apple passkey has been registered.

## Deployment

The public site remains on GitHub Pages. Supabase is a separate backend; do not move the whole website to a new hosting platform to finish this integration.

The workflow reads these GitHub repository **Actions variables**, not secrets:

```text
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_PUBLISHABLE_KEY
PUBLIC_SUPABASE_PASSKEYS
```

They were configured for this repository during setup. Local `.env` is not available to GitHub's build. Confirm current variable state when diagnosing a deployment instead of committing `.env`. Use the normal GitHub Pages workflow and preserve the Gemma 4 publishing restriction and unrelated working-tree edits. Publishing still needs authorization in the current task; a skill never grants it. The user authorized the Supabase-only cleanup and push on November 6, 2026.

At completion, distinguish: backend configured, local login verified, frontend deployed, and actual passkey enrolled. Update the ignored setup-state file after verifying each step; avoid repeatedly copying mutable status into public documentation.

## Operational findings

- Restarting Codex stopped the dev server. Check the printed URL and an HTTP response before sending the user to localhost. Reuse an existing server; request the normal execution permission if the sandbox rejects listening on the port. Do not start multiple servers just because a sandboxed network probe fails.
- A sandboxed `gh auth status` reported an invalid token, while the permitted network check confirmed the existing keyring login worked. Verify network access before telling the user to reauthenticate.
- Follow AGENTS.md's Vite cache guidance if dependency changes cause client failures. Do not mistake a stale dev cache for a broken production build.
- A local Collections login can report a generic load failure when the dynamically imported
  Supabase SDK returns `504 Outdated Optimize Dep`. Clear `node_modules/.vite` and restart
  dev, then reload the affected browser. Login errors now distinguish code loading,
  sign-in, private data loading, and rendering without showing raw errors or credentials.
- Free Supabase projects can pause for low database activity. Resume through the dashboard if that is the cause of an outage; recheck current Supabase policy before giving timing, retention, or pricing advice.

References: [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [password authentication](https://supabase.com/docs/guides/auth/passwords), [passkeys](https://supabase.com/docs/guides/auth/passkeys), [MCP](https://supabase.com/docs/guides/ai-tools/mcp).

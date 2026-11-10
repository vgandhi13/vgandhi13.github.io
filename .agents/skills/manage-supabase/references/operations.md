# Connection, authentication, and deployment

## MCP connection

Inspect available tools first. The existing server is named `supabase` and is scoped to the project recorded in `.private/supabase-setup.json`. Its configured URL follows this shape:

```text
https://mcp.supabase.com/mcp?project_ref=PROJECT_REF&features=database,development
```

The connection was added with `codex mcp add supabase --url '...'`, followed by the normal OAuth flow. The user approved Supabase's organization-level API permissions; the server's `project_ref` restricts this connection's tools to the intended project. Do not silently remove that scope or replace an already working connection.

After initial authentication, the CLI reported “Successfully logged in,” but the already-running conversation still had no Supabase tools. Restarting Codex and continuing the conversation loaded them. If tools are missing, check configuration and authentication before requesting another login. `codex mcp list` showing `Auth: Unknown` alone was not evidence that the completed OAuth flow failed.

Use `get_project_url` and `get_publishable_keys` to verify client connection details. Inspect existing tables before schema changes; use `apply_migration` for DDL and `execute_sql` for scoped data changes. MCP SQL runs on the remote database: never use server-file or OS access through SQL.

The installed server exposes database/development tools, not Auth configuration methods. For settings absent from MCP, use the supported Supabase dashboard or guide the user through that exact page. If native browser control stalls or reports screenshots unavailable, avoid repeated attempts that interrupt the user's browser; provide a direct dashboard link and precise instructions.

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

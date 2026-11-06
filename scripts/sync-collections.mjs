import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCollectionsClient, closeCollectionsClient, entryCollections, loadCollections } from '../src/lib/supabase-collections.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const command = process.argv[2];
if (!['check', 'export'].includes(command) || process.argv.length !== 3) {
  console.error('Use npm run collections:check or collections:export.');
  process.exit(1);
}

// The public connection details live in .env. Login credentials are read only
// from the ignored local file, never from shell arguments or public variables.
try { process.loadEnvFile(resolve(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key?.startsWith('sb_publishable_')) {
  console.error('Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env first.');
  process.exit(1);
}

let client;
try {
  const { email, password } = JSON.parse(await readFile(resolve(root, '.private/supabase-login.json'), 'utf8'));
  client = createCollectionsClient(url, key);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const signal = AbortSignal.timeout(120_000);
  const content = await loadCollections(client, signal);
  const count = entryCollections.reduce((sum, key) => sum + content[key].length, 0);
  if (command === 'export') {
    const path = resolve(root, '.private/backups', `supabase-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(content, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    console.log(`Exported ${count} entries to an ignored .private/backups/ file.`);
  } else console.log(`Authenticated access verified: ${count} entries loaded.`);
  // Check the actual API without a user token, using only the public key.
  for (const table of ['collection_entries', 'collection_settings', 'collection_members']) {
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}?select=*&limit=1`, {
      headers: { apikey: key }, signal,
    });
    if (response.ok && JSON.stringify(await response.json()) !== '[]') {
      throw new Error('Anonymous access unexpectedly returned private data. Check database policies immediately.');
    }
    if (!response.ok && ![401, 403].includes(response.status)) throw new Error('Could not verify anonymous access denial.');
  }
  console.log('Anonymous API requests cannot read Collections data.');
} catch (error) {
  // Do not print SDK/database error details, which can contain private row data.
  const messages = [
    'Anonymous access unexpectedly returned private data. Check database policies immediately.',
    'Could not verify anonymous access denial.',
  ];
  console.error(messages.includes(error.message) ? error.message :
    'Collections sync failed. Check .env, the ignored login file, account membership, and the SQL migration.');
  process.exitCode = 1;
} finally {
  if (client) await closeCollectionsClient(client).catch(() => {});
}

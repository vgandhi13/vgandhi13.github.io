import { createClient } from '@supabase/supabase-js';
import { validatePrivateContent } from './collection-content.js';

export const entryCollections = [
  'philosophy', 'firstPrinciples', 'philosophyNotes', 'ideas', 'history',
  'psychology', 'neuroscience', 'learnings', 'thoughts', 'inspiration',
  'finance', 'social-sciences',
];

// One client per login attempt. Neither credentials nor sessions go into storage.
// Keeping clients separate prevents a canceled login from replacing a newer one.
export function createCollectionsClient(url, key) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      experimental: { passkey: true },
    },
  });
}

export async function loadCollections(client, signal) {
  // The settings row also proves this account has been provisioned. An account
  // with no access must not look like a successfully loaded empty collection.
  const { data: settings, error } = await client.from('collection_settings')
    .select('content').single().abortSignal(signal);
  if (error) throw error;

  const content = Object.fromEntries(entryCollections.map(key => [key, []]));
  Object.assign(content, settings.content);
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data: rows, error } = await client.from('collection_entries')
      .select('id,collection,content').order('position').order('id')
      .range(offset, offset + pageSize - 1).abortSignal(signal);
    if (error) throw error;
    for (const row of rows) {
      if (!entryCollections.includes(row.collection) || row.content?.id !== row.id) {
        throw new Error('Invalid collection entry.');
      }
      content[row.collection].push(row.content);
    }
    if (rows.length < pageSize) break;
  }
  signal?.throwIfAborted();
  validatePrivateContent(content);
  return content;
}

export async function closeCollectionsClient(client) {
  if (!client) return;
  try {
    // Local scope signs out this session without revoking sessions on other devices.
    await client.auth.signOut({ scope: 'local' });
  } finally {
    await client.auth.dispose();
  }
}

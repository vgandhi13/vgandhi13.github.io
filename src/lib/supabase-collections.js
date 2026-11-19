import { createClient } from '@supabase/supabase-js';
import { validatePrivateContent } from './collection-content.js';

export const entryCollections = [
  'philosophy', 'firstPrinciples', 'philosophyNotes', 'ideas', 'history',
  'psychology', 'neuroscience', 'learnings', 'thoughts', 'inspiration',
  'finance', 'social-sciences', 'concepts',
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
    await client.removeAllChannels();
    client.realtime.disconnect();
    // Local scope signs out this session without revoking sessions on other devices.
    await client.auth.signOut({ scope: 'local' });
  } finally {
    await client.auth.dispose();
  }
}

// Broadcasts carry only an invalidation signal. Private data still passes through
// the same authenticated reads and validation as the initial load.
export function watchCollections(client, onContent, onAccessLost) {
  const controller = new AbortController();
  let channel;
  let timer;
  let loading = false;
  let dirty = false;
  const refresh = async () => {
    if (controller.signal.aborted) return;
    if (loading) { dirty = true; return; }
    loading = true;
    try {
      const content = await loadCollections(client, controller.signal);
      if (!controller.signal.aborted) onContent(content);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.status === 401 || error.status === 403 || ['42501', 'PGRST301', 'PGRST302', 'PGRST303', 'PGRST116'].includes(error.code)) {
        onAccessLost();
      } else {
        clearTimeout(timer);
        timer = setTimeout(schedule, 10000);
      }
    } finally {
      loading = false;
      if (dirty && !controller.signal.aborted) { dirty = false; schedule(); }
    }
  };
  const schedule = () => {
    if (controller.signal.aborted) return;
    clearTimeout(timer);
    timer = setTimeout(() => { void refresh(); }, 150);
  };
  const visible = () => { if (!document.hidden) schedule(); };
  document.addEventListener('visibilitychange', visible);
  window.addEventListener('online', schedule);
  void (async () => {
    const { data, error } = await client.auth.getSession();
    if (controller.signal.aborted) return;
    if (error || !data.session) { onAccessLost(); return; }
    await client.realtime.setAuth(data.session.access_token);
    if (controller.signal.aborted) return;
    channel = client.channel(`collections:${data.session.user.id}`, { config: { private: true } })
      .on('broadcast', { event: 'change' }, schedule)
      .subscribe(status => {
        // Catch changes between the initial read and subscribing, and after reconnecting.
        if (['SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT'].includes(status)) schedule();
      });
  })().catch(() => { if (!controller.signal.aborted) schedule(); });
  return () => {
    controller.abort();
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', visible);
    window.removeEventListener('online', schedule);
    if (channel) void client.removeChannel(channel).catch(() => {});
  };
}

import { renderEntries, renderPrinciples, renderPhilosophyNotes, renderLearnings, renderTaggedEntries, renderIdeas } from './collection-content.js';

// Mount collection panels only after authenticated loading.
(() => {
  const root = document.getElementById('collections');
  const bar = root && root.querySelector('.collection-tabs');
  if (!bar) return;
  const tabs = [...bar.querySelectorAll('.collection-tab')];
  const panels = [...root.querySelectorAll('.collection-panel')];
  const picker = root.querySelector('.collection-picker');
  const lock = root.querySelector('.collection-lock');
  const dialog = root.querySelector('.collection-dialog');
  const form = dialog.querySelector('form');
  const password = dialog.querySelector('[name="password"]');
  const email = dialog.querySelector('[name="email"]');
  const passkeySignIn = dialog.querySelector('[data-passkey-signin]');
  const account = root.querySelector('.collection-account');
  const passkeyRegister = root.querySelector('[data-passkey-register]');
  const passkeyStatus = root.querySelector('[data-passkey-status]');
  const passkeysAvailable = root.dataset.passkeys === 'true' && Boolean(globalThis.PublicKeyCredential) && isSecureContext;
  if (passkeySignIn) passkeySignIn.hidden = !passkeysAvailable;
  let activeClient;
  let pendingController;
  let registerController;
  let stopWatching;
  let renderedContent;
  const releaseClient = client => {
    if (client) void import('./supabase-collections.js').then(({ closeCollectionsClient }) => closeCollectionsClient(client)).catch(() => {});
  };
  const error = dialog.querySelector('.collection-unlock-error');
  const submit = form.querySelector('[type="submit"]');
  const privateContents = [...root.querySelectorAll('[data-private-content]')];
  let unlocked = false;
  let unlocking = false;
  let attempt = 0;
  if (tabs.length < 2) return;

  const isLocked = (panel) => panel.dataset.locked === 'true' && !unlocked;
  const select = (panelId, focus) => {
    const target = panels.find((panel) => panel.id === panelId);
    if (!target || isLocked(target)) return;
    for (const tab of tabs) {
      const on = tab.dataset.target === panelId;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on) {
        if (focus) tab.focus({ preventScroll: true });
        const tabRect = tab.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();
        if (tabRect.left < barRect.left) bar.scrollLeft += tabRect.left - barRect.left;
        else if (tabRect.right > barRect.right) bar.scrollLeft += tabRect.right - barRect.right;
      }
    }
    for (const panel of panels) panel.hidden = panel.id !== panelId;
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => select(tab.dataset.target));
    tab.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const visible = tabs.filter((item) => !item.hidden);
      const index = visible.indexOf(tab);
      const next = event.key === 'Home' ? visible[0] : event.key === 'End' ? visible.at(-1) :
        visible[(index + step + visible.length) % visible.length];
      select(next.dataset.target, true);
    });
  }

  root.classList.add('is-interactive');
  picker.hidden = true;

  // A shared link points at one entry, which may sit in the panel that is not
  // open. Resolve the hash to its panel first; collection-key hashes open panels
  // directly, and the build refuses an entry slug that would collide with one.
  const hashEntry = () => {
    try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; }
  };
  const hashPanel = () => {
    const entry = hashEntry();
    const hash = entry === 'cognitive-science' ? 'psychology' :
      entry === 'communication' ? 'learnings' :
      entry === 'proverbs' ? 'thoughts' :
      entry === 'history' || entry === 'inspiration' ? 'stories' : entry;
    return panels.find((panel) => panel.id === 'panel-' + hash) ||
      (hash ? document.getElementById(hash)?.closest('.collection-panel') : null);
  };
  const openHashPanel = () => {
    const target = hashPanel();
    select(target && !isLocked(target) ? target.id : panels[0].id);
  };
  const jumpToEntry = () => {
    const collectionHash = hashEntry();
    if (collectionHash === 'history' || collectionHash === 'inspiration') {
      const filter = collectionHash === 'history' ? 'History' : 'Inspiration';
      root.querySelector(`#stories-content [data-learning-tag="${filter}"]`)?.click();
    }
    const entry = document.getElementById(hashEntry());
    if (entry?.hidden && entry.closest('.learning-list')) {
      entry.closest('.learning-list').querySelector('.learning-filter[data-learning-tag=""]').click();
    }
    if (entry?.closest('.philosophy-subcategory')?.hidden) {
      root.querySelector('#philosophy-content [data-philosophy-category=""]').click();
    }
    if (entry?.closest('.collection-panel')?.hidden === false) {
      if (entry.matches('.principle-note')) entry.open = true;
      entry.querySelector('.entry-read-more[aria-expanded="false"]')?.click();
      entry.scrollIntoView({ block: 'center' });
    }
  };
  openHashPanel();

  // Only authorized content is mounted. Relocking clears it and the in-memory session.
  const clearError = () => {
    error.hidden = true;
    error.textContent = '';
    password.removeAttribute('aria-invalid');
    email?.removeAttribute('aria-invalid');
  };
  const setBusy = (busy) => {
    unlocking = busy;
    form.setAttribute('aria-busy', String(busy));
    password.readOnly = busy;
    if (email) email.readOnly = busy;
    submit.disabled = busy;
    if (passkeySignIn) passkeySignIn.disabled = busy;
    submit.textContent = busy ? 'Signing in…' : 'Sign in';
  };
  const clearPrivate = () => {
    stopWatching?.();
    stopWatching = undefined;
    renderedContent = undefined;
    document.dispatchEvent(new Event('collections:lock'));
    registerController?.abort();
    if (account) account.hidden = true;
    if (passkeyRegister) passkeyRegister.disabled = false;
    if (passkeyStatus) { passkeyStatus.textContent = ''; passkeyStatus.hidden = true; }
    for (const content of privateContents) {
      for (const share of content.querySelectorAll('.share')) clearTimeout(share.resetTimer);
      content.replaceChildren();
    }
  };
  lock.addEventListener('click', () => {
    if (!unlocked) {
      form.reset();
      clearError();
      dialog.showModal();
      return;
    }
    const current = panels.find((panel) => !panel.hidden);
    const privateHash = hashPanel()?.dataset.locked === 'true';
    unlocked = false;
    pendingController?.abort();
    releaseClient(activeClient);
    activeClient = undefined;
    picker.hidden = true;
    clearPrivate();
    for (const panel of panels) panel.hidden = true;
    for (const tab of tabs) {
      if (document.getElementById(tab.dataset.target).dataset.locked === 'true') tab.hidden = true;
    }
    select(current && !isLocked(current) ? current.id : panels[0].id);
    if (privateHash) {
      window.history.replaceState(null, '', location.pathname + location.search);
    }
    lock.setAttribute('aria-label', 'Unlock private collections');
    lock.setAttribute('title', 'Unlock private collections');
    lock.setAttribute('aria-haspopup', 'dialog');
    lock.setAttribute('aria-controls', dialog.id);
    lock.hidden = true;
    document.getElementById('collections-title').focus({ preventScroll: true });
  });
  document.getElementById('collections-title').addEventListener('click', () => {
    if (dialog.open) return;
    lock.click();
  });
  const mountContent = content => {
    const old = new Map(privateContents.map(container => [container, {
      nodes: [...container.childNodes],
      filters: [...container.querySelectorAll('.learning-filter[aria-pressed="true"]')]
        .map(button => ({ tag: button.dataset.learningTag, category: button.dataset.philosophyCategory })),
      open: [...container.querySelectorAll('details[open]')].map(node => node.id),
      expanded: [...container.querySelectorAll('.entry-read-more[aria-expanded="true"]')].map(node => node.getAttribute('aria-controls')),
    }]));
    const active = document.activeElement;
    const activeId = active?.id;
    const activeTag = active?.dataset.learningTag;
    const activeCategory = active?.dataset.philosophyCategory;
    const activeContainer = active?.closest('[data-private-content]');
    const activeEntryId = active?.closest('li[id], details[id]')?.id;
    const activeControl = active?.matches('.entry-read-more') ? '.entry-read-more' :
      active?.matches('.share') ? '.share' : active?.matches('summary') ? 'summary' : null;
    const currentPanel = panels.find(panel => !panel.hidden);
    const anchor = [...(currentPanel?.querySelectorAll('li[id], details[id]') ?? [])]
      .find(node => node.getBoundingClientRect().bottom > 0);
    const anchorId = anchor?.id;
    const anchorTop = anchor?.getBoundingClientRect().top;
    const scrollY = window.scrollY;
    const signatures = {
      'philosophy-content': [content.philosophy, content.philosophyNotes, content.philosophyCategories],
      'first-principles-content': content.firstPrinciples,
      ...Object.fromEntries(['ideas', 'stories', 'psychology', 'neuroscience', 'learnings', 'thoughts', 'finance', 'social-sciences', 'concepts'].map(key => [key + '-content', [
        key === 'stories' ? [content.history, content.inspiration] : content[key],
        content.descriptions?.[key],
        key === 'thoughts' ? content.thoughtCategoryDescriptions : null,
        key === 'learnings' ? content.learningCategories :
          key === 'thoughts' ? content.thoughtCategories :
          key === 'social-sciences' ? content.socialScienceCategories :
          key === 'concepts' ? content.conceptCategories : null,
      ]])),
    };
    const next = Object.fromEntries(Object.entries(signatures).map(([key, value]) => [key, JSON.stringify(value)]));
    for (const container of privateContents) container.replaceChildren();
    try {
      // Render all before mounting any: an invalid collection fails closed.
      const philosophy = content.philosophy.length || !content.philosophyNotes?.length ?
        renderEntries(content.philosophy) : document.createDocumentFragment();
      const principles = renderPrinciples(content.firstPrinciples);
      philosophy.append(renderPhilosophyNotes(content.philosophyNotes ?? [], content.philosophyCategories ?? []));
      const stories = [
        ...(content.history ?? []).map(entry => ({
          ...entry,
          tags: ['History', ...(entry.tags ?? [])],
        })),
        ...(content.inspiration ?? []).map(entry => ({
          ...entry,
          tags: entry.tags?.length ? entry.tags : ['Inspiration'],
        })),
      ];
      const renderContent = { ...content, stories };
      const otherCollections = ['ideas', 'stories', 'psychology', 'neuroscience', 'learnings', 'thoughts', 'finance', 'social-sciences', 'concepts'].map(key => {
        const fragment = key === 'stories' ? renderTaggedEntries(renderContent[key], ['History', 'Inspiration', 'Entrepreneurship', 'AI'], 'stories', { multiple: false }) :
          key === 'learnings' ? renderLearnings(renderContent[key] ?? [], content.learningCategories ?? []) :
          key === 'thoughts' ? renderTaggedEntries(renderContent[key] ?? [], content.thoughtCategories ?? [], 'thoughts', { multiple: false, descriptions: content.thoughtCategoryDescriptions ?? {} }) :
          key === 'social-sciences' ? renderTaggedEntries(renderContent[key] ?? [], content.socialScienceCategories ?? [], 'social sciences') :
          key === 'concepts' ? renderTaggedEntries(renderContent[key] ?? [], content.conceptCategories ?? [], 'concepts') :
          key === 'finance' ? renderTaggedEntries(renderContent[key] ?? [], [], 'finance') :
          key === 'ideas' ? renderIdeas(renderContent[key] ?? []) : renderEntries(renderContent[key] ?? []);
        if (content.descriptions?.[key]) {
          const description = document.createElement('p');
          description.className = 'collection-description';
          description.textContent = content.descriptions[key];
          fragment.prepend(description);
        }
        return [key, fragment];
      });
      root.querySelector('#philosophy-content').replaceChildren(philosophy);
      root.querySelector('#first-principles-content').replaceChildren(principles);
      for (const [key, fragment] of otherCollections) {
        root.querySelector('#' + key + '-content').replaceChildren(fragment);
      }

      for (const [container, state] of old) {
        if (renderedContent?.[container.id] === next[container.id]) {
          container.replaceChildren(...state.nodes);
          continue;
        }
        for (const share of state.nodes.flatMap(node => [...(node.querySelectorAll?.('.share') ?? [])])) clearTimeout(share.resetTimer);
        for (const { tag, category } of state.filters) {
          const button = [...container.querySelectorAll('.learning-filter, [data-philosophy-category]')]
            .find(button => tag ? button.dataset.learningTag === tag : category ? button.dataset.philosophyCategory === category : false);
          button?.click();
        }
        for (const id of state.open) {
          const details = document.getElementById(id);
          if (details?.matches('details')) details.open = true;
        }
        for (const id of state.expanded) {
          const button = [...container.querySelectorAll('.entry-read-more')].find(button => button.getAttribute('aria-controls') === id);
          if (button?.getAttribute('aria-expanded') === 'false') button.click();
        }
      }
      renderedContent = next;
      if (activeContainer && document.activeElement !== active) {
        const target = activeId ? document.getElementById(activeId) : activeEntryId && activeControl ?
          document.getElementById(activeEntryId)?.querySelector(activeControl) : [...activeContainer.querySelectorAll('button')].find(button =>
          activeTag !== undefined ? button.dataset.learningTag === activeTag : activeCategory !== undefined && button.dataset.philosophyCategory === activeCategory);
        target?.focus({ preventScroll: true });
      }
      if (unlocked) {
        const newAnchor = anchorId && document.getElementById(anchorId);
        window.scrollTo({ top: newAnchor ? scrollY + newAnchor.getBoundingClientRect().top - anchorTop : scrollY, behavior: 'instant' });
      }
    } catch (failure) {
      for (const [container, state] of old) container.replaceChildren(...state.nodes);
      throw failure;
    }
  };
  const signIn = async (method = 'password') => {
    if (unlocking) return;
    const request = ++attempt;
    const controller = new AbortController();
    pendingController = controller;
    let candidate;
    let stage = 'code';
    const passphrase = password.value;
    const address = email?.value.trim();
    password.value = '';
    clearError();
    setBusy(true);
    try {
      const { createCollectionsClient, loadCollections, watchCollections } = await import('./supabase-collections.js');
      if (controller.signal.aborted) return;
      stage = 'sign-in';
      candidate = createCollectionsClient(root.dataset.supabaseUrl, root.dataset.supabaseKey);
      const { error: authError } = method === 'passkey' ?
        await candidate.auth.signInWithPasskey({ options: { signal: controller.signal } }) :
        await candidate.auth.signInWithPassword({ email: address, password: passphrase });
      if (authError) throw authError;
      controller.signal.throwIfAborted();
      stage = 'data';
      const content = await loadCollections(candidate, controller.signal);
      if (request !== attempt || !dialog.open) return;
      stage = 'display';
      mountContent(content);
      activeClient = candidate;
      candidate = undefined;
      unlocked = true;
      if (account) account.hidden = !passkeysAvailable;
      document.dispatchEvent(new CustomEvent('collections:unlock', { detail: content.hourglass }));
      picker.hidden = false;
      for (const tab of tabs) tab.hidden = false;
      dialog.close();
      lock.setAttribute('aria-label', 'Lock private collections');
      lock.setAttribute('title', 'Lock private collections');
      lock.removeAttribute('aria-haspopup');
      lock.setAttribute('aria-controls', panels.filter(panel => panel.dataset.locked === 'true').map(panel => panel.id).join(' '));
      lock.hidden = false;
      const target = hashPanel();
      select(target?.dataset.locked === 'true' ? target.id : 'panel-ideas', true);
      jumpToEntry();
      const client = activeClient;
      stopWatching = watchCollections(client, fresh => {
        if (!unlocked || activeClient !== client) return;
        mountContent(fresh);
        document.dispatchEvent(new CustomEvent('collections:unlock', { detail: fresh.hourglass }));
      }, () => {
        if (unlocked && activeClient === client) lock.click();
      });
    } catch (failure) {
      if (request !== attempt || !dialog.open) return;
      clearPrivate();
      error.textContent = failure.code === 'invalid_credentials' ? 'Incorrect email or password. Try again.' :
        failure.code === 'email_not_confirmed' ? 'Confirm your email before signing in.' :
        method === 'passkey' ? 'Passkey sign-in did not complete. Try again or use your password.' :
        stage === 'code' ? 'The login code could not load. Reload this page and try again.' :
        stage === 'sign-in' ? 'Sign-in could not complete in this browser. Check your connection and try again.' :
        stage === 'data' ? 'Signed in, but your collections could not load. Check your connection and account access, then try again.' :
        'Signed in, but this browser could not display your collections. Try reloading the page.';
      error.hidden = false;
      if (failure.code === 'invalid_credentials') password.setAttribute('aria-invalid', 'true');
      password.focus();
    } finally {
      releaseClient(candidate);
      if (request === attempt) setBusy(false);
    }
  };
  form.addEventListener('submit', event => { event.preventDefault(); void signIn(); });
  passkeySignIn?.addEventListener('click', () => void signIn('passkey'));
  passkeyRegister?.addEventListener('click', async () => {
    if (!unlocked || !activeClient || passkeyRegister.disabled) return;
    const client = activeClient;
    const controller = new AbortController();
    registerController = controller;
    passkeyRegister.disabled = true;
    passkeyStatus.textContent = '';
    passkeyStatus.hidden = true;
    try {
      const { error } = await client.auth.registerPasskey({ options: { signal: controller.signal } });
      if (error) throw error;
      if (!unlocked || activeClient !== client || controller.signal.aborted) return;
      passkeyStatus.textContent = 'Passkey added. You can use it the next time you sign in.';
    } catch {
      if (!unlocked || activeClient !== client || controller.signal.aborted) return;
      passkeyStatus.textContent = 'Passkey setup did not complete. Sign in with your password again and retry.';
    } finally {
      if (unlocked && activeClient === client && !controller.signal.aborted) {
        passkeyRegister.disabled = false;
        passkeyStatus.hidden = false;
      }
    }
  });
  email?.addEventListener('input', clearError);
  password.addEventListener('input', clearError);
  dialog.querySelector('[data-unlock-cancel]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    attempt++;
    pendingController?.abort();
    setBusy(false);
    form.reset();
    clearError();
  });

  // Resolve shared links after loading and for subsequent hash changes.
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', jumpToEntry);
  else jumpToEntry();
  addEventListener('hashchange', () => {
    openHashPanel();
    jumpToEntry();
  });
  // Entering Collections from the footer or a shared link goes straight to login.
  lock.click();
})();

// Share controls copy an absolute link. They stay real anchors, so with no JS
// (or no clipboard access) clicking still jumps to the entry and puts the
// shareable URL in the address bar.
if (navigator.clipboard) {
  // Delegation also covers private entries added after sign-in.
  document.getElementById('collections').addEventListener('click', async (event) => {
    const btn = event.target.closest('.share');
    if (!btn) return;
    event.preventDefault();
    const slug = btn.dataset.slug;
    try {
      await navigator.clipboard.writeText(location.origin + location.pathname + '#' + slug);
    } catch {
      location.hash = slug;
      return;
    }
    const label = btn.querySelector('.share-live');
    btn.classList.add('copied');
    label.textContent = 'Copied';
    clearTimeout(btn.resetTimer);
    btn.resetTimer = setTimeout(() => {
      btn.classList.remove('copied');
      label.textContent = 'Copy link';
    }, 1600);
  });
}

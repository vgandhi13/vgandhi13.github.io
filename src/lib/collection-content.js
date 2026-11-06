// Shared validation and rendering for authenticated Collections content.
const reserved = new Set(['ideas', 'stories', 'history', 'cognitive-science', 'psychology', 'neuroscience', 'communication', 'learnings', 'proverbs', 'thoughts', 'inspiration', 'finance', 'social-sciences', 'philosophy', 'first-principles']);
const paragraphs = value => Array.isArray(value) ? value : [value];

export function validateEntries(entries) {
  if (!Array.isArray(entries)) throw new Error('The private source must be an array of entries.');
  const ids = new Set(reserved);
  for (const [index, entry] of entries.entries()) {
    const fail = message => { throw new Error(`Private entry ${index + 1}: ${message}`); };
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail('expected an object.');
    if (typeof entry.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) {
      fail('add an explicit id using lowercase words joined with hyphens.');
    }
    if (ids.has(entry.id)) fail('the id is duplicated or reserved for a collection.');
    ids.add(entry.id);
    const placeholder = entry.title && Array.isArray(entry.text) && entry.text.length === 0;
    if (!placeholder && (!entry.text || !paragraphs(entry.text).length || paragraphs(entry.text).some(text => typeof text !== 'string' || !text.trim()))) {
      fail('text must be a nonempty string or array of paragraphs.');
    }
    if (['author', 'subject', 'title'].filter(key => entry[key] !== undefined).length > 1) {
      fail('use only one of author, subject, or title.');
    }
    for (const key of ['author', 'subject', 'title', 'year', 'source', 'url', 'added']) {
      if (entry[key] !== undefined && typeof entry[key] !== 'string') fail(`${key} must be a string.`);
    }
    if (entry.added && !/^\d{4}-\d{2}-\d{2}$/.test(entry.added)) fail('added must be an ISO date.');
    if (entry.note !== undefined && paragraphs(entry.note).some(text => typeof text !== 'string')) fail('note must contain text.');
    if (entry.tags !== undefined && (!Array.isArray(entry.tags) || entry.tags.some(tag => typeof tag !== 'string' || !tag.trim()) || new Set(entry.tags).size !== entry.tags.length)) fail('tags must be unique nonempty strings.');
    if (entry.image && (typeof entry.image.src !== 'string' || typeof entry.image.alt !== 'string')) {
      fail('an image needs src and alt text.');
    }
    if (entry.image?.width !== undefined && (!Number.isFinite(entry.image.width) || entry.image.width <= 0)) {
      fail('image width must be a positive number.');
    }
    if (entry.svg && typeof entry.svg.markup !== 'string') fail('svg needs inline markup.');
  }
}

export function validatePrinciples(notes) {
  if (!Array.isArray(notes)) throw new Error('Private notes must be an array.');
  const ids = new Set(reserved);
  for (const [index, note] of notes.entries()) {
    const fail = message => { throw new Error(`Private note ${index + 1}: ${message}`); };
    if (!note || typeof note !== 'object' || Array.isArray(note)) fail('expected an object.');
    if (typeof note.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(note.id)) {
      fail('add an explicit id using lowercase words joined with hyphens.');
    }
    if (ids.has(note.id)) fail('the id is duplicated or reserved for a collection.');
    ids.add(note.id);
    if (typeof note.title !== 'string' || !note.title.trim()) fail('a title is required.');
    if (typeof note.body !== 'string') fail('body must be an HTML string, which may be empty for a new note.');
    if (note.summary !== undefined && typeof note.summary !== 'string') fail('summary must be a string.');
    if (note.presentation !== undefined && note.presentation !== 'aside') fail('presentation must be aside when set.');
    if (note.subcategory !== undefined && (typeof note.subcategory !== 'string' || !note.subcategory.trim())) fail('subcategory must be nonempty text.');
    if (typeof note.added !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(note.added)) fail('added must be an ISO date.');
  }
}

export function validatePrivateContent(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) throw new Error('Invalid private collections.');
  if (content.hourglass !== undefined) {
    const value = content.hourglass;
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ['start', 'end', 'quote', 'author', 'authorUrl', 'prompt'].some(key => typeof value[key] !== 'string' || !value[key].trim()) ||
      !Number.isFinite(Date.parse(value.start)) || !Number.isFinite(Date.parse(value.end)) ||
      Date.parse(value.end) <= Date.parse(value.start) || !/^https?:\/\//i.test(value.authorUrl)) {
      throw new Error('Invalid private hourglass settings.');
    }
  }
  for (const key of ['learningCategories', 'socialScienceCategories', 'thoughtCategories']) {
    const categories = content[key];
    if (categories !== undefined && (!Array.isArray(categories) ||
      categories.some(tag => typeof tag !== 'string' || !tag.trim()) ||
      new Set(categories).size !== categories.length)) {
      throw new Error('Invalid private collection categories.');
    }
  }
  validateEntries(content.philosophy);
  validatePrinciples(content.firstPrinciples);
  validatePrinciples(content.philosophyNotes ?? []);
  for (const key of ['ideas', 'history', 'psychology', 'neuroscience', 'learnings', 'thoughts', 'inspiration', 'finance', 'social-sciences']) validateEntries(content[key] ?? []);
  if (content.descriptions !== undefined) {
    if (!content.descriptions || typeof content.descriptions !== 'object' || Array.isArray(content.descriptions) ||
      Object.entries(content.descriptions).some(([key, value]) =>
        !['ideas', 'stories', 'history', 'psychology', 'neuroscience', 'learnings', 'thoughts', 'inspiration', 'finance', 'social-sciences'].includes(key) || typeof value !== 'string')) {
      throw new Error('Invalid private collection descriptions.');
    }
  }
  const ids = new Set(content.philosophy.map(entry => entry.id));
  for (const note of [...content.firstPrinciples, ...(content.philosophyNotes ?? []),
    ...(content.ideas ?? []), ...(content.history ?? []), ...(content.psychology ?? []), ...(content.neuroscience ?? []), ...(content.learnings ?? []), ...(content.thoughts ?? []), ...(content.inspiration ?? []), ...(content.finance ?? []), ...(content['social-sciences'] ?? [])]) {
    if (ids.has(note.id)) throw new Error('Private ids must be unique across all private collections.');
    ids.add(note.id);
  }
}

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const link = (text, url) => {
  if (!url) return text;
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) throw new Error('Source links must use HTTP or HTTPS.');
  return `<a href="${escape(url)}" target="_blank" rel="noopener">${text}</a>`;
};
const caption = figure => figure.credit ? `<figcaption>${link(escape(figure.credit), figure.creditUrl)}</figcaption>` : '';
const addedOn = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const shareControl = (id, label) => `<a class="share" href="#${id}" data-slug="${id}" aria-label="${escape(label)}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span class="share-text"><span class="share-sizer" aria-hidden="true">Copy link</span><span class="share-live">Copy link</span></span></a>`;

// Body HTML and SVG are trusted owner-authored content fetched after login.
// Metadata is escaped; raster images are embedded data URIs.
export function renderEntries(entries, { tags = false } = {}) {
  validateEntries(entries);
  for (const entry of entries) {
    if (document.getElementById(entry.id)) throw new Error('A private entry id collides with the public page.');
  }
  const template = document.createElement('template');
  template.innerHTML = entries.length ? `<ul class="quote-list">${entries.map(entry => {
    const prose = entry.subject || entry.title;
    const heading = prose ? `<p class="subject">${escape(prose)}${entry.year ? `<span class="year">, ${escape(entry.year)}</span>` : ''}</p>` : '';
    const body = paragraphs(entry.text).map(text => `<p>${text}</p>`).join('');
    let figures = '';
    if (entry.image) {
      const image = entry.image;
      if (!/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/]+=*$/.test(image.src)) {
        throw new Error('Collection images must be embedded raster data URIs.');
      }
      figures += `<figure class="quote-figure"><img src="${image.src}" alt="${escape(image.alt)}"${image.plain ? ' class="plain"' : ''}${image.width ? ` style="width: min(100%, ${image.width}px)"` : ''} loading="lazy">${caption(image)}</figure>`;
    }
    if (entry.svg) figures += `<figure class="quote-figure">${entry.svg.markup}${caption(entry.svg)}</figure>`;
    let source = entry.source ? escape(entry.source) : '';
    if (entry.sourceBold) source = `<strong>${source}</strong>`;
    const attribution = entry.author ? `<p class="attribution">${escape(entry.author)}${source ? `<span class="source">, ${link(source, entry.url)}</span>` : ''}${entry.paraphrased ? '<span class="paraphrased"> (paraphrased)</span>' : ''}</p>` : '';
    const note = entry.note === undefined ? '' : paragraphs(entry.note).map(text => `<p class="commentary">${text}</p>`).join('');
    const added = entry.added ? `<p class="added">Added <time datetime="${entry.added}">${addedOn(entry.added)}</time></p>` : '';
    const label = entry.author ? `Copy a link to this idea by ${entry.author}` : entry.subject ? `Copy a link to this story about ${entry.subject}` : entry.title ? `Copy a link to ${entry.title}` : 'Copy a link to this entry';
    const tagControls = tags && entry.tags?.length ? `<div class="learning-tags" aria-label="Entry tags">${entry.tags.map(tag => `<button type="button" class="learning-tag" data-learning-tag="${escape(tag)}" aria-pressed="false">${escape(tag)}</button>`).join('')}</div>` : '';
    return `<li id="${entry.id}">${heading}<div class="entry-reading" id="${entry.id}-reading">${prose ? `<div class="story">${body}</div>` : `<blockquote>${body}</blockquote>`}${figures}</div>${tagControls}<div class="meta"><div class="meta-text">${attribution}${note}${added}</div>${shareControl(entry.id, label)}</div></li>`;
  }).join('')}</ul>` : '<p class="empty">Nothing here yet.</p>';
  for (const reading of template.content.querySelectorAll('.entry-reading')) {
    if (reading.textContent.trim().length <= 650) continue;
    reading.classList.add('is-collapsed');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'entry-read-more';
    button.setAttribute('aria-controls', reading.id);
    button.setAttribute('aria-expanded', 'false');
    const links = [...reading.querySelectorAll('a[href]')].map(link => [link, link.getAttribute('tabindex')]);
    for (const [link] of links) link.setAttribute('tabindex', '-1');
    button.innerHTML = '<span>Read more</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      reading.classList.toggle('is-collapsed', !expanded);
      for (const [link, original] of links) {
        if (!expanded) link.setAttribute('tabindex', '-1');
        else if (original === null) link.removeAttribute('tabindex');
        else link.setAttribute('tabindex', original);
      }
      button.querySelector('span').textContent = expanded ? 'Read less' : 'Read more';
    });
    reading.after(button);
  }
  return template.content;
}

export function renderLearnings(entries, categories = []) {
  return renderTaggedEntries(entries, categories, 'learnings');
}

export function renderTaggedEntries(entries, categories = [], label = 'entries', { multiple = true } = {}) {
  const cards = renderEntries(entries, { tags: true });
  const wrapper = document.createElement('div');
  wrapper.className = 'learning-list';
  const tags = [...new Set([...entries.flatMap(entry => entry.tags ?? []), ...categories])];
  const toolbar = document.createElement('div');
  toolbar.className = 'learning-filters';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', `Filter ${label} by tag`);
  for (const tag of ['', ...tags]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'learning-filter';
    button.dataset.learningTag = tag;
    button.textContent = tag || 'All';
    button.setAttribute('aria-pressed', String(!tag));
    toolbar.append(button);
  }
  const status = document.createElement('p');
  status.className = 'learning-status';
  status.setAttribute('role', 'status');
  wrapper.append(toolbar, status, cards);
  const selected = new Set();
  const filter = tag => {
    if (!tag) selected.clear();
    else if (!multiple) {
      selected.clear();
      selected.add(tag);
    }
    else if (selected.has(tag)) selected.delete(tag);
    else selected.add(tag);
    let count = 0;
    for (const entry of entries) {
      const visible = [...selected].every(tag => entry.tags?.includes(tag));
      wrapper.querySelector('#' + entry.id).hidden = !visible;
      if (visible) count++;
    }
    for (const button of wrapper.querySelectorAll('[data-learning-tag]')) {
      const value = button.dataset.learningTag;
      button.setAttribute('aria-pressed', String(value ? selected.has(value) : !selected.size));
    }
    status.textContent = `${count} ${count === 1 ? 'entry' : 'entries'}${selected.size ? ' tagged ' + [...selected].join(' and ') : ''}`;
  };
  wrapper.addEventListener('click', event => {
    const button = event.target.closest('button[data-learning-tag]');
    if (button && wrapper.contains(button)) filter(button.dataset.learningTag);
  });
  filter('');
  const fragment = document.createDocumentFragment();
  fragment.append(wrapper);
  return fragment;
}

export function renderIdeas(entries) {
  const fragment = renderEntries(entries);
  const list = fragment.querySelector('.quote-list');
  if (list) {
    const items = [...list.children];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    list.replaceChildren(...items);
  }
  return fragment;
}

// Notes are native disclosures, so opening, closing, and keyboard access need no
// custom accordion script. The full body is trusted local HTML, never public source.
export function renderPrinciples(notes) {
  validatePrinciples(notes);
  for (const note of notes) {
    if (document.getElementById(note.id)) throw new Error('A private note id collides with the public page.');
  }
  const template = document.createElement('template');
  template.innerHTML = notes.length ? `<div class="principle-list">${notes.map(note => `
    <details class="principle-note" id="${note.id}">
      <summary>
        <span class="principle-heading">
          <span class="principle-title">${escape(note.title)}</span>
          ${note.summary ? `<span class="principle-summary">${escape(note.summary)}</span>` : ''}
          <span class="principle-date">Added <time datetime="${note.added}">${addedOn(note.added)}</time></span>
        </span>
        <span class="principle-toggle" aria-hidden="true"><span class="principle-read">Read note</span><span class="principle-close">Close note</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></span>
      </summary>
      <article class="principle-reading" aria-label="${escape(note.title)}">
        <div class="principle-body">${note.body.trim() ? note.body : '<p class="principle-placeholder">No text yet.</p>'}</div>
        <footer class="principle-footer">${shareControl(note.id, `Copy a link to ${note.title}`)}</footer>
      </article>
    </details>`).join('')}</div>` : '<p class="empty">Nothing here yet.</p>';
  return template.content;
}

export function renderPhilosophyNotes(notes) {
  validatePrinciples(notes);
  if (notes.some(note => note.presentation === 'aside')) {
    const fragment = renderPhilosophyNotes(notes.filter(note => note.presentation !== 'aside'));
    for (const note of notes.filter(note => note.presentation === 'aside')) {
      if (document.getElementById(note.id)) throw new Error('A private note id collides with the public page.');
      const aside = document.createElement('aside');
      aside.className = 'philosophy-aside';
      aside.id = note.id;
      aside.setAttribute('aria-label', note.title);
      aside.innerHTML = note.body;
      fragment.append(aside);
    }
    return fragment;
  }
  const groups = new Map();
  for (const note of notes) {
    const name = note.subcategory ?? 'General';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(note);
  }
  const fragment = document.createDocumentFragment();
  if (!notes.length) return fragment;
  const wrapper = document.createElement('div');
  wrapper.className = 'philosophy-notes';
  const toolbar = document.createElement('div');
  toolbar.className = 'learning-filters';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', 'Filter philosophy by subcategory');
  for (const name of ['', ...groups.keys()]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'learning-filter';
    button.dataset.philosophyCategory = name;
    button.textContent = name || 'All';
    toolbar.append(button);
  }
  const status = document.createElement('p');
  status.className = 'learning-status';
  status.setAttribute('role', 'status');
  wrapper.append(toolbar, status);
  for (const [name, entries] of groups) {
    const section = document.createElement('section');
    section.className = 'philosophy-subcategory';
    section.dataset.subcategory = name;
    const heading = document.createElement('h3');
    heading.textContent = name;
    section.append(heading, renderPrinciples(entries));
    wrapper.append(section);
  }
  const selected = new Set();
  const filter = name => {
    if (!name) selected.clear();
    else if (selected.has(name)) selected.delete(name);
    else selected.add(name);
    for (const section of wrapper.querySelectorAll('.philosophy-subcategory')) {
      section.hidden = ![...selected].every(name => section.dataset.subcategory === name);
    }
    for (const button of toolbar.querySelectorAll('button')) {
      const value = button.dataset.philosophyCategory;
      button.setAttribute('aria-pressed', String(value ? selected.has(value) : !selected.size));
    }
    const count = notes.filter(note => [...selected].every(name => (note.subcategory ?? 'General') === name)).length;
    status.textContent = `${count} ${count === 1 ? 'note' : 'notes'}${selected.size ? ' in ' + [...selected].join(' and ') : ''}`;
  };
  toolbar.addEventListener('click', event => {
    const button = event.target.closest('button[data-philosophy-category]');
    if (button && toolbar.contains(button)) filter(button.dataset.philosophyCategory);
  });
  filter('');
  fragment.append(wrapper);
  return fragment;
}

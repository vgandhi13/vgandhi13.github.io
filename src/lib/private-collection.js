// Shared by the local encryption command and the browser, using built-in Web Crypto.
// No password or decryption key belongs in this module or in the encrypted envelope.
const iterations = 600_000;
const encoder = new TextEncoder();
const additionalData = encoder.encode('collections/philosophy/v1');
const reserved = new Set(['ideas', 'history', 'cognitive-science', 'philosophy', 'first-principles']);
const paragraphs = value => Array.isArray(value) ? value : [value];

const toBase64 = bytes => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
};
const fromBase64 = value => {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('Invalid encrypted collection.');
  }
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
};

async function deriveKey(password, salt) {
  if (typeof password !== 'string' || !password) throw new Error('A password is required.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

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
    if (!entry.text || !paragraphs(entry.text).length || paragraphs(entry.text).some(text => typeof text !== 'string' || !text.trim())) {
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
  if (!Array.isArray(notes)) throw new Error('First Principles must be an array of notes.');
  const ids = new Set(reserved);
  for (const [index, note] of notes.entries()) {
    const fail = message => { throw new Error(`First Principles note ${index + 1}: ${message}`); };
    if (!note || typeof note !== 'object' || Array.isArray(note)) fail('expected an object.');
    if (typeof note.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(note.id)) {
      fail('add an explicit id using lowercase words joined with hyphens.');
    }
    if (ids.has(note.id)) fail('the id is duplicated or reserved for a collection.');
    ids.add(note.id);
    if (typeof note.title !== 'string' || !note.title.trim()) fail('a title is required.');
    if (typeof note.body !== 'string') fail('body must be an HTML string, which may be empty for a new note.');
    if (note.summary !== undefined && typeof note.summary !== 'string') fail('summary must be a string.');
    if (typeof note.added !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(note.added)) fail('added must be an ISO date.');
  }
}

export function validatePrivateContent(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) throw new Error('Invalid private collections.');
  validateEntries(content.philosophy);
  validatePrinciples(content.firstPrinciples);
  const ids = new Set(content.philosophy.map(entry => entry.id));
  for (const note of content.firstPrinciples) {
    if (ids.has(note.id)) throw new Error('Private ids must be unique across both collections.');
  }
}

export async function encryptEntries(content, password) {
  validatePrivateContent(content);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = encoder.encode(JSON.stringify(content));
  try {
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, key, plaintext);
    return {
      version: 1, kdf: 'PBKDF2', hash: 'SHA-256', iterations, cipher: 'AES-GCM',
      salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(ciphertext)),
    };
  } finally {
    plaintext.fill(0);
  }
}

export async function decryptEntries(payload, password) {
  if (!payload || payload.version !== 1 || payload.kdf !== 'PBKDF2' || payload.hash !== 'SHA-256' ||
      payload.iterations !== iterations || payload.cipher !== 'AES-GCM') {
    throw new Error('Unsupported encrypted collection.');
  }
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.data);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) throw new Error('Invalid encrypted collection.');
  const key = await deriveKey(password, salt);
  const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, key, ciphertext));
  try {
    const content = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext));
    validatePrivateContent(content);
    return content;
  } finally {
    plaintext.fill(0);
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

// Body HTML and inline SVG are authored locally, like the public collection entries.
// Metadata is escaped; private raster images must already be embedded in the payload.
export function renderEntries(entries) {
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
        throw new Error('Private images must be encrypted with the collection.');
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
    return `<li id="${entry.id}">${heading}${prose ? `<div class="story">${body}</div>` : `<blockquote>${body}</blockquote>`}${figures}<div class="meta"><div class="meta-text">${attribution}${note}${added}</div>${shareControl(entry.id, label)}</div></li>`;
  }).join('')}</ul>` : '<p class="empty">Nothing here yet.</p>';
  return template.content;
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

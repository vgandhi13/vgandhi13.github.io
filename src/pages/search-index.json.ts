import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { contentTokens } from '../lib/stopwords.js';

/** Reduce markdown source to plain searchable text. */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*/g, ' ')) // keep code text, drop fences
    .replace(/\$\$[\s\S]*?\$\$/g, ' ') // display math
    .replace(/\$[^$\n]+\$/g, ' ') // inline math
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images -> alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/<[^>]+>/g, ' ') // html tags
    .replace(/\[\^[^\]]*\]:?/g, ' ') // footnote markers
    .replace(/[#>*_`~|-]+/g, ' ') // md syntax chars
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:?!])/g, '$1') // tidy gaps left by stripped math
    .trim();
}

export const GET: APIRoute = async () => {
  const [notes, blog] = await Promise.all([
    getCollection('notes', ({ data }) => !data.draft),
    getCollection('blog', ({ data }) => !data.draft),
  ]);

  const docs = [
    ...notes.map((e) => ({ e, type: 'note', urlBase: '/notes/' })),
    ...blog.map((e) => ({ e, type: 'blog', urlBase: '/blog/' })),
  ].map(({ e, type, urlBase }) => {
    const plain = stripMarkdown(e.body ?? '');
    return {
      type,
      url: `${urlBase}${e.id}/`,
      title: e.data.title,
      description: e.data.description ?? '',
      date: e.data.date.toISOString().slice(0, 10),
      // stop words removed so queries like "the" can never match
      text: contentTokens(`${e.data.description ?? ''} ${plain}`).join(' '),
      // original text, used for line previews and deep links
      plain,
    };
  });

  return new Response(JSON.stringify(docs), {
    headers: { 'Content-Type': 'application/json' },
  });
};

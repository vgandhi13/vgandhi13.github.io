import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { dirname, resolve, extname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptEntries, validateEntries, validatePrinciples } from '../src/lib/private-collection.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const options = {
  source: resolve(root, '.private/philosophy.json'),
  'first-principles': resolve(root, '.private/first-principles.json'),
  'password-file': resolve(root, '.private/philosophy.password'),
  output: resolve(root, 'src/data/philosophy.encrypted.json'),
};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const name = args[i].replace(/^--/, '');
  if (!Object.hasOwn(options, name) || !args[i + 1]) throw new Error('Use --source, --first-principles, --password-file, or --output followed by a path.');
  options[name] = resolve(args[i + 1]);
}

try {
  if ([options.source, options['first-principles'], options['password-file']].includes(options.output)) throw new Error('The encrypted output must be a separate file.');
  const entries = JSON.parse(await readFile(options.source, 'utf8'));
  const firstPrinciples = JSON.parse(await readFile(options['first-principles'], 'utf8'));
  validateEntries(entries);
  validatePrinciples(firstPrinciples);
  const sourceDir = await realpath(dirname(options.source));
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif' };
  for (const [index, entry] of entries.entries()) {
    if (!entry.image) continue;
    if (/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/]+=*$/.test(entry.image.src)) continue;
    if (isAbsolute(entry.image.src) || /^[a-z]+:/i.test(entry.image.src)) {
      throw new Error(`Private entry ${index + 1}: image src must be a local file relative to the private JSON, not a public URL.`);
    }
    const imagePath = await realpath(resolve(sourceDir, entry.image.src));
    const localPath = relative(sourceDir, imagePath);
    if (localPath === '..' || localPath.startsWith('../') || isAbsolute(localPath)) throw new Error('Private images must be kept alongside the private source.');
    const type = mime[extname(imagePath).toLowerCase()];
    if (!type) throw new Error('Private images must be PNG, JPEG, GIF, WebP, or AVIF. Inline SVG belongs in svg.markup.');
    entry.image.src = `data:${type};base64,${(await readFile(imagePath)).toString('base64')}`;
  }
  // Strip just the line ending, so spaces can still be part of a future passphrase.
  const password = (await readFile(options['password-file'], 'utf8')).replace(/\r?\n$/, '');
  const payload = await encryptEntries({ philosophy: entries, firstPrinciples }, password);
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Encrypted ${entries.length} Philosophy entries and ${firstPrinciples.length} First Principles notes. Only the encrypted output should be committed.`);
} catch (error) {
  // Do not print source content or include a JSON parser's plaintext excerpt in logs.
  console.error(error instanceof SyntaxError ? 'Invalid private JSON. Fix the local source and retry.' : error.message);
  process.exitCode = 1;
}

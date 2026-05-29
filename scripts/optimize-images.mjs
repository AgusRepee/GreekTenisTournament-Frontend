/**
 * Convierte PNG/JPG de /img (y /public/players) a WebP y elimina el original.
 * Ejecutar antes del build: npm run optimize-images
 */
import sharp from 'sharp';
import { readdir, unlink, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

/** maxWidth null = solo comprimir; quality 1–100 */
function ruleFor(filename) {
  const base = filename.toLowerCase();
  if (base === 'pagefondo.png') return { maxWidth: 1920, quality: 78 };
  if (base === 'rafa-hero.png') return { maxWidth: 1920, quality: 82 };
  if (base.startsWith('rafa-') || base.startsWith('rafa')) return { maxWidth: 1280, quality: 82 };
  if (base.endsWith('.jpg') || base.endsWith('.jpeg')) return { maxWidth: 1280, quality: 82 };
  if (base.endsWith('.png')) return { maxWidth: 1600, quality: 84 };
  return { maxWidth: 1600, quality: 84 };
}

async function convertRasterFile(input) {
  const dir = path.dirname(input);
  const ext = path.extname(input);
  const base = path.basename(input, ext);
  const output = path.join(dir, `${base.toLowerCase()}.webp`);
  const { maxWidth, quality } = ruleFor(path.basename(input));

  let pipeline = sharp(input);
  const meta = await pipeline.metadata();
  if (maxWidth && meta.width && meta.width > maxWidth) {
    pipeline = pipeline.resize(maxWidth, null, { withoutEnlargement: true, fit: 'inside' });
  }
  await pipeline.webp({ quality, effort: 4 }).toFile(output);

  const before = (await stat(input)).size;
  const after = (await stat(output)).size;
  await unlink(input);
  const rel = path.relative(root, output);
  console.log(`webp: ${rel} (${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024).toFixed(0)} KB)`);
}

async function convertRasterDir(dir) {
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return;
  }
  for (const f of files) {
    if (!/\.(png|jpe?g)$/i.test(f)) continue;
    await convertRasterFile(path.join(dir, f));
  }
}

const logoWebp = path.join(root, 'img', 'logo.webp');

await convertRasterDir(path.join(root, 'img'));
await convertRasterDir(path.join(root, 'public', 'players'));

try {
  await sharp(logoWebp)
    .resize(192, 192, { fit: 'cover' })
    .webp({ quality: 90, effort: 4 })
    .toFile(path.join(root, 'public', 'favicon.webp'));
  console.log('webp: public/favicon.webp');
} catch (e) {
  console.warn('favicon: omitido (falta img/logo.webp)');
}

try {
  await unlink(path.join(root, 'public', 'favicon.png'));
} catch {
  /* ok */
}

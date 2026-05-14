/**
 * Convierte PNG de /img y /public/players a WebP (borra el PNG original).
 * Genera public/favicon.webp desde img/logo.webp (192px).
 * Ejecutar: node scripts/optimize-images.mjs
 */
import sharp from 'sharp';
import { readdir, unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function convertPngDir(dir, maxWidth) {
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return;
  }
  for (const f of files) {
    if (!f.toLowerCase().endsWith('.png')) continue;
    const input = path.join(dir, f);
    const output = path.join(dir, f.replace(/\.png$/i, '.webp'));
    let pipeline = sharp(input);
    const meta = await pipeline.metadata();
    if (maxWidth && meta.width && meta.width > maxWidth) {
      pipeline = pipeline.resize(maxWidth, null, { withoutEnlargement: true, fit: 'inside' });
    }
    await pipeline.webp({ quality: 85, effort: 4 }).toFile(output);
    await unlink(input);
    console.log('webp:', path.relative(root, output));
  }
}

const logoWebp = path.join(root, 'img', 'logo.webp');

await convertPngDir(path.join(root, 'img'), 1600);
await convertPngDir(path.join(root, 'public', 'players'), 420);

try {
  await sharp(logoWebp)
    .resize(192, 192, { fit: 'cover' })
    .webp({ quality: 90, effort: 4 })
    .toFile(path.join(root, 'public', 'favicon.webp'));
  console.log('webp: public/favicon.webp');
} catch (e) {
  console.error('favicon: falta img/logo.webp — ejecutá el script tras tener logo.png en img/');
  throw e;
}

try {
  await unlink(path.join(root, 'public', 'favicon.png'));
  console.log('removed: public/favicon.png');
} catch {
  /* ok */
}

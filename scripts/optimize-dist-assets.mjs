/**
 * Post-build: convierte PNG/JPG sueltos en dist/assets a WebP (por si el build incluyó raster pesado).
 * No reescribe referencias en index.html — preferir npm run optimize-images antes del build.
 */
import sharp from 'sharp';
import { readdir, stat, unlink, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, '../dist/assets');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else files.push(p);
  }
  return files;
}

try {
  const files = await walk(assetsDir);
  const rasters = files.filter((f) => /\.(png|jpe?g)$/i.test(f));
  if (rasters.length === 0) {
    console.log('optimize-dist: sin PNG/JPG en dist/assets');
    process.exit(0);
  }

  const indexHtml = path.resolve(__dirname, '../dist/index.html');
  let html = await readFile(indexHtml, 'utf8');

  for (const input of rasters) {
    const ext = path.extname(input);
    const output = input.replace(new RegExp(`${ext}$`, 'i'), '.webp');
    const before = (await stat(input)).size;
    let pipeline = sharp(input);
    const meta = await pipeline.metadata();
    const maxWidth = before > 800_000 ? 1280 : 1600;
    if (meta.width && meta.width > maxWidth) {
      pipeline = pipeline.resize(maxWidth, null, { withoutEnlargement: true, fit: 'inside' });
    }
    await pipeline.webp({ quality: 82, effort: 4 }).toFile(output);
    const after = (await stat(output)).size;
    const oldBase = path.basename(input);
    const newBase = path.basename(output);
    html = html.split(oldBase).join(newBase);
    await unlink(input);
    console.log(`dist webp: ${path.basename(output)} (${(before / 1e6).toFixed(2)} MB → ${(after / 1024).toFixed(0)} KB)`);
  }

  await writeFile(indexHtml, html, 'utf8');
  console.log('optimize-dist: index.html actualizado');
} catch (e) {
  if (e?.code === 'ENOENT') {
    console.log('optimize-dist: dist/assets no existe — corré vite build primero');
    process.exit(0);
  }
  throw e;
}

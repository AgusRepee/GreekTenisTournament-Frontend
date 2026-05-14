const newsImageModules = import.meta.glob('../../img/*.{png,jpg,jpeg,webp,gif,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

/**
 * URL para mostrar imagen de noticia.
 * - `data:image/...` (admin, Base64 en localStorage): se devuelve tal cual.
 * - `http(s)://`: externa.
 * - nombre de archivo: resuelve contra `/img` vía Vite.
 */
export function resolveNewsImageUrl(filename: string | undefined): string {
  if (!filename) return '';
  const trimmed = filename.trim();
  if (/^(data:|https?:\/\/)/i.test(trimmed)) return trimmed;
  const base = trimmed.replace(/\\/g, '/').replace(/^.*\//, '');
  const suffix = `/${base}`;
  const hit = Object.keys(newsImageModules).find((p) => p.replace(/\\/g, '/').endsWith(suffix));
  return hit ? newsImageModules[hit] : '';
}

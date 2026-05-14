import { cleanPlayerName } from './matchDedupe';

export function parseVsLine(line: string): { rawLeft: string; rawRight: string; a: string; b: string } | null {
  const trimmed = line.trim();
  if (!/\s+vs\s+/i.test(trimmed)) return null;
  const parts = trimmed.split(/\s+vs\s+/i);
  if (parts.length < 2) return null;
  const rawLeft = parts[0]!.trim();
  const rawRight = parts.slice(1).join(' vs ').trim();
  const a = cleanPlayerName(rawLeft);
  const b = cleanPlayerName(rawRight);
  if (!a || !b) return null;
  return { rawLeft, rawRight, a, b };
}

export function parseLibre(line: string): string | null {
  const m = line.trim().match(/^Libre:\s*(.+)$/i);
  return m ? cleanPlayerName(m[1]!) : null;
}

export function formatVsDisplay(line: string): string {
  const vs = parseVsLine(line);
  if (!vs) return line.replace(/\s*\(P\)\s*/gi, '').trim();
  return `${cleanPlayerName(vs.rawLeft)} vs ${cleanPlayerName(vs.rawRight)}`;
}

import type { Player } from '../mockData';
import { getMatchesByTournament } from '../mockData';
import { cleanPlayerName, matchInputDedupeKey } from './matchDedupe';

export type KnockoutStage = 'repechaje' | 'octavos' | 'quarter' | 'semi' | 'final';

export interface KnockoutAdminEntry {
  kind: 'ko';
  dedupeKey: string;
  tournamentId: string;
  matchId: string;
  /** Misma convención que `upsertResult` para cuadro KO. */
  group: string;
  round: number;
  koStage: KnockoutStage;
  playerA: string;
  playerB: string;
  roundLabel: string;
}

function classifyKnockoutRound(roundLabel: string): KnockoutStage | null {
  const raw = roundLabel.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  /** Partidos de fase de grupos en plantilla: no son eliminatoria. */
  if (/^fecha\s*\d/i.test(raw)) return null;
  if (/repechaje|repesca|play-?off|play-?in|previo|clasificatorio|pre-?cuadro/i.test(lower)) return 'repechaje';
  if (
    /\boctavos?\b|dieciseis|round\s*(of\s*)?16|\br16\b|\bof\s*16\b|16avos?|8vos?|\beighth\b/i.test(lower)
  ) {
    return 'octavos';
  }
  if (/cuarto|quarter|\bqf\b/i.test(lower)) return 'quarter';
  if (/semi/i.test(lower)) return 'semi';
  if (/\bfinal\b/i.test(lower) || lower === 'final') return 'final';
  return null;
}

function resolveName(raw: string, players: Player[]): string {
  const byId = players.find((p) => p.id === raw);
  if (byId) return cleanPlayerName(byId.name);
  return cleanPlayerName(raw);
}

/** Partidos del cuadro KO (club + embebidos p. ej. Liga 3) clasificados por ronda. */
export function buildKnockoutAdminEntries(tournamentId: string, players: Player[]): KnockoutAdminEntry[] {
  const matches = getMatchesByTournament(tournamentId);
  const out: KnockoutAdminEntry[] = [];
  for (const m of matches) {
    const ko = classifyKnockoutRound(m.round ?? '');
    if (!ko) continue;
    const playerA = resolveName(m.playerA, players);
    const playerB = resolveName(m.playerB, players);
    const group = `KO-${m.id}`;
    const round = 0;
    const dedupeKey = matchInputDedupeKey({
      tournamentId,
      group,
      round,
      playerA,
      playerB,
    });
    out.push({
      kind: 'ko',
      dedupeKey,
      tournamentId,
      matchId: m.id,
      group,
      round,
      koStage: ko,
      playerA,
      playerB,
      roundLabel: (m.round ?? '').trim() || ko,
    });
  }
  return out;
}

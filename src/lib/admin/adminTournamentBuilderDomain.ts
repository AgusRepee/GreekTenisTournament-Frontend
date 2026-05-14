import type { LeagueNum, Player } from '@/lib/mockData';
import { categoryToLeague } from '@/lib/mockData';
import type {
  AdminGroupRow,
  AdminLeagueBuilderSlice,
  AdminLeagueGroupConfig,
  AdminTournamentProject,
} from './adminTournamentBuilderTypes';

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function defaultLeagueConfig(): AdminLeagueGroupConfig {
  return {
    groupCount: 3,
    playersPerGroupExpected: 5,
    qualifyTopN: 2,
    repechajeMejoresTerceros: true,
    classificationRulesText: 'Clasifican los dos primeros de cada grupo. Los mejores terceros definen repechaje.',
    eliminationStart: 'quarterfinals',
  };
}

export function buildEmptyGroups(config: AdminLeagueGroupConfig): AdminGroupRow[] {
  const n = Math.max(1, Math.min(26, Math.floor(config.groupCount)));
  const rows: AdminGroupRow[] = [];
  for (let i = 0; i < n; i++) {
    const letter = GROUP_LETTERS[i] ?? 'A';
    rows.push({ groupKey: letter, label: `Grupo ${letter}`, playerIds: [] });
  }
  return rows;
}

export function leagueKey(n: LeagueNum): string {
  return String(n);
}

export function getLeagueSlice(project: AdminTournamentProject, leagueNum: LeagueNum): AdminLeagueBuilderSlice | undefined {
  return project.leagues[leagueKey(leagueNum)];
}

export function ensureLeagueSlice(project: AdminTournamentProject, leagueNum: LeagueNum): AdminLeagueBuilderSlice {
  const k = leagueKey(leagueNum);
  const existing = project.leagues[k];
  if (existing) return existing;
  const fresh: AdminLeagueBuilderSlice = {
    leagueNum,
    config: null,
    availablePlayerIds: [],
    groups: [],
    groupsLocked: false,
    groupsCommitted: null,
  };
  return fresh;
}

export function playersInLeagueFromClub(players: Player[], leagueNum: LeagueNum): Player[] {
  return players.filter((p) => categoryToLeague(p.category) === leagueNum);
}

export function mergePoolIds(clubPlayers: Player[], leagueNum: LeagueNum, syntheticIds: string[]): string[] {
  const fromClub = playersInLeagueFromClub(clubPlayers, leagueNum).map((p) => p.id);
  const set = new Set<string>([...fromClub, ...syntheticIds]);
  return Array.from(set);
}

export interface GroupValidationIssue {
  code: string;
  message: string;
}

export function validateGroupsForLeague(slice: AdminLeagueBuilderSlice): GroupValidationIssue[] {
  const issues: GroupValidationIssue[] = [];
  const cfg = slice.config;
  if (!cfg) {
    issues.push({ code: 'no_config', message: 'Falta la configuración de la liga.' });
    return issues;
  }

  if (slice.groups.length !== cfg.groupCount) {
    issues.push({
      code: 'group_count',
      message: `La cantidad de grupos (${slice.groups.length}) no coincide con la configuración (${cfg.groupCount}).`,
    });
  }

  const seen = new Map<string, string>();
  for (const g of slice.groups) {
    if (g.playerIds.length === 0) {
      issues.push({ code: 'empty', message: `${g.label} está vacío.` });
    }
    if (cfg.playersPerGroupExpected > 0 && g.playerIds.length > cfg.playersPerGroupExpected) {
      issues.push({
        code: 'overflow',
        message: `${g.label} supera la cantidad recomendada (${g.playerIds.length}/${cfg.playersPerGroupExpected}).`,
      });
    }
    for (const pid of g.playerIds) {
      if (seen.has(pid)) {
        const other = seen.get(pid)!;
        issues.push({
          code: 'dup',
          message: `El jugador ya está asignado en ${other} y en ${g.label}.`,
        });
      } else {
        seen.set(pid, g.label);
      }
    }
  }

  for (const pid of slice.availablePlayerIds) {
    if (seen.has(pid)) {
      issues.push({ code: 'dup_avail', message: `El jugador aparece en la lista disponible y también en ${seen.get(pid)}.` });
    }
  }

  return issues;
}

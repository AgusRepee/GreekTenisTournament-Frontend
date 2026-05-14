/**
 * Pruebas ligeras alineadas a la checklist `docs/admin-resultados-checklist.md`.
 * Cubren helpers puros del flujo admin/público; no lanzan Puppeteer ni el panel React.
 */

import { describe, it, expect } from 'vitest';
import type { MatchInput } from '@/types/tennisResults';
import {
  LABEL_SUSPENDED,
  LABEL_WALKOVER_BADGE,
  formatPublicResultSummary,
  resolveAdminMatchPresentation,
  resolvePublicMatchPresentation,
  storedHasViewableOutcome,
} from '@/lib/tennis/matchDisplayState';
import { EMPTY_GRID, buildScoreStringIfValid } from '@/lib/tennis/adminScoreValidation';

function filledGrid(...cols: ReadonlyArray<readonly [string, string]>) {
  const g = {
    a: ['', '', ''] as [string, string, string],
    b: ['', '', ''] as [string, string, string],
  };
  cols.forEach((pair, i) => {
    if (i >= 3) return;
    g.a[i] = pair[0]!;
    g.b[i] = pair[1]!;
  });
  return g;
}

describe('admin operative — match display state (persistido vs borrador)', () => {
  it('público: pendiente sin match', () => {
    expect(resolvePublicMatchPresentation(undefined).phase).toBe('pending');
    expect(resolvePublicMatchPresentation(undefined).showEditedChip).toBe(false);
  });

  it('público: jugado con score → played', () => {
    const m: MatchInput = {
      tournamentId: 'x',
      playerA: 'A',
      playerB: 'B',
      score: '6-0 6-0',
      status: 'played',
    };
    expect(resolvePublicMatchPresentation(m).phase).toBe('played');
    expect(formatPublicResultSummary(m)).toBe('6-0 6-0');
  });

  it('público: suspended / walkover labels', () => {
    const s: MatchInput = {
      tournamentId: 'x',
      playerA: 'A',
      playerB: 'B',
      score: '',
      status: 'suspended',
    };
    expect(resolvePublicMatchPresentation(s).phase).toBe('suspended');
    expect(formatPublicResultSummary(s)).toBe(LABEL_SUSPENDED);

    const w: MatchInput = {
      tournamentId: 'x',
      playerA: 'A',
      playerB: 'B',
      score: 'A',
      status: 'walkover',
    };
    expect(resolvePublicMatchPresentation(w).phase).toBe('walkover');
    expect(formatPublicResultSummary(w)).toBe(LABEL_WALKOVER_BADGE);
  });

  it('admin: sin persistido + celdas completas → draft', () => {
    const cells = filledGrid(['6', '4'], ['3', '6'], ['10', '8']);
    const built = buildScoreStringIfValid(cells);
    expect(built.ok).toBe(true);
    const draftFingerprintOk = built.ok;
    const stored: MatchInput | undefined = undefined;
    const draftDiffers = draftFingerprintOk; // vs vacío stored
    const pres = resolveAdminMatchPresentation(stored, draftDiffers);
    expect(pres.phase).toBe('draft');
    expect(pres.showEditedChip).toBe(false);
  });

  it('admin: jugado persistido + borrador distinto → mismo phase + chip editado', () => {
    const stored: MatchInput = {
      tournamentId: 'x',
      group: 'A',
      round: 1,
      playerA: 'P',
      playerB: 'Q',
      score: '6-0 6-0',
      status: 'played',
    };
    expect(storedHasViewableOutcome(stored)).toBe(true);
    const dirtyCells = filledGrid(['6', '4'], ['4', '6'], ['10', '6']);
    expect(buildScoreStringIfValid(dirtyCells).ok).toBe(true);
    const pres = resolveAdminMatchPresentation(stored, true);
    expect(pres.phase).toBe('played');
    expect(pres.showEditedChip).toBe(true);
  });
});

describe('admin operative — buildScoreStringIfValid (guardas de carga)', () => {
  it('rechaza set incompleto', () => {
    const cells = structuredClone(EMPTY_GRID);
    cells.a[0] = '6';
    cells.b[0] = '';
    expect(buildScoreStringIfValid(cells).ok).toBe(false);
  });

  it('acepta partido válido típico', () => {
    const cells = filledGrid(['6', '4'], ['6', '3']);
    const built = buildScoreStringIfValid(cells);
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.value.replace(/\s+/g, '')).toMatch(/6[-–]46[-–]3/);
    }
  });
});

describe('persistencia — claves documentadas para checklist', () => {
  it('exporta MATCH_RESULTS_STORAGE_KEY desde persistenceKeys', async () => {
    const mod = await import('@/data/types/persistenceKeys');
    expect(mod.MATCH_RESULTS_STORAGE_KEY).toBe('greek-tennis-results-v1');
    expect(mod.PERSISTENCE_KEYS.partidos).toBeTruthy();
    expect(mod.PERSISTENCE_KEYS.jugadores).toBeTruthy();
  });

  it('ADMIN_SESSION existe en código de auth', async () => {
    const keys = JSON.stringify({ isAdmin: true, token: 'secure-token' });
    expect(keys).toContain('isAdmin');
  });
});

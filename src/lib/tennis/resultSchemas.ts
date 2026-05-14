/**
 * Schemas Zod para JSON de resultados (ver docs/TENNIS_ENGINE_SPEC.md).
 */

import { z } from 'zod';

export const MatchStatusSchema = z.enum(['played', 'walkover', 'retired', 'pending']);

export const MatchInputSchema = z.object({
  tournamentId: z.string(),
  group: z.string().optional(),
  round: z.number().optional(),
  playerA: z.string().min(1),
  playerB: z.string().min(1),
  score: z.string().optional(),
  status: MatchStatusSchema,
  date: z.string().optional(),
});

export const MatchResultBatchSchema = z.object({
  matches: z.array(MatchInputSchema),
});

export const PlayerRegistryEntrySchema = z.object({
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  id: z.string().optional(),
  liga: z.number().optional(),
});

export const PlayerRegistrySchema = z.array(PlayerRegistryEntrySchema);

export const LigaTemplateSchema = z.object({
  torneo: z.string(),
  liga: z.number(),
  grupos: z.record(z.string(), z.array(z.string())),
  fechas: z.array(
    z.object({
      numero: z.number(),
      grupos: z.record(z.string(), z.array(z.string())).optional(),
      partidos: z.array(z.string()).optional(),
      tipo: z.string().optional(),
    }),
  ),
  nota: z.string().optional(),
});

export const TournamentMetaSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  name: z.string(),
  liga: z.number(),
  status: z.enum(['upcoming', 'ongoing', 'finished']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  slotsTotal: z.number().optional(),
  slotsTaken: z.number().optional(),
  phaseKind: z.enum(['groups', 'ko', 'mixed']).optional(),
  rulesNote: z.string().optional(),
});

export type MatchInputParsed = z.infer<typeof MatchInputSchema>;
export type MatchResultBatchParsed = z.infer<typeof MatchResultBatchSchema>;
export type LigaTemplateParsed = z.infer<typeof LigaTemplateSchema>;
export type TournamentMetaParsed = z.infer<typeof TournamentMetaSchema>;

export function safeParseMatchBatch(input: unknown) {
  const result = MatchResultBatchSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error.format() };
  }
  return { success: true as const, data: result.data };
}

export function safeParseLigaTemplate(input: unknown) {
  const result = LigaTemplateSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error.format() };
  }
  return { success: true as const, data: result.data };
}

export function safeParseTournamentMeta(input: unknown) {
  const result = TournamentMetaSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error.format() };
  }
  return { success: true as const, data: result.data };
}

export function safeParsePlayerRegistry(input: unknown) {
  const result = PlayerRegistrySchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error.format() };
  }
  return { success: true as const, data: result.data };
}

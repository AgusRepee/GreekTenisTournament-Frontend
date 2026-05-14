/**
 * Punto de entrada del submódulo tennis (motor, schemas, tipos).
 * Ej.: import { parseMatch, safeParseMatchBatch, type MatchResult } from '@/src/lib/tennis';
 */

export * from './matchStatsEngine';
export * from './resultSchemas';
export * from './resultsFromDocs';
export * from './computeTournamentSnapshot';
export * from './resultsStore';
export * from './tournamentSnapshotBridge';
export * from './tournamentEngine';
export * from './groupStandings';
export * from './calculatePlayerStats';
export * from './tournamentRanking';
export * from './playerReachedPhase';
export * from './tournamentPhasePoints';
export * from './globalRanking';
export * from './playoffQualification';
export * from './repechageGeneration';
export * from './eliminationBracket';
export * from './derivedTennisData';
export * from './useTennisLiveData';
export * from './resultsFlowVerification';
export * from './tournamentSeeding';
export {
  aggregatePlayerStatsFromMatches,
  calculateLeagueRankingsMap,
  calculateStandingsFromMatchResults,
  detectAllPlayerPhases,
  detectPlayerPhase,
  type PlayerPhaseByTournament,
  type StandingsGroupResult,
} from './automaticTournamentEngine';
export type * from '../../types/tennisResults';

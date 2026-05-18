export type Player = {
  name: string;
  /** Código de país (2 letras), ej. "ES", "AR", "GB" */
  flag: string;
  /** Filename in /img for player photo */
  image: string;
  ranking: number | null;
  /** Sets won per set, e.g. [6, 6] for 6-4, 6-3 */
  sets: number[];
};

export type Match = {
  player1: Player;
  player2: Player;
  winner: 'player1' | 'player2' | null;
  resultText?: string | null;
};

export type RoundName = 'quarterfinals' | 'semifinals' | 'final';

export type Round = {
  name: RoundName;
  matches: Match[];
};

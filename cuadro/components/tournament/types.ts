export interface Player {
  id: string
  name: string
  ranking: number
  countryCode: string
  photoUrl?: string
}

export interface SetScore {
  player1: number
  player2: number
  tiebreak?: number
}

export interface Match {
  id: string
  player1: Player
  player2: Player
  sets: SetScore[]
  winner: 1 | 2
}

export interface Round {
  name: string
  matches: Match[]
}

export interface TournamentData {
  name: string
  rounds: Round[]
}

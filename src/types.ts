export type Round = 'R32' | 'R16' | 'QF' | 'SF' | 'F'

export interface RoundDef {
  id: Round
  name: string
  points: number
}

export interface Match {
  id: number
  round: Round
  datetime: string
  /** Present only for R32 (seeded). */
  teams?: [string, string]
  /** Present for R16/QF/SF/F: ids whose winners meet here. */
  feeders?: [number, number]
}

export interface Tournament {
  rounds: RoundDef[]
  teams: string[]
  matches: Match[]
}

export interface Bracket {
  username: string
  /** matchId -> predicted winning team */
  picks: Record<number, string>
}

export type Brackets = Bracket[]

export interface Results {
  /** matchId -> actual winner (only completed matches) */
  winners: Record<number, string>
}

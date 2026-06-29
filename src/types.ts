export type Round = 'R32' | 'R16' | 'QF' | 'SF' | 'F'

export interface RoundInfo {
  id: Round
  name: string
  points: number
}

export interface Match {
  id: number
  round: Round
  /** ISO-ish display string, Pacific Time. */
  datetime: string
  /** Present only for R32 (seeded matchups). */
  teams?: [string, string]
  /** Present for R16/QF/SF/F: the two match ids whose winners meet here. */
  feeders?: [number, number]
}

export interface Tournament {
  rounds: RoundInfo[]
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
  /**
   * When true, picks are hidden from everyone except the admin until the
   * organizer reveals them (e.g., until all brackets have been submitted).
   */
  locked?: boolean
}

import type { Bracket, Results, Round, Tournament } from '../types'

export interface RoundBreakdown {
  round: Round
  name: string
  points: number
  /** Correct picks scored in this round so far. */
  correct: number
  /** Points earned in this round (correct * points). */
  earned: number
  /** Total matches in this round. */
  total: number
  /** Round maximum (total * points). */
  max: number
}

export interface Score {
  total: number
  byRound: RoundBreakdown[]
}

/**
 * Advancement-based scoring. For each round with point value `p`, a pick scores
 * `p` whenever the match has a real result AND the user's predicted winner
 * matches the actual winner — regardless of whether the predicted opponent was
 * correct. Maximum possible total is 80.
 */
export function scoreBracket(
  bracket: Bracket,
  results: Results,
  t: Tournament,
): Score {
  const breakdown: RoundBreakdown[] = t.rounds.map((r) => {
    const matches = t.matches.filter((m) => m.round === r.id)
    let correct = 0
    for (const m of matches) {
      const actual = results.winners[m.id]
      if (actual != null && bracket.picks[m.id] === actual) correct += 1
    }
    return {
      round: r.id,
      name: r.name,
      points: r.points,
      correct,
      earned: correct * r.points,
      total: matches.length,
      max: matches.length * r.points,
    }
  })

  return {
    total: breakdown.reduce((sum, r) => sum + r.earned, 0),
    byRound: breakdown,
  }
}

/** The maximum possible total across all rounds (80 for the standard bracket). */
export function maxPossibleTotal(t: Tournament): number {
  return t.rounds.reduce(
    (sum, r) => sum + r.points * t.matches.filter((m) => m.round === r.id).length,
    0,
  )
}

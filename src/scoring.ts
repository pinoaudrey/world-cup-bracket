import { eliminatedTeams } from './bracket'
import type { Bracket, Results, Round, Tournament } from './types'

export interface RoundBreakdown {
  round: Round
  name: string
  /** Points awarded per correct pick in this round. */
  pointsEach: number
  /** Matches in this round the player got right (result known + matches). */
  correct: number
  /** Points earned this round = correct * pointsEach. */
  earned: number
  /** Maximum points obtainable in this round (always matches * pointsEach). */
  maxRound: number
}

export interface BracketScore {
  username: string
  total: number
  byRound: RoundBreakdown[]
  /** Ceiling the player can still reach given current reality. */
  maxPossible: number
  /** maxPossible - total. */
  maxRemaining: number
  /** Correct picks among the decided matches the player picked. */
  correct: number
  /** Decided matches the player made a pick on. */
  decided: number
  /** correct / decided as a rounded percentage, or null if none decided yet. */
  pctCorrect: number | null
}

/**
 * Advancement-based scoring.
 *
 * For each round R worth `p` points, a player earns `p` for every match `m`
 * in R where the real winner is known AND their predicted winner matches the
 * real winner — REGARDLESS of whether they predicted the correct opponent.
 * You only need the advancing team right, not the matchup.
 *
 * Maximum possible total across all rounds is 80 (16 + 16 + 16 + 16 + 16).
 */
export function scoreBracket(
  bracket: Bracket,
  t: Tournament,
  results: Results,
): BracketScore {
  const winners = results.winners
  const eliminated = eliminatedTeams(t, winners)

  let total = 0
  let maxPossible = 0
  let correctTotal = 0
  let decidedTotal = 0

  const byRound: RoundBreakdown[] = t.rounds.map((round) => {
    const matches = t.matches.filter((m) => m.round === round.id)
    let correct = 0
    let roundMaxPossible = 0

    for (const m of matches) {
      const pick = bracket.picks[m.id]
      const winner = winners[m.id]

      if (winner !== undefined) {
        // Decided match. It only counts toward accuracy if the player picked it.
        if (pick !== undefined) {
          decidedTotal += 1
          if (pick === winner) {
            correct += 1
            roundMaxPossible += 1
            correctTotal += 1
          }
        }
      } else if (pick !== undefined && !eliminated.has(pick)) {
        // Pending match whose picked team is still alive: still winnable.
        roundMaxPossible += 1
      }
    }

    const earned = correct * round.points
    total += earned
    maxPossible += roundMaxPossible * round.points

    return {
      round: round.id,
      name: round.name,
      pointsEach: round.points,
      correct,
      earned,
      maxRound: matches.length * round.points,
    }
  })

  return {
    username: bracket.username,
    total,
    byRound,
    maxPossible,
    maxRemaining: maxPossible - total,
    correct: correctTotal,
    decided: decidedTotal,
    pctCorrect: decidedTotal > 0 ? Math.round((correctTotal / decidedTotal) * 100) : null,
  }
}

export interface RankedScore extends BracketScore {
  rank: number
}

/**
 * Score and rank every bracket. Sorted by total descending; ties share a rank
 * with alphabetical username as the secondary (display) sort.
 */
export function leaderboard(
  brackets: Bracket[],
  t: Tournament,
  results: Results,
): RankedScore[] {
  const scored = brackets
    .map((b) => scoreBracket(b, t, results))
    .sort(
      (a, b) =>
        b.total - a.total || a.username.localeCompare(b.username),
    )

  let lastTotal: number | null = null
  let lastRank = 0
  return scored.map((s, i) => {
    const rank = lastTotal === s.total ? lastRank : i + 1
    lastTotal = s.total
    lastRank = rank
    return { ...s, rank }
  })
}

export const MAX_SCORE = 80

import { describe, expect, it } from 'vitest'
import tournamentData from '../public/data/tournament.json'
import {
  bracketOrder,
  eliminatedTeams,
  isComplete,
  nextEmptyPick,
  participants,
  pickSequence,
  pruneInvalid,
  setPick,
} from './bracket'
import { abbrFor } from './flags'
import { leaderboard, MAX_SCORE, scoreBracket } from './scoring'
import type { Bracket, Results, Tournament } from './types'

const t = tournamentData as Tournament

/** Build a self-consistent set of real winners: the first slot always wins. */
function firstSlotWinners(): Record<number, string> {
  const winners: Record<number, string> = {}
  for (const m of t.matches) {
    const [a] = participants(m, winners)
    if (a) winners[m.id] = a
  }
  return winners
}

describe('worked example from the spec (advancement-based scoring)', () => {
  // R16 Match 91 has feeders [76 (Brazil/Japan), 78 (Ivory Coast/Norway)].
  // Reality: Brazil wins 76, Norway wins 78, so 91 is really Brazil vs Norway,
  // and Brazil wins 91.
  const results: Results = {
    winners: { 76: 'Brazil', 78: 'Norway', 91: 'Brazil' },
  }

  it('awards the R16 points when the advancing team is right but the opponent is wrong', () => {
    // Player's bracket: 91 is "Brazil vs Ivory Coast" and Brazil advances.
    const bracket: Bracket = {
      username: 'alice',
      picks: { 76: 'Brazil', 78: 'Ivory Coast', 91: 'Brazil' },
    }
    const score = scoreBracket(bracket, t, results)
    const r16 = score.byRound.find((r) => r.round === 'R16')!
    // Got match 91 right (Brazil advanced) even though they had the wrong
    // opponent (Ivory Coast instead of the real Norway): 2 points.
    expect(r16.earned).toBe(2)
    expect(r16.correct).toBe(1)
    // Plus 1 R32 point for correctly advancing Brazil from match 76.
    expect(score.byRound.find((r) => r.round === 'R32')!.earned).toBe(1)
    expect(score.total).toBe(3)
  })

  it('awards 0 for that match when the picked advancing team did not advance', () => {
    const bracket: Bracket = {
      username: 'bob',
      // Bob advanced Ivory Coast from 91; Ivory Coast did not advance.
      picks: { 76: 'Brazil', 78: 'Ivory Coast', 91: 'Ivory Coast' },
    }
    const score = scoreBracket(bracket, t, results)
    expect(score.byRound.find((r) => r.round === 'R16')!.earned).toBe(0)
    // Still gets the R32 point for Brazil winning 76.
    expect(score.total).toBe(1)
  })
})

describe('pctCorrect (accuracy among decided picks)', () => {
  it('is correct picks over decided matches the player actually picked', () => {
    const results: Results = { winners: { 76: 'Brazil', 78: 'Norway', 91: 'Brazil' } }
    const bracket: Bracket = {
      username: 'alice',
      picks: { 76: 'Brazil', 78: 'Ivory Coast', 91: 'Brazil' },
    }
    const s = scoreBracket(bracket, t, results)
    expect(s.decided).toBe(3) // picked all three decided matches
    expect(s.correct).toBe(2) // 76 + 91 right, 78 wrong
    expect(s.pctCorrect).toBe(67) // round(2/3 * 100)
  })

  it('is null when the player has no decided picks yet', () => {
    const s = scoreBracket({ username: 'x', picks: {} }, t, { winners: { 73: 'Canada' } })
    expect(s.decided).toBe(0)
    expect(s.pctCorrect).toBeNull()
  })
})

describe('scoreBracket totals', () => {
  it('a perfect bracket scores the maximum of 80', () => {
    const winners = firstSlotWinners()
    const bracket: Bracket = { username: 'perfect', picks: { ...winners } }
    const score = scoreBracket(bracket, t, { winners })
    expect(score.total).toBe(MAX_SCORE)
    expect(score.maxPossible).toBe(MAX_SCORE)
    expect(score.maxRemaining).toBe(0)
    // Each round maxes out at 16.
    for (const r of score.byRound) expect(r.earned).toBe(16)
  })

  it('an empty results set yields 0 but full maxPossible for a complete bracket', () => {
    const winners = firstSlotWinners()
    const bracket: Bracket = { username: 'hopeful', picks: { ...winners } }
    const score = scoreBracket(bracket, t, { winners: {} })
    expect(score.total).toBe(0)
    // No team eliminated yet, every pick still alive -> ceiling is 80.
    expect(score.maxPossible).toBe(MAX_SCORE)
    expect(score.maxRemaining).toBe(MAX_SCORE)
  })

  it('caps maxPossible once a picked team is eliminated in reality', () => {
    // Reality: Japan beats Brazil in match 76. A bracket that had Brazil going
    // all the way loses every point that depended on Brazil.
    const bracket: Bracket = {
      username: 'brazilfan',
      picks: { 76: 'Brazil', 91: 'Brazil', 99: 'Brazil', 102: 'Brazil', 103: 'Brazil' },
    }
    const results: Results = { winners: { 76: 'Japan' } }
    const score = scoreBracket(bracket, t, results)
    expect(score.total).toBe(0)
    // Brazil is eliminated, so none of those picks can ever score.
    expect(score.maxPossible).toBe(0)
  })
})

describe('topology: pruneInvalid / setPick cascade', () => {
  it('clears downstream picks when an earlier pick changes', () => {
    // Advance Germany (74) -> into 89; pick Germany to win 89 and 97.
    let picks: Record<number, string> = {}
    picks = setPick(picks, 74, 'Germany', t) // R32
    picks = setPick(picks, 77, 'France', t) // R32, other feeder of 89
    picks = setPick(picks, 89, 'Germany', t) // R16 (Germany vs France)
    picks = setPick(picks, 90, 'Canada', t) // need 90 to fill 97's other slot
    picks = setPick(picks, 73, 'Canada', t)
    picks = setPick(picks, 75, 'Morocco', t)
    picks = setPick(picks, 97, 'Germany', t) // QF (89 vs 90)
    expect(picks[97]).toBe('Germany')

    // Now change match 74 so Paraguay advances instead of Germany.
    picks = setPick(picks, 74, 'Paraguay', t)
    // 89 had Germany, which can no longer reach it -> cleared, and 97 with it.
    expect(picks[89]).toBeUndefined()
    expect(picks[97]).toBeUndefined()
    // The independent feeder pick (77 -> France) is untouched.
    expect(picks[77]).toBe('France')
  })

  it('cannot pick a team for a slot it cannot reach', () => {
    // Match 89 feeders are 74 and 77. Picking a team that advanced from
    // neither must not survive a prune.
    const picks = pruneInvalid({ 74: 'Germany', 77: 'France', 89: 'Brazil' }, t)
    expect(picks[89]).toBeUndefined()
  })

  it('isComplete is true only with all 31 picks', () => {
    const winners = firstSlotWinners()
    expect(isComplete(winners, t)).toBe(true)
    const { 103: _final, ...missingFinal } = winners
    expect(isComplete(missingFinal, t)).toBe(false)
  })
})

describe('eliminatedTeams', () => {
  it('marks the loser of every completed real match', () => {
    const results: Results = { winners: { 76: 'Brazil', 78: 'Norway' } }
    const elim = eliminatedTeams(t, results.winners)
    expect(elim.has('Japan')).toBe(true) // lost 76
    expect(elim.has('Ivory Coast')).toBe(true) // lost 78
    expect(elim.has('Brazil')).toBe(false)
    expect(elim.has('Norway')).toBe(false)
  })
})

describe('bracketOrder (tree layout ordering)', () => {
  const order = bracketOrder(t)

  it('orders R32 so feeder pairs are vertically adjacent', () => {
    expect(order.R32.map((m) => m.id)).toEqual([
      74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87,
    ])
    expect(order.QF.map((m) => m.id)).toEqual([97, 98, 99, 100])
    expect(order.F.map((m) => m.id)).toEqual([103])
  })

  it('keeps every match’s two feeders adjacent in the previous round', () => {
    for (const round of ['R16', 'QF', 'SF', 'F'] as const) {
      const prev = { R16: 'R32', QF: 'R16', SF: 'QF', F: 'SF' }[round] as
        | 'R32'
        | 'R16'
        | 'QF'
        | 'SF'
      const prevIds = order[prev].map((m) => m.id)
      for (const m of order[round]) {
        const [a, b] = m.feeders!
        expect(Math.abs(prevIds.indexOf(a) - prevIds.indexOf(b))).toBe(1)
      }
    }
  })
})

describe('nextEmptyPick (editor auto-advance)', () => {
  it('starts at the first match in reading order when nothing is picked', () => {
    // pickSequence flattens bracketOrder; R32 leads, top card first.
    const first = pickSequence(t)[0].id
    expect(nextEmptyPick({}, t)).toBe(first)
    expect(first).toBe(74)
  })

  it('advances to the next empty match after the one just picked', () => {
    const picks = setPick({}, 74, participants(t.matches.find((m) => m.id === 74)!, {})[0]!, t)
    // R32 reading order is [74, 77, ...] so 77 is next.
    expect(nextEmptyPick(picks, t, 74)).toBe(77)
  })

  it('skips matches whose participants are not decided yet', () => {
    // Only one R32 pick: the R16 match it feeds (89, feeders 74 & 77) is not
    // yet pickable, so we stay in R32 rather than jumping to it.
    const picks = setPick({}, 74, 'Germany', t)
    const next = nextEmptyPick(picks, t, 74)
    expect(next).toBe(77)
    expect(next).not.toBe(89)
  })

  it('crosses into the next round once it becomes pickable', () => {
    // Fill every R32 (first slot wins). After the last R32 card, the first R16
    // match (89, fed by 74 & 77) now has both teams, so we advance to it.
    const r32: Record<number, string> = {}
    for (const m of t.matches) {
      if (m.round === 'R32') r32[m.id] = participants(m, {})[0]!
    }
    const lastR32 = [...pickSequence(t)].reverse().find((m) => m.round === 'R32')!.id
    expect(nextEmptyPick(r32, t, lastR32)).toBe(89)
  })

  it('returns null when the bracket is complete', () => {
    expect(nextEmptyPick(firstSlotWinners(), t)).toBeNull()
  })
})

describe('abbrFor', () => {
  it('maps known teams to FIFA-style 3-letter codes', () => {
    expect(abbrFor('Germany')).toBe('GER')
    expect(abbrFor('South Africa')).toBe('RSA')
    expect(abbrFor('Ivory Coast')).toBe('CIV')
  })
})

describe('leaderboard', () => {
  it('sorts by total desc, shares rank on ties, alphabetical secondary', () => {
    const winners = { 73: 'South Africa' } // 1 R32 point available
    const results: Results = { winners }
    const brackets: Bracket[] = [
      { username: 'zoe', picks: { 73: 'South Africa' } }, // 1 pt
      { username: 'amy', picks: { 73: 'South Africa' } }, // 1 pt (tie)
      { username: 'max', picks: { 73: 'Canada' } }, // 0 pt
    ]
    const board = leaderboard(brackets, t, results)
    // Tie at top resolved alphabetically: amy then zoe, both rank 1.
    expect(board.map((b) => b.username)).toEqual(['amy', 'zoe', 'max'])
    expect(board[0].rank).toBe(1)
    expect(board[1].rank).toBe(1)
    expect(board[2].rank).toBe(3) // rank skips after a tie
  })
})

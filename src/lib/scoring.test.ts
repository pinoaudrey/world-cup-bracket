import { describe, expect, it } from 'vitest'
import { maxPossibleTotal, scoreBracket } from './scoring'
import type { Bracket, Results, Tournament } from '../types'
import tournamentJson from '../../public/data/tournament.json'

const tournament = tournamentJson as Tournament

describe('scoring (advancement-based)', () => {
  it('max possible total is 80', () => {
    expect(maxPossibleTotal(tournament)).toBe(80)
  })

  // Worked example from the spec: R16 match 91 is really Brazil vs Norway and
  // Brazil wins. The opponent the player predicted does not matter.
  it('awards round points when the advancing team is correct, regardless of opponent', () => {
    const results: Results = { winners: { 91: 'Brazil' } }

    const rightTeam: Bracket = {
      username: 'a',
      // Player predicted "Brazil vs Ivory Coast, Brazil advances".
      picks: { 91: 'Brazil' },
    }
    expect(scoreBracket(rightTeam, results, tournament).total).toBe(2)

    const wrongTeam: Bracket = {
      username: 'b',
      // Player predicted Ivory Coast to advance from match 91.
      picks: { 91: 'Ivory Coast' },
    }
    expect(scoreBracket(wrongTeam, results, tournament).total).toBe(0)
  })

  it('does not award points for matches without a result', () => {
    const results: Results = { winners: {} }
    const bracket: Bracket = { username: 'a', picks: { 73: 'Canada' } }
    expect(scoreBracket(bracket, results, tournament).total).toBe(0)
  })

  it('weights each round and sums per-round breakdown to the total', () => {
    const results: Results = {
      winners: {
        73: 'Canada', // R32 -> 1
        89: 'France', // R16 -> 2
        97: 'France', // QF  -> 4
        101: 'France', // SF  -> 8
        103: 'France', // F   -> 16
      },
    }
    const bracket: Bracket = {
      username: 'a',
      picks: { 73: 'Canada', 89: 'France', 97: 'France', 101: 'France', 103: 'France' },
    }
    const score = scoreBracket(bracket, results, tournament)
    expect(score.total).toBe(1 + 2 + 4 + 8 + 16)
    expect(score.byRound.reduce((s, r) => s + r.earned, 0)).toBe(score.total)
    expect(score.byRound.find((r) => r.round === 'F')?.earned).toBe(16)
  })
})

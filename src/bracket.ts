import type { Match, Round, Tournament } from './types'

export const ROUND_ORDER: Round[] = ['R32', 'R16', 'QF', 'SF', 'F']

/** Map of match id -> Match for O(1) lookup. */
export function byId(t: Tournament): Map<number, Match> {
  return new Map(t.matches.map((m) => [m.id, m]))
}

/** Matches in topological order (feeders always precede the match they feed). */
export function orderedMatches(t: Tournament): Match[] {
  return [...t.matches].sort(
    (a, b) =>
      ROUND_ORDER.indexOf(a.round) - ROUND_ORDER.indexOf(b.round) || a.id - b.id,
  )
}

export function matchesByRound(t: Tournament): Record<Round, Match[]> {
  const out = { R32: [], R16: [], QF: [], SF: [], F: [] } as Record<Round, Match[]>
  for (const m of orderedMatches(t)) out[m.round].push(m)
  return out
}

/**
 * Matches grouped by round but ordered to draw as a tree: within each round the
 * vertical order places each match's two feeders adjacent to one another, so a
 * bracket rendered column-by-column has non-crossing connector lines. Computed
 * by a depth-first post-order walk from the final (feeder[0] above feeder[1]).
 */
export function bracketOrder(t: Tournament): Record<Round, Match[]> {
  const map = byId(t)
  const out = { R32: [], R16: [], QF: [], SF: [], F: [] } as Record<Round, Match[]>
  const ordered = orderedMatches(t)
  const final = [...ordered].reverse().find((m) => m.round === 'F') ?? ordered[ordered.length - 1]
  const visit = (m: Match | undefined) => {
    if (!m) return
    if (m.feeders) {
      visit(map.get(m.feeders[0]))
      visit(map.get(m.feeders[1]))
    }
    out[m.round].push(m)
  }
  visit(final)
  return out
}

/**
 * The two teams that can contest `match`, given a source mapping of
 * matchId -> advancing team. The source is either a person's `picks`
 * (hypothetical bracket) or the real `results.winners`.
 *
 * - R32 matches have a fixed, seeded matchup (`teams`).
 * - Later matches take the advancing team from each feeder; `null` if that
 *   feeder hasn't been decided in the given source yet.
 */
export function participants(
  match: Match,
  source: Record<number, string>,
): [string | null, string | null] {
  if (match.teams) return [match.teams[0], match.teams[1]]
  const [f1, f2] = match.feeders!
  return [source[f1] ?? null, source[f2] ?? null]
}

/**
 * Remove any pick that is not a topology-valid participant of its match.
 * Processing in topological order makes this cascade: changing an early
 * pick invalidates the downstream picks that depended on the old team,
 * which in turn invalidates picks that depended on *those*, and so on.
 */
export function pruneInvalid(
  picks: Record<number, string>,
  t: Tournament,
): Record<number, string> {
  const cleaned: Record<number, string> = { ...picks }
  for (const m of orderedMatches(t)) {
    const pick = cleaned[m.id]
    if (pick === undefined) continue
    const [a, b] = participants(m, cleaned)
    if (pick !== a && pick !== b) delete cleaned[m.id]
  }
  return cleaned
}

/**
 * Set a single pick and return a new, still-valid picks object with any
 * now-orphaned downstream picks cleared.
 */
export function setPick(
  picks: Record<number, string>,
  matchId: number,
  team: string,
  t: Tournament,
): Record<number, string> {
  return pruneInvalid({ ...picks, [matchId]: team }, t)
}

/** A bracket is complete when every match has a pick. */
export function isComplete(picks: Record<number, string>, t: Tournament): boolean {
  return t.matches.every((m) => picks[m.id] !== undefined)
}

/**
 * Matches flattened in the order they're drawn on the board: each round's
 * column top-to-bottom (bracketOrder), rounds left-to-right. This is the
 * reading order used to walk from one pick to the next.
 */
export function pickSequence(t: Tournament): Match[] {
  const ordered = bracketOrder(t)
  return ROUND_ORDER.flatMap((r) => ordered[r])
}

/**
 * The next match that still needs a pick, for auto-advancing the editor after
 * a selection. Scans the board's reading order starting just after
 * `afterMatchId` (or from the top when omitted), wrapping around so any earlier
 * skipped match is still reached. Only returns a match that is pickable *now* —
 * both of its participants are already decided by the current picks — so we
 * never jump to a card whose teams aren't known yet. Returns null when every
 * pickable match is filled.
 */
export function nextEmptyPick(
  picks: Record<number, string>,
  t: Tournament,
  afterMatchId?: number,
): number | null {
  const seq = pickSequence(t)
  const n = seq.length
  const start = afterMatchId != null ? seq.findIndex((m) => m.id === afterMatchId) : -1
  for (let i = 1; i <= n; i++) {
    const m = seq[(start + i) % n]
    if (picks[m.id] !== undefined) continue
    const [a, b] = participants(m, picks)
    if (a !== null && b !== null) return m.id
  }
  return null
}

export function pickCount(picks: Record<number, string>, t: Tournament): number {
  return t.matches.filter((m) => picks[m.id] !== undefined).length
}

/**
 * Teams eliminated in reality: every team that was an actual participant in a
 * completed match but did not win it. Processed in topological order so real
 * winners feed forward into later real matchups.
 */
export function eliminatedTeams(
  t: Tournament,
  winners: Record<number, string>,
): Set<string> {
  const out = new Set<string>()
  for (const m of orderedMatches(t)) {
    const w = winners[m.id]
    if (w === undefined) continue
    const [a, b] = participants(m, winners)
    for (const team of [a, b]) {
      if (team && team !== w) out.add(team)
    }
  }
  return out
}

/** A real match is enterable once both of its actual participants are known. */
export function isEnterable(
  match: Match,
  winners: Record<number, string>,
): boolean {
  const [a, b] = participants(match, winners)
  return a !== null && b !== null
}

import type { Match, Tournament } from '../types'

/** Map of matchId -> Match for quick lookup. */
export function matchesById(t: Tournament): Map<number, Match> {
  return new Map(t.matches.map((m) => [m.id, m]))
}

/** Matches ordered so every feeder comes before the match it feeds (R32 -> F). */
export function matchesInDependencyOrder(t: Tournament): Match[] {
  const order: Record<string, number> = { R32: 0, R16: 1, QF: 2, SF: 3, F: 4 }
  return [...t.matches].sort(
    (a, b) => order[a.round] - order[b.round] || a.id - b.id,
  )
}

/**
 * The two participants of a match, derived from a `source` map of
 * matchId -> winning team. The source may be a user's `picks` (to render the
 * bracket editor) or the actual `results.winners` (to render real matchups).
 *
 * For R32 the participants are the seeded teams. For later rounds they are the
 * winners that the source advanced from the two feeder matches. A slot is
 * `null` when its feeder winner is not yet known in the source.
 */
export function participantsFor(
  match: Match,
  source: Record<number, string>,
): [string | null, string | null] {
  if (match.teams) return [match.teams[0], match.teams[1]]
  if (!match.feeders) return [null, null]
  const [f1, f2] = match.feeders
  return [source[f1] ?? null, source[f2] ?? null]
}

/**
 * Remove picks that are no longer topology-valid. Processing matches in
 * dependency order means clearing an earlier pick cascades: downstream matches
 * lose the team that can no longer reach them, so their picks are dropped too.
 */
export function sanitizePicks(
  picks: Record<number, string>,
  t: Tournament,
): Record<number, string> {
  const next: Record<number, string> = {}
  for (const match of matchesInDependencyOrder(t)) {
    const pick = picks[match.id]
    if (pick == null) continue
    const [a, b] = participantsFor(match, next)
    if (pick === a || pick === b) next[match.id] = pick
  }
  return next
}

/** True when every match has a valid pick (a complete bracket). */
export function isBracketComplete(
  picks: Record<number, string>,
  t: Tournament,
): boolean {
  const clean = sanitizePicks(picks, t)
  return t.matches.every((m) => clean[m.id] != null)
}

/**
 * Teams eliminated in reality: the loser of every completed real match. Used to
 * mark a pick red when the chosen team has already lost, even before its slot
 * has been played in the user's bracket.
 */
export function eliminatedTeams(
  winners: Record<number, string>,
  t: Tournament,
): Set<string> {
  const eliminated = new Set<string>()
  for (const match of t.matches) {
    const winner = winners[match.id]
    if (winner == null) continue
    const [a, b] = participantsFor(match, winners)
    for (const team of [a, b]) {
      if (team && team !== winner) eliminated.add(team)
    }
  }
  return eliminated
}

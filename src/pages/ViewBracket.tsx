import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { bracketOrder, eliminatedTeams, participants } from '../bracket'
import {
  BracketBoard,
  shortTime,
  type ConnectorState,
} from '../components/BracketBoard'
import { abbrFor, flagFor } from '../flags'
import { leaderboard, scoreBracket } from '../scoring'
import { useStore } from '../store'
import type { Match } from '../types'

type PickStatus = 'correct' | 'wrong' | 'pending' | 'none'

/**
 * Coloring rules:
 *  - correct (green): the match has a result and the pick matches it.
 *  - wrong (red): the match has a result the pick missed, OR the picked team
 *    has already been eliminated in reality, even if this slot is unplayed.
 *  - pending (gray): no result yet and the picked team is still alive.
 */
function pickStatus(
  matchId: number,
  pick: string | undefined,
  winners: Record<number, string>,
  eliminated: Set<string>,
): PickStatus {
  if (!pick) return 'none'
  const w = winners[matchId]
  if (w !== undefined) return w === pick ? 'correct' : 'wrong'
  if (eliminated.has(pick)) return 'wrong'
  return 'pending'
}

const statusClass = (s: PickStatus) =>
  s === 'correct' ? 'is-correct' : s === 'wrong' ? 'is-wrong' : 'is-locked'

export function ViewBracket() {
  const { tournament, results, brackets, getBracket } = useStore()
  const { username } = useParams()
  const t = tournament!
  const winners = results.winners

  const bracket = username ? getBracket(username) : undefined
  const byRound = useMemo(() => bracketOrder(t), [t])
  const eliminated = useMemo(() => eliminatedTeams(t, winners), [t, winners])
  const score = useMemo(
    () => (bracket ? scoreBracket(bracket, t, results) : null),
    [bracket, t, results],
  )
  const rank = useMemo(() => {
    if (!bracket) return undefined
    return leaderboard(brackets, t, results).find(
      (r) => r.username.toLowerCase() === bracket.username.toLowerCase(),
    )?.rank
  }, [bracket, brackets, t, results])

  // Correct/decided tally for the "PCT" stat and the subtitle.
  const tally = useMemo(() => {
    if (!bracket) return { decided: 0, correct: 0 }
    let decided = 0
    let correct = 0
    for (const m of t.matches) {
      const w = winners[m.id]
      const p = bracket.picks[m.id]
      if (w !== undefined && p !== undefined) {
        decided++
        if (p === w) correct++
      }
    }
    return { decided, correct }
  }, [bracket, t, winners])

  if (!bracket || !score) {
    return (
      <div>
        <h1>Bracket not found</h1>
        <p className="muted">
          No saved bracket for “{username}”.{' '}
          <Link to="/brackets">See all brackets</Link> or{' '}
          <Link to="/create">create one</Link>.
        </p>
      </div>
    )
  }

  const picks = bracket.picks
  const finalMatch = t.matches.find((m) => m.round === 'F')
  const champPick = finalMatch ? picks[finalMatch.id] : undefined
  const champStatus = finalMatch
    ? pickStatus(finalMatch.id, champPick, winners, eliminated)
    : 'none'

  const pct =
    tally.decided > 0 ? Math.round((tally.correct / tally.decided) * 100) : null
  const subtitle =
    tally.decided === 0
      ? 'No matches decided yet'
      : tally.correct === tally.decided
        ? 'Your bracket is perfect so far'
        : `${tally.correct} of ${tally.decided} picks correct`

  const connState = (f: number): ConnectorState => {
    const fp = picks[f]
    const fw = winners[f]
    if (fw !== undefined && fp !== undefined) return fp === fw ? 'correct' : 'wrong'
    return 'neutral'
  }

  return (
    <div className="bracket-page">
      {/* ---------- Summary header ---------- */}
      <div className="bv-summary">
        <div className="bv-summary-flag">{champPick ? flagFor(champPick) : '🏆'}</div>
        <div className="bv-summary-main">
          <div className="bv-summary-title">
            {bracket.username}’s bracket <span className="medal">🏅</span>
            <Link
              className="bv-edit-gear"
              to={`/create/${encodeURIComponent(bracket.username)}`}
              title="Edit bracket"
            >
              ⚙
            </Link>
          </div>
          <div className="bv-summary-sub muted">{subtitle}</div>
          <div className="bv-stats">
            <div className="bv-stat">
              <div className="bv-stat-num">{rank ?? '—'}</div>
              <div className="bv-stat-label">RANK</div>
            </div>
            <div className="bv-stat">
              <div className="bv-stat-num">{pct === null ? '—' : `${pct}%`}</div>
              <div className="bv-stat-label">PCT</div>
            </div>
            <div className="bv-stat">
              <div className="bv-stat-num">{score.total}</div>
              <div className="bv-stat-label">PTS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-round breakdown (spec: running total + per-round breakdown). */}
      <div className="bv-breakdown">
        {score.byRound.map((r) => (
          <span key={r.round} className="bv-bd-chip">
            <b>{r.round}</b> {r.earned}
            <span className="muted">/{r.maxRound}</span>
          </span>
        ))}
        <span className="bv-bd-chip total">
          <b>Total</b> {score.total}
          <span className="muted">/80</span>
        </span>
        <span className="muted small">· max possible {score.maxPossible}</span>
      </div>

      <div className="legend">
        <span className="chip correct">correct</span>
        <span className="chip wrong">wrong / eliminated</span>
        <span className="chip pending">locked / pending</span>
      </div>

      {/* ---------- The bracket board ---------- */}
      <BracketBoard
        t={t}
        byRound={byRound}
        connectorState={connState}
        measureDeps={[picks, winners]}
        renderCard={(match, round, cardRef) => (
          <ViewCard
            key={match.id}
            cardRef={cardRef}
            match={match}
            roundPoints={round.points}
            picks={picks}
            winners={winners}
            eliminated={eliminated}
          />
        )}
        championCard={
          <div className={`champ-card ${statusClass(champStatus)}`}>
            <div className="champ-title">MY CHAMPIONSHIP PICK</div>
            <div className="champ-name">{champPick ?? 'No pick yet'}</div>
            <div className="champ-flag">{champPick ? flagFor(champPick) : '🏆'}</div>
            {champStatus === 'correct' && <div className="champ-badge ok">✓ Champion</div>}
            {champStatus === 'wrong' && <div className="champ-badge bad">Eliminated</div>}
          </div>
        }
      />
    </div>
  )
}

interface CardProps {
  match: Match
  roundPoints: number
  picks: Record<number, string>
  winners: Record<number, string>
  eliminated: Set<string>
  cardRef: (el: HTMLElement | null) => void
}

function ViewCard({
  match,
  roundPoints,
  picks,
  winners,
  eliminated,
  cardRef,
}: CardProps) {
  // Actual matchup slots: present once that feeder is decided in reality.
  const [realA, realB] = participants(match, winners)
  const winner = winners[match.id]
  const pick = picks[match.id]
  const status = pickStatus(match.id, pick, winners, eliminated)

  // The opponent the player predicted (their other participant in this slot).
  const [predA, predB] = participants(match, picks)
  const over = match.round !== 'R32' ? (predA === pick ? predB : predA) : null

  const label =
    status === 'correct' ? 'Correct' : status === 'wrong' ? 'Incorrect' : 'Locked'
  const badge = status === 'correct' ? '✓' : status === 'wrong' ? '✕' : '🔒'

  return (
    <div className={`bcard ${statusClass(status)}`} data-match={match.id} ref={cardRef}>
      <div className="bcard-main">
        <div className="bcard-label">{label}</div>
        <TeamSlot team={realA} isWinner={winner !== undefined && winner === realA} />
        <TeamSlot team={realB} isWinner={winner !== undefined && winner === realB} />
        <div className="bcard-foot">
          <span className="muted">{shortTime(match.datetime)}</span>
        </div>
      </div>
      <div className="bcard-pick">
        <div className="pick-flag-wrap">
          <span className="pick-flag-tile">
            <span className="pick-flag">{pick ? flagFor(pick) : '—'}</span>
          </span>
          <span className={`pick-badge ${statusClass(status)}`}>{badge}</span>
        </div>
        <div className="pick-my muted">My Pick:</div>
        <div className="pick-abbr">{pick ? abbrFor(pick) : '—'}</div>
        {over && <div className="pick-over muted">(over {abbrFor(over)})</div>}
        {status === 'correct' && (
          <div className="pick-pts">+{roundPoints} PT{roundPoints > 1 ? 'S' : ''}</div>
        )}
      </div>
    </div>
  )
}

function TeamSlot({ team, isWinner }: { team: string | null; isWinner: boolean }) {
  if (!team) {
    return (
      <div className="team-slot placeholder">
        <span className="slot-shield" />
        <span className="slot-bar" />
      </div>
    )
  }
  return (
    <div className={`team-slot${isWinner ? ' winner' : ''}`}>
      <span className="slot-flag">{flagFor(team)}</span>
      <span className="slot-name">{team}</span>
      {isWinner && <span className="slot-win">◄</span>}
    </div>
  )
}

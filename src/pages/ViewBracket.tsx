import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { eliminatedTeams } from '../lib/tournament'
import { maxPossibleTotal, scoreBracket } from '../lib/scoring'
import type { Match } from '../types'
import TeamName from '../components/TeamName'

type Status = 'correct' | 'wrong' | 'pending'

export default function ViewBracket() {
  const { username } = useParams()
  const { tournament, brackets, results } = useData()

  const bracket = brackets.find(
    (b) => b.username.toLowerCase() === (username ?? '').toLowerCase(),
  )

  const eliminated = useMemo(
    () => eliminatedTeams(results.winners, tournament),
    [results, tournament],
  )

  if (!bracket) {
    return (
      <div>
        <h1>Bracket not found</h1>
        <p className="muted">
          No bracket for “{username}”.{' '}
          <Link to="/create">Create one?</Link>
        </p>
      </div>
    )
  }

  const score = scoreBracket(bracket, results, tournament)

  function statusFor(matchId: number): Status {
    const pick = bracket!.picks[matchId]
    if (pick == null) return 'pending'
    const actual = results.winners[matchId]
    if (actual != null) return pick === actual ? 'correct' : 'wrong'
    // No result yet, but the picked team may already be out in reality.
    if (eliminated.has(pick)) return 'wrong'
    return 'pending'
  }

  return (
    <div>
      <h1>{bracket.username}'s bracket</h1>
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>
            Total: {score.total} / {maxPossibleTotal(tournament)}
          </strong>
          <Link className="btn" to={`/create/${encodeURIComponent(bracket.username)}`}>
            Edit
          </Link>
        </div>
        <table style={{ marginTop: '0.75rem' }}>
          <thead>
            <tr>
              <th>Round</th>
              <th className="num">Correct</th>
              <th className="num">Points</th>
            </tr>
          </thead>
          <tbody>
            {score.byRound.map((r) => (
              <tr key={r.round}>
                <td>{r.name}</td>
                <td className="num">
                  {r.correct} / {r.total}
                </td>
                <td className="num">
                  {r.earned} / {r.max}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounds">
        {tournament.rounds.map((round) => (
          <section className="round-col" key={round.id}>
            <h3>
              {round.name} <span className="pts">({round.points} pt)</span>
            </h3>
            {tournament.matches
              .filter((m) => m.round === round.id)
              .map((m) => (
                <ViewMatch
                  key={m.id}
                  match={m}
                  pick={bracket.picks[m.id]}
                  status={statusFor(m.id)}
                />
              ))}
          </section>
        ))}
      </div>
    </div>
  )
}

function ViewMatch({
  match,
  pick,
  status,
}: {
  match: Match
  pick: string | undefined
  status: Status
}) {
  return (
    <div className="match">
      <div className="match__time">#{match.id}</div>
      {pick == null ? (
        <div className="slot empty">no pick</div>
      ) : (
        <div className={`slot cell-${status}`}>
          <TeamName team={pick} />
          <span className="badge">
            {status === 'correct' ? '✓' : status === 'wrong' ? '✗' : '…'}
          </span>
        </div>
      )}
    </div>
  )
}

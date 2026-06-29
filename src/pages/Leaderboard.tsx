import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { maxPossibleTotal, scoreBracket } from '../lib/scoring'

export default function Leaderboard() {
  const { tournament, brackets, results } = useData()

  const rows = useMemo(() => {
    const scored = brackets.map((b) => ({
      username: b.username,
      score: scoreBracket(b, results, tournament),
    }))
    scored.sort(
      (a, b) =>
        b.score.total - a.score.total ||
        a.username.localeCompare(b.username),
    )
    // Ties share a rank; alphabetical is the secondary sort above.
    let lastTotal: number | null = null
    let lastRank = 0
    return scored.map((row, i) => {
      const rank = row.score.total === lastTotal ? lastRank : i + 1
      lastTotal = row.score.total
      lastRank = rank
      return { ...row, rank }
    })
  }, [brackets, results, tournament])

  const maxTotal = maxPossibleTotal(tournament)

  return (
    <div>
      <h1>Leaderboard</h1>
      {rows.length === 0 ? (
        <p className="muted">
          No brackets yet. <Link to="/create">Create one</Link>.
        </p>
      ) : (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                {tournament.rounds.map((r) => (
                  <th key={r.id} className="num">
                    {r.id}
                  </th>
                ))}
                <th className="num">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.username}>
                  <td>{row.rank}</td>
                  <td>{row.username}</td>
                  {row.score.byRound.map((r) => (
                    <td key={r.round} className="num">
                      {r.earned}
                    </td>
                  ))}
                  <td className="num">
                    <strong>{row.score.total}</strong>
                  </td>
                  <td className="num">
                    <Link to={`/bracket/${encodeURIComponent(row.username)}`}>
                      view
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ marginBottom: 0 }}>
            Maximum possible total: {maxTotal}.
          </p>
        </div>
      )}
    </div>
  )
}

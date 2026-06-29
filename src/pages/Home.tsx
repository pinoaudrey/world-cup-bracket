import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { scoreBracket } from '../lib/scoring'

export default function Home() {
  const { brackets, results, tournament } = useData()

  return (
    <div>
      <h1>World Cup 2026 — Knockout Bracket Competition</h1>
      <p className="muted">
        Pick a winner for every knockout match (Round of 32 → Final). You earn
        more points the deeper a correctly-advanced team goes. Maximum score:
        80.
      </p>

      <div className="row" style={{ margin: '1rem 0' }}>
        <Link className="btn primary" to="/create">
          Create / edit a bracket
        </Link>
        <Link className="btn" to="/leaderboard">
          View leaderboard
        </Link>
      </div>

      <div className="panel">
        <h2>Brackets ({brackets.length})</h2>
        {brackets.length === 0 ? (
          <p className="muted">
            No brackets yet. Create one to get started.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th className="num">Points</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...brackets]
                .map((b) => ({
                  b,
                  total: scoreBracket(b, results, tournament).total,
                }))
                .sort(
                  (x, y) =>
                    y.total - x.total ||
                    x.b.username.localeCompare(y.b.username),
                )
                .map(({ b, total }) => (
                  <tr key={b.username}>
                    <td>{b.username}</td>
                    <td className="num">{total}</td>
                    <td className="num">
                      <Link to={`/bracket/${encodeURIComponent(b.username)}`}>
                        view
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import {
  isBracketComplete,
  participantsFor,
  sanitizePicks,
} from '../lib/tournament'
import type { Match } from '../types'
import TeamName from '../components/TeamName'

export default function CreateBracket() {
  const { username: routeUser } = useParams()
  const navigate = useNavigate()
  const { tournament, brackets, saveBracket } = useData()

  const existing = routeUser
    ? brackets.find(
        (b) => b.username.toLowerCase() === routeUser.toLowerCase(),
      )
    : undefined

  const [username, setUsername] = useState(existing?.username ?? routeUser ?? '')
  const [picks, setPicks] = useState<Record<number, string>>(
    existing ? { ...existing.picks } : {},
  )

  const matchesByRound = useMemo(() => {
    return tournament.rounds.map((r) => ({
      round: r,
      matches: tournament.matches.filter((m) => m.round === r.id),
    }))
  }, [tournament])

  const filled = sanitizePicks(picks, tournament)
  const filledCount = Object.keys(filled).length
  const complete = isBracketComplete(picks, tournament)
  const total = tournament.matches.length

  function pick(matchId: number, team: string) {
    setPicks((prev) => {
      const next = { ...prev }
      if (next[matchId] === team) delete next[matchId]
      else next[matchId] = team
      // Cascade: clear downstream picks that depended on the changed slot.
      return sanitizePicks(next, tournament)
    })
  }

  function handleSave() {
    const name = username.trim()
    if (!name) return
    saveBracket({ username: name, picks: filled })
    navigate(`/bracket/${encodeURIComponent(name)}`)
  }

  return (
    <div>
      <h1>{existing ? `Edit bracket — ${existing.username}` : 'Create a bracket'}</h1>
      <p className="muted">
        Click a team to advance it. Changing an earlier pick clears any later
        picks that depended on it.
      </p>

      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <label className="row">
          <span>Username:</span>
          <input
            type="text"
            value={username}
            placeholder="e.g. alex"
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <div className="row">
          <span className="muted">
            {filledCount} / {total} picks {complete ? '✓ complete' : ''}
          </span>
          <button
            className="primary"
            disabled={!username.trim()}
            onClick={handleSave}
          >
            Save bracket
          </button>
        </div>
      </div>

      <div className="rounds">
        {matchesByRound.map(({ round, matches }) => (
          <section className="round-col" key={round.id}>
            <h3>
              {round.name}{' '}
              <span className="pts">({round.points} pt each)</span>
            </h3>
            {matches.map((m) => (
              <EditableMatch
                key={m.id}
                match={m}
                picks={filled}
                onPick={pick}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

function EditableMatch({
  match,
  picks,
  onPick,
}: {
  match: Match
  picks: Record<number, string>
  onPick: (matchId: number, team: string) => void
}) {
  const [a, b] = participantsFor(match, picks)
  const chosen = picks[match.id]
  return (
    <div className="match">
      <div className="match__time">
        #{match.id} · {match.datetime}
      </div>
      <Slot
        team={a}
        feeder={match.feeders?.[0]}
        picked={chosen != null && chosen === a}
        onClick={() => a && onPick(match.id, a)}
      />
      <Slot
        team={b}
        feeder={match.feeders?.[1]}
        picked={chosen != null && chosen === b}
        onClick={() => b && onPick(match.id, b)}
      />
    </div>
  )
}

function Slot({
  team,
  feeder,
  picked,
  onClick,
}: {
  team: string | null
  feeder?: number
  picked: boolean
  onClick: () => void
}) {
  if (!team) {
    return (
      <div className="slot empty">
        {feeder ? `Winner of #${feeder}` : 'TBD'}
      </div>
    )
  }
  return (
    <button
      className={`slot selectable${picked ? ' picked' : ''}`}
      onClick={onClick}
    >
      <TeamName team={team} />
      {picked && <span className="badge win">advances</span>}
    </button>
  )
}

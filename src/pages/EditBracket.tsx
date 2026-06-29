import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  bracketOrder,
  isComplete,
  participants,
  pickCount,
  setPick,
} from '../bracket'
import { BracketBoard, shortTime } from '../components/BracketBoard'
import { abbrFor, flagFor } from '../flags'
import { useStore } from '../store'
import type { Match, RoundInfo, Tournament } from '../types'

export function EditBracket() {
  const { tournament, getBracket, saveBracket } = useStore()
  const navigate = useNavigate()
  const { username: usernameParam } = useParams()

  const [username, setUsername] = useState('')
  const [picks, setPicks] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState(false)

  // Load an existing bracket when arriving at /create/:username.
  useEffect(() => {
    if (usernameParam) {
      setUsername(usernameParam)
      setPicks(getBracket(usernameParam)?.picks ?? {})
    } else {
      setUsername('')
      setPicks({})
    }
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameParam])

  const t = tournament!
  const byRound = useMemo(() => bracketOrder(t), [t])
  const total = t.matches.length
  const done = pickCount(picks, t)
  const complete = isComplete(picks, t)

  function choose(match: Match, team: string) {
    setSaved(false)
    setPicks((prev) => setPick(prev, match.id, team, t))
  }

  function handleSave() {
    const name = username.trim()
    if (!name) {
      alert('Enter a username first.')
      return
    }
    const existing = getBracket(name)
    const editingSamePerson =
      usernameParam && usernameParam.toLowerCase() === name.toLowerCase()
    if (existing && !editingSamePerson) {
      const ok = confirm(
        `A bracket for "${existing.username}" already exists. Overwrite it?`,
      )
      if (!ok) return
    }
    saveBracket({ username: name, picks })
    setSaved(true)
  }

  return (
    <div className="bracket-page">
      <div className="bv-summary edit-head">
        <div className="bv-summary-main">
          <div className="bv-summary-title">
            {usernameParam ? `Edit bracket: ${usernameParam}` : 'Create bracket'}
          </div>
          <div className="bv-summary-sub muted">
            Pick a winner for each match. Picking a team feeds it into the next
            round; changing an earlier pick clears later picks that depended on it.
          </div>
          <div className="edit-controls">
            <label className="field">
              Username
              <input
                type="text"
                value={username}
                placeholder="e.g. alex"
                onChange={(e) => {
                  setUsername(e.target.value)
                  setSaved(false)
                }}
                disabled={!!usernameParam}
              />
            </label>
            <div className="progress">
              <strong>{done}</strong> / {total} picks
              {complete && <span className="badge ok"> complete</span>}
            </div>
            <button className="primary" onClick={handleSave}>
              Save bracket
            </button>
            {saved && (
              <span className="saved-msg">
                Saved.{' '}
                <a onClick={() => navigate(`/view/${encodeURIComponent(username.trim())}`)}>
                  View it →
                </a>
              </span>
            )}
          </div>
        </div>
      </div>

      <BracketBoard
        t={t}
        byRound={byRound}
        connectorState={() => 'neutral'}
        measureDeps={[picks]}
        renderCard={(match, round, cardRef) => (
          <EditCard
            key={match.id}
            cardRef={cardRef}
            match={match}
            round={round}
            picks={picks}
            onChoose={choose}
          />
        )}
        championCard={<EditChampion t={t} picks={picks} />}
      />
    </div>
  )
}

interface EditCardProps {
  match: Match
  round: RoundInfo
  picks: Record<number, string>
  onChoose: (m: Match, team: string) => void
  cardRef: (el: HTMLElement | null) => void
}

function EditCard({ match, round, picks, onChoose, cardRef }: EditCardProps) {
  // The two teams the player can advance from this match (their own topology).
  const [a, b] = participants(match, picks)
  const pick = picks[match.id]
  const over =
    pick && round.id !== 'R32' ? (a === pick ? b : a) : null

  return (
    <div
      className={`bcard edit${pick ? ' is-chosen' : ''}`}
      data-match={match.id}
      ref={cardRef}
    >
      <div className="bcard-main">
        <div className="bcard-label">{pick ? 'Your pick' : 'Pick a winner'}</div>
        <EditSlot match={match} team={a} selected={pick === a} onChoose={onChoose} />
        <EditSlot match={match} team={b} selected={pick === b} onChoose={onChoose} />
        <div className="bcard-foot">
          <span className="muted">{shortTime(match.datetime)}</span>
        </div>
      </div>
      <div className="bcard-pick">
        <div className="pick-flag-wrap">
          <span className="pick-flag-tile">
            <span className="pick-flag">{pick ? flagFor(pick) : '—'}</span>
          </span>
        </div>
        <div className="pick-my muted">My Pick:</div>
        <div className="pick-abbr">{pick ? abbrFor(pick) : '—'}</div>
        {over && <div className="pick-over muted">(over {abbrFor(over)})</div>}
      </div>
    </div>
  )
}

function EditSlot({
  match,
  team,
  selected,
  onChoose,
}: {
  match: Match
  team: string | null
  selected: boolean
  onChoose: (m: Match, team: string) => void
}) {
  if (!team) {
    return (
      <div className="team-slot placeholder">
        <span className="slot-shield" />
        <span className="slot-bar" />
      </div>
    )
  }
  return (
    <button
      className={`team-slot edit-slot${selected ? ' chosen' : ''}`}
      onClick={() => onChoose(match, team)}
      aria-pressed={selected}
    >
      <span className="slot-flag">{flagFor(team)}</span>
      <span className="slot-name">{team}</span>
      {selected && <span className="slot-win">✓</span>}
    </button>
  )
}

function EditChampion({ t, picks }: { t: Tournament; picks: Record<number, string> }) {
  const finalMatch = t.matches.find((m) => m.round === 'F')
  const champ = finalMatch ? picks[finalMatch.id] : undefined
  return (
    <div className="champ-card is-locked">
      <div className="champ-title">YOUR CHAMPIONSHIP PICK</div>
      <div className="champ-name">{champ ?? 'No pick yet'}</div>
      <div className="champ-flag">{champ ? flagFor(champ) : '🏆'}</div>
    </div>
  )
}

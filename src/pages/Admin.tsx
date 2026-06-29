import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  bracketOrder,
  isComplete,
  isEnterable,
  participants,
  pickCount,
} from '../bracket'
import { BracketBoard, shortTime } from '../components/BracketBoard'
import { abbrFor, flagFor } from '../flags'
import { useStore } from '../store'
import { downloadJson, readJsonFile } from '../util/download'
import type { Brackets, Match, Results } from '../types'

// Casual client-side gate to prevent accidental edits on the public site.
// NOTE: this is NOT real security. The "password" ships in the static bundle
// and anyone can bypass it. It doesn't matter: editing the live site only
// changes the visitor's own localStorage. Published data only ever updates
// when the admin exports JSON and commits it to the repo.
const ADMIN_PASSWORD = 'goalpost'
const UNLOCK_KEY = 'wc2026.admin.unlocked'

export function Admin() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(UNLOCK_KEY) === '1',
  )
  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />
  return <AdminPanel />
}

function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [bad, setBad] = useState(false)
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (value === ADMIN_PASSWORD) {
      sessionStorage.setItem(UNLOCK_KEY, '1')
      onUnlock()
    } else {
      setBad(true)
    }
  }
  return (
    <div className="gate">
      <h1>Admin</h1>
      <p className="muted">
        Casual gate to avoid accidental edits. This is <em>not</em> security —
        editing this site only changes your own browser; published standings
        update only when the admin commits exported JSON to the repo.
      </p>
      <form onSubmit={submit} className="toolbar">
        <label className="field">
          Password
          <input
            type="password"
            value={value}
            autoFocus
            onChange={(e) => {
              setValue(e.target.value)
              setBad(false)
            }}
          />
        </label>
        <button className="primary" type="submit">
          Unlock
        </button>
        {bad && <span className="saved-msg error-text">Wrong password.</span>}
      </form>
      <p className="muted small">Hint for this demo build: “{ADMIN_PASSWORD}”.</p>
    </div>
  )
}

function AdminPanel() {
  const {
    tournament,
    brackets,
    results,
    setWinner,
    clearWinner,
    deleteBracket,
    importBrackets,
    importResults,
    resetToPublished,
  } = useStore()
  const t = tournament!
  const bracketsInput = useRef<HTMLInputElement>(null)
  const resultsInput = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function onImportBrackets(file: File | undefined) {
    if (!file) return
    try {
      const data = await readJsonFile<Brackets>(file)
      if (!Array.isArray(data)) throw new Error('Expected an array of brackets.')
      importBrackets(data)
      setMsg(`Imported ${data.length} bracket(s).`)
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`)
    }
  }

  async function onImportResults(file: File | undefined) {
    if (!file) return
    try {
      const data = await readJsonFile<Results>(file)
      if (!data || typeof data.winners !== 'object')
        throw new Error('Expected { "winners": { ... } }.')
      importResults(data)
      setMsg(`Imported results (${Object.keys(data.winners).length} decided).`)
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Admin</h1>
        <p className="muted">
          Enter results, manage brackets, and import/export JSON. The admin is
          the source of truth: re-enter each person’s screenshot picks, enter
          results as matches finish, then export and commit the JSON.
        </p>
      </div>

      <section className="admin-section">
        <h2>Import / Export</h2>
        <div className="toolbar wrap">
          <button
            onClick={() => downloadJson('brackets.json', brackets)}
            className="primary"
          >
            Export brackets.json
          </button>
          <button
            onClick={() => downloadJson('results.json', results)}
            className="primary"
          >
            Export results.json
          </button>
          <button onClick={() => bracketsInput.current?.click()}>
            Import brackets.json
          </button>
          <input
            ref={bracketsInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              onImportBrackets(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button onClick={() => resultsInput.current?.click()}>
            Import results.json
          </button>
          <input
            ref={resultsInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              onImportResults(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button
            className="danger-link"
            onClick={async () => {
              if (
                confirm(
                  'Discard all local edits and reload the committed JSON from the repo?',
                )
              ) {
                await resetToPublished()
                setMsg('Reset to published data.')
              }
            }}
          >
            Reset to published
          </button>
        </div>
        {msg && <p className="saved-msg">{msg}</p>}
        <p className="muted small">
          To publish: export both files, drop them into{' '}
          <code>public/data/</code>, commit, and push.
        </p>
      </section>

      <section className="admin-results">
        <h2>Enter results</h2>
        <p className="muted small">
          Click the winner of each match. A match unlocks once both real
          participants are known (derived from earlier winners). Changing an
          earlier result clears any now-impossible later results.
        </p>
        <BracketBoard
          t={t}
          byRound={bracketOrder(t)}
          connectorState={(f) =>
            results.winners[f] !== undefined ? 'correct' : 'neutral'
          }
          measureDeps={[results.winners]}
          renderCard={(match, _round, cardRef) => (
            <AdminResultCard
              key={match.id}
              cardRef={cardRef}
              match={match}
              winners={results.winners}
              onSet={setWinner}
              onClear={clearWinner}
            />
          )}
        />
      </section>

      <section className="admin-section">
        <h2>Manage brackets</h2>
        {brackets.length === 0 ? (
          <p className="muted">
            No brackets yet. <Link to="/create">Create one</Link>.
          </p>
        ) : (
          <table className="brackets-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Picks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...brackets]
                .sort((a, b) => a.username.localeCompare(b.username))
                .map((b) => (
                  <tr key={b.username}>
                    <td>{b.username}</td>
                    <td>
                      {pickCount(b.picks, t)}/{t.matches.length}
                      {isComplete(b.picks, t) ? (
                        <span className="badge ok"> complete</span>
                      ) : (
                        <span className="badge warn"> partial</span>
                      )}
                    </td>
                    <td className="actions">
                      <Link to={`/view/${encodeURIComponent(b.username)}`}>View</Link>
                      <Link to={`/create/${encodeURIComponent(b.username)}`}>Edit</Link>
                      <button
                        className="danger-link"
                        onClick={() => {
                          if (confirm(`Delete ${b.username}'s bracket?`))
                            deleteBracket(b.username)
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function AdminResultCard({
  match,
  winners,
  onSet,
  onClear,
  cardRef,
}: {
  match: Match
  winners: Record<number, string>
  onSet: (matchId: number, team: string) => void
  onClear: (matchId: number) => void
  cardRef: (el: HTMLElement | null) => void
}) {
  const [a, b] = participants(match, winners)
  const enterable = isEnterable(match, winners)
  const winner = winners[match.id]
  const decided = winner !== undefined
  const label = decided ? 'Final' : enterable ? 'Enter result' : 'Awaiting teams'

  return (
    <div
      className={`bcard admin ${decided ? 'is-correct' : 'is-locked'}`}
      data-match={match.id}
      ref={cardRef}
    >
      <div className="bcard-main">
        <div className="bcard-label">{label}</div>
        <AdminSlot
          match={match}
          team={a}
          selected={winner === a}
          enterable={enterable}
          onSet={onSet}
        />
        <AdminSlot
          match={match}
          team={b}
          selected={winner === b}
          enterable={enterable}
          onSet={onSet}
        />
        <div className="bcard-foot">
          <span className="muted">{shortTime(match.datetime)}</span>
        </div>
      </div>
      <div className="bcard-pick">
        <div className="pick-flag-wrap">
          <span className="pick-flag-tile">
            <span className="pick-flag">{winner ? flagFor(winner) : '—'}</span>
          </span>
          {decided && <span className="pick-badge is-correct">✓</span>}
          {!decided && !enterable && <span className="pick-badge is-locked">🔒</span>}
        </div>
        <div className="pick-my muted">{decided ? 'Winner' : 'Result'}</div>
        <div className="pick-abbr">{winner ? abbrFor(winner) : '—'}</div>
        {decided && (
          <button className="danger-link admin-clear" onClick={() => onClear(match.id)}>
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

function AdminSlot({
  match,
  team,
  selected,
  enterable,
  onSet,
}: {
  match: Match
  team: string | null
  selected: boolean
  enterable: boolean
  onSet: (matchId: number, team: string) => void
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
      className={`team-slot edit-slot${selected ? ' won' : ''}`}
      disabled={!enterable}
      onClick={() => onSet(match.id, team)}
      aria-pressed={selected}
    >
      <span className="slot-flag">{flagFor(team)}</span>
      <span className="slot-name">{team}</span>
      {selected && <span className="slot-win">✓</span>}
    </button>
  )
}

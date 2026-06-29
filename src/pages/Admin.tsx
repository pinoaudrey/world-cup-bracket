import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { participantsFor } from '../lib/tournament'
import type { Brackets, Match, Results } from '../types'
import TeamName from '../components/TeamName'

// NOTE: This is NOT real security. The gate only prevents accidental edits on
// the public site. Anyone can bypass it, but doing so only changes their own
// local (browser) state — it cannot affect published data, which updates only
// when the admin commits the exported JSON files to the repo.
const ADMIN_PASSWORD = 'worldcup2026'
const SS_KEY = 'wc2026.admin'

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Admin() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(SS_KEY) === '1',
  )
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  if (!authed) {
    return (
      <div>
        <h1>Admin</h1>
        <p className="muted">
          Enter the admin password to edit results and brackets. (This gate is
          for convenience only — not real security.)
        </p>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            if (pw === ADMIN_PASSWORD) {
              sessionStorage.setItem(SS_KEY, '1')
              setAuthed(true)
            } else {
              setErr('Incorrect password.')
            }
          }}
        >
          <input
            type="password"
            value={pw}
            placeholder="password"
            onChange={(e) => setPw(e.target.value)}
          />
          <button className="primary" type="submit">
            Unlock
          </button>
        </form>
        {err && <p style={{ color: '#ff8a7a' }}>{err}</p>}
      </div>
    )
  }

  return <AdminPanel />
}

function AdminPanel() {
  const {
    tournament,
    brackets,
    results,
    setResult,
    deleteBracket,
    replaceBrackets,
    replaceResults,
    resetToPublished,
  } = useData()

  const [msg, setMsg] = useState('')

  return (
    <div>
      <h1>Admin</h1>

      <ImportExport
        brackets={brackets}
        results={results}
        onImportBrackets={replaceBrackets}
        onImportResults={replaceResults}
        onReset={resetToPublished}
        setMsg={setMsg}
      />
      {msg && (
        <p className="muted" role="status">
          {msg}
        </p>
      )}

      <section className="panel">
        <h2>Enter results</h2>
        <p className="muted">
          Click the actual winner. A match is enterable once both real
          participants are known. Clearing or changing a result clears any
          dependent later results.
        </p>
        <div className="rounds">
          {tournament.rounds.map((round) => (
            <section className="round-col" key={round.id}>
              <h3>{round.name}</h3>
              {tournament.matches
                .filter((m) => m.round === round.id)
                .map((m) => (
                  <ResultMatch
                    key={m.id}
                    match={m}
                    winners={results.winners}
                    onSet={setResult}
                  />
                ))}
            </section>
          ))}
        </div>
      </section>

      <ManageBrackets brackets={brackets} onDelete={deleteBracket} />
    </div>
  )
}

function ResultMatch({
  match,
  winners,
  onSet,
}: {
  match: Match
  winners: Record<number, string>
  onSet: (matchId: number, winner: string | null) => void
}) {
  const [a, b] = participantsFor(match, winners)
  const winner = winners[match.id]
  const ready = a != null && b != null

  return (
    <div className="match">
      <div className="match__time">
        #{match.id} · {match.datetime}
      </div>
      {!ready ? (
        <div className="slot empty">awaiting participants</div>
      ) : (
        [a, b].map((team) => (
          <button
            key={team}
            className={`slot selectable${winner === team ? ' picked' : ''}`}
            onClick={() => onSet(match.id, winner === team ? null : team!)}
          >
            <TeamName team={team!} />
            {winner === team && <span className="badge win">winner</span>}
          </button>
        ))
      )}
    </div>
  )
}

function ManageBrackets({
  brackets,
  onDelete,
}: {
  brackets: Brackets
  onDelete: (username: string) => void
}) {
  return (
    <section className="panel">
      <h2>Manage brackets ({brackets.length})</h2>
      {brackets.length === 0 ? (
        <p className="muted">No brackets saved.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th className="num">Picks</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {brackets.map((bk) => (
              <tr key={bk.username}>
                <td>{bk.username}</td>
                <td className="num">{Object.keys(bk.picks).length} / 31</td>
                <td className="num">
                  <Link to={`/bracket/${encodeURIComponent(bk.username)}`}>
                    view
                  </Link>{' '}
                  ·{' '}
                  <Link to={`/create/${encodeURIComponent(bk.username)}`}>
                    edit
                  </Link>{' '}
                  ·{' '}
                  <button
                    className="danger"
                    style={{ padding: '0.1rem 0.5rem' }}
                    onClick={() => {
                      if (confirm(`Delete bracket for ${bk.username}?`))
                        onDelete(bk.username)
                    }}
                  >
                    delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function ImportExport({
  brackets,
  results,
  onImportBrackets,
  onImportResults,
  onReset,
  setMsg,
}: {
  brackets: Brackets
  results: Results
  onImportBrackets: (b: Brackets) => void
  onImportResults: (r: Results) => void
  onReset: () => void
  setMsg: (m: string) => void
}) {
  const bracketsInput = useRef<HTMLInputElement>(null)
  const resultsInput = useRef<HTMLInputElement>(null)

  async function importFile(
    file: File,
    kind: 'brackets' | 'results',
  ) {
    try {
      const parsed = JSON.parse(await file.text())
      if (kind === 'brackets') {
        if (!Array.isArray(parsed)) throw new Error('expected an array')
        onImportBrackets(parsed as Brackets)
      } else {
        if (!parsed || typeof parsed.winners !== 'object')
          throw new Error('expected { winners: {...} }')
        onImportResults(parsed as Results)
      }
      setMsg(`Imported ${kind}.json successfully.`)
    } catch (e) {
      setMsg(
        `Failed to import ${kind}.json: ${
          e instanceof Error ? e.message : String(e)
        }`,
      )
    }
  }

  return (
    <section className="panel">
      <h2>Import / Export JSON</h2>
      <p className="muted">
        Export the updated files and commit them to{' '}
        <code>public/data/</code> to publish updates for everyone.
      </p>
      <div className="row">
        <button onClick={() => download('brackets.json', brackets)}>
          Export brackets.json
        </button>
        <button onClick={() => download('results.json', results)}>
          Export results.json
        </button>
        <button onClick={() => bracketsInput.current?.click()}>
          Import brackets.json
        </button>
        <button onClick={() => resultsInput.current?.click()}>
          Import results.json
        </button>
        <button className="danger" onClick={onReset}>
          Discard local edits (reload published)
        </button>
      </div>
      <input
        ref={bracketsInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importFile(f, 'brackets')
          e.target.value = ''
        }}
      />
      <input
        ref={resultsInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importFile(f, 'results')
          e.target.value = ''
        }}
      />
    </section>
  )
}

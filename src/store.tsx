import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { pruneInvalid } from './bracket'
import type { Bracket, Brackets, Results, Tournament } from './types'

const BRACKETS_KEY = 'wc2026.brackets'
const RESULTS_KEY = 'wc2026.results'

/**
 * Persistence model (static hosting, no backend):
 *  - tournament.json is fixed structure, always loaded from the committed file.
 *  - brackets.json / results.json are the *published baseline*, fetched on load.
 *  - Local edits are mirrored to localStorage so a refresh doesn't lose work,
 *    and that working copy takes precedence over the fetched baseline.
 *  - The admin EXPORTS the working copy as JSON and commits it to the repo;
 *    that commit is what publishes new data to everyone. Nothing here writes
 *    to the server — editing the live site only changes your own browser.
 */
interface StoreValue {
  tournament: Tournament | null
  brackets: Brackets
  results: Results
  loading: boolean
  error: string | null
  /** Add or replace a bracket (matched by username, case-insensitive). */
  saveBracket: (bracket: Bracket) => void
  deleteBracket: (username: string) => void
  getBracket: (username: string) => Bracket | undefined
  setWinner: (matchId: number, team: string) => void
  clearWinner: (matchId: number) => void
  /** Lock/unlock pick visibility (hides picks from non-admins while locked). */
  setLocked: (locked: boolean) => void
  importBrackets: (brackets: Brackets) => void
  importResults: (results: Results) => void
  /** Discard local edits and reload the committed (published) JSON. */
  resetToPublished: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

function dataUrl(file: string): string {
  return `${import.meta.env.BASE_URL}data/${file}`
}

async function fetchJson<T>(file: string): Promise<T> {
  const res = await fetch(dataUrl(file))
  if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`)
  return (await res.json()) as T
}

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full / unavailable — non-fatal, edits just won't persist */
  }
}

// Dev only: persist a data file to disk via the Vite dev middleware so the
// admin can edit on localhost and just `git push`. Debounced per file; a no-op
// in the production build (import.meta.env.DEV is false there).
const devSaveTimers: Record<string, ReturnType<typeof setTimeout>> = {}
function devSaveFile(key: 'brackets' | 'results', data: unknown): void {
  if (!import.meta.env.DEV) return
  clearTimeout(devSaveTimers[key])
  devSaveTimers[key] = setTimeout(() => {
    void fetch(`/__save/${key}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    }).catch(() => {
      /* dev convenience only — ignore failures */
    })
  }, 400)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [brackets, setBrackets] = useState<Brackets>([])
  const [results, setResults] = useState<Results>({ winners: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const t = await fetchJson<Tournament>('tournament.json')
        const baselineBrackets = await fetchJson<Brackets>('brackets.json')
        const baselineResults = await fetchJson<Results>('results.json')
        if (cancelled) return
        setTournament(t)
        // Local working copy wins over the published baseline if present.
        setBrackets(readLocal<Brackets>(BRACKETS_KEY) ?? baselineBrackets)
        setResults(readLocal<Results>(RESULTS_KEY) ?? baselineResults)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Mirror changes to localStorage and (in dev) to the JSON files on disk.
  // The hydration refs skip the first run right after load so we don't rewrite
  // the files with the data we just read from them.
  const bracketsHydrated = useRef(false)
  const resultsHydrated = useRef(false)
  useEffect(() => {
    if (loading) return
    writeLocal(BRACKETS_KEY, brackets)
    if (bracketsHydrated.current) devSaveFile('brackets', brackets)
    else bracketsHydrated.current = true
  }, [brackets, loading])
  useEffect(() => {
    if (loading) return
    writeLocal(RESULTS_KEY, results)
    if (resultsHydrated.current) devSaveFile('results', results)
    else resultsHydrated.current = true
  }, [results, loading])

  const saveBracket = useCallback((bracket: Bracket) => {
    setBrackets((prev) => {
      const i = prev.findIndex(
        (b) => b.username.toLowerCase() === bracket.username.toLowerCase(),
      )
      if (i === -1) return [...prev, bracket]
      const next = [...prev]
      next[i] = bracket
      return next
    })
  }, [])

  const deleteBracket = useCallback((username: string) => {
    setBrackets((prev) =>
      prev.filter(
        (b) => b.username.toLowerCase() !== username.toLowerCase(),
      ),
    )
  }, [])

  const getBracket = useCallback(
    (username: string) =>
      brackets.find(
        (b) => b.username.toLowerCase() === username.toLowerCase(),
      ),
    [brackets],
  )

  const setWinner = useCallback(
    (matchId: number, team: string) => {
      setResults((prev) => {
        if (!tournament) return prev
        // Changing a result can make a later real matchup impossible (the
        // advancing team feeding it changed). pruneInvalid drops any
        // downstream winner that's no longer a valid real participant.
        return {
          ...prev,
          winners: pruneInvalid({ ...prev.winners, [matchId]: team }, tournament),
        }
      })
    },
    [tournament],
  )

  const clearWinner = useCallback(
    (matchId: number) => {
      setResults((prev) => {
        const next = { ...prev.winners }
        delete next[matchId]
        // Clearing a result orphans downstream matchups too.
        return { ...prev, winners: tournament ? pruneInvalid(next, tournament) : next }
      })
    },
    [tournament],
  )

  const setLocked = useCallback((locked: boolean) => {
    setResults((prev) => ({ ...prev, locked }))
  }, [])

  const importBrackets = useCallback(
    (incoming: Brackets) => {
      // Re-validate picks against the tournament topology on import so a
      // hand-edited or stale file can't introduce impossible picks.
      const cleaned = tournament
        ? incoming.map((b) => ({
            ...b,
            picks: pruneInvalid(b.picks, tournament),
          }))
        : incoming
      setBrackets(cleaned)
    },
    [tournament],
  )

  const importResults = useCallback((incoming: Results) => {
    setResults(incoming)
  }, [])

  const resetToPublished = useCallback(async () => {
    localStorage.removeItem(BRACKETS_KEY)
    localStorage.removeItem(RESULTS_KEY)
    const [b, r] = await Promise.all([
      fetchJson<Brackets>('brackets.json'),
      fetchJson<Results>('results.json'),
    ])
    setBrackets(b)
    setResults(r)
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      tournament,
      brackets,
      results,
      loading,
      error,
      saveBracket,
      deleteBracket,
      getBracket,
      setWinner,
      clearWinner,
      setLocked,
      importBrackets,
      importResults,
      resetToPublished,
    }),
    [
      tournament,
      brackets,
      results,
      loading,
      error,
      saveBracket,
      deleteBracket,
      getBracket,
      setWinner,
      clearWinner,
      setLocked,
      importBrackets,
      importResults,
      resetToPublished,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}

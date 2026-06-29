import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Bracket, Brackets, Results, Tournament } from '../types'
import { sanitizePicks } from '../lib/tournament'

const LS_BRACKETS = 'wc2026.brackets'
const LS_RESULTS = 'wc2026.results'

const BASE = import.meta.env.BASE_URL

interface DataState {
  tournament: Tournament
  brackets: Brackets
  results: Results
  loading: boolean
  error: string | null
  /** Add or update a bracket (matched by username, case-insensitive). */
  saveBracket: (bracket: Bracket) => void
  deleteBracket: (username: string) => void
  /** Set or clear (null) the actual winner of a match. */
  setResult: (matchId: number, winner: string | null) => void
  replaceBrackets: (brackets: Brackets) => void
  replaceResults: (results: Results) => void
  /** Discard local edits and reload the published JSON files. */
  resetToPublished: () => void
}

const DataContext = createContext<DataState | null>(null)

function loadLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`)
  return (await res.json()) as T
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [brackets, setBrackets] = useState<Brackets>([])
  const [results, setResults] = useState<Results>({ winners: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const t = await fetchJson<Tournament>('data/tournament.json')
        // Prefer in-progress local edits; otherwise the published files.
        const localBrackets = loadLocal<Brackets>(LS_BRACKETS)
        const localResults = loadLocal<Results>(LS_RESULTS)
        const b =
          localBrackets ?? (await fetchJson<Brackets>('data/brackets.json'))
        const r =
          localResults ?? (await fetchJson<Results>('data/results.json'))
        if (cancelled) return
        setTournament(t)
        setBrackets(b)
        setResults(r)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Mirror edits to localStorage so a refresh doesn't lose work.
  useEffect(() => {
    if (!loading) localStorage.setItem(LS_BRACKETS, JSON.stringify(brackets))
  }, [brackets, loading])
  useEffect(() => {
    if (!loading) localStorage.setItem(LS_RESULTS, JSON.stringify(results))
  }, [results, loading])

  const saveBracket = useCallback(
    (bracket: Bracket) => {
      setBrackets((prev) => {
        const clean: Bracket = tournament
          ? { ...bracket, picks: sanitizePicks(bracket.picks, tournament) }
          : bracket
        const idx = prev.findIndex(
          (b) => b.username.toLowerCase() === clean.username.toLowerCase(),
        )
        if (idx === -1) return [...prev, clean]
        const copy = [...prev]
        copy[idx] = clean
        return copy
      })
    },
    [tournament],
  )

  const deleteBracket = useCallback((username: string) => {
    setBrackets((prev) =>
      prev.filter(
        (b) => b.username.toLowerCase() !== username.toLowerCase(),
      ),
    )
  }, [])

  const setResult = useCallback(
    (matchId: number, winner: string | null) => {
      setResults((prev) => {
        const winners = { ...prev.winners }
        if (winner == null) delete winners[matchId]
        else winners[matchId] = winner
        // Changing a real result cascades: downstream matches whose
        // participants no longer include their recorded winner are cleared.
        return {
          winners: tournament ? sanitizePicks(winners, tournament) : winners,
        }
      })
    },
    [tournament],
  )

  const replaceBrackets = useCallback((next: Brackets) => setBrackets(next), [])
  const replaceResults = useCallback(
    (next: Results) =>
      setResults(
        tournament
          ? { winners: sanitizePicks(next.winners, tournament) }
          : next,
      ),
    [tournament],
  )

  const resetToPublished = useCallback(() => {
    localStorage.removeItem(LS_BRACKETS)
    localStorage.removeItem(LS_RESULTS)
    setLoading(true)
    Promise.all([
      fetchJson<Brackets>('data/brackets.json'),
      fetchJson<Results>('data/results.json'),
    ])
      .then(([b, r]) => {
        setBrackets(b)
        setResults(r)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<DataState | null>(() => {
    if (!tournament) return null
    return {
      tournament,
      brackets,
      results,
      loading,
      error,
      saveBracket,
      deleteBracket,
      setResult,
      replaceBrackets,
      replaceResults,
      resetToPublished,
    }
  }, [
    tournament,
    brackets,
    results,
    loading,
    error,
    saveBracket,
    deleteBracket,
    setResult,
    replaceBrackets,
    replaceResults,
    resetToPublished,
  ])

  if (loading && !tournament) {
    return <div className="status">Loading tournament…</div>
  }
  if (error && !tournament) {
    return <div className="status status--error">Error: {error}</div>
  }
  if (!value) return null

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataState {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

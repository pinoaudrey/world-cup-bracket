import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Match, Round, RoundInfo, Tournament } from '../types'

// Display date ranges per round (the tournament file stores per-match times).
export const ROUND_DATES: Record<Round, string> = {
  R32: 'June 28 – July 3',
  R16: 'July 4 – 7',
  QF: 'July 9 – 11',
  SF: 'July 14 – 15',
  F: 'July 19',
}

/** "Mon Jun 29, 1:30 PM PT" -> "Jun 29, 1:30 PM" */
export function shortTime(dt: string): string {
  return dt.replace(/^[A-Za-z]{3}\s+/, '').replace(/\s*PT$/, '')
}

export type ConnectorState = 'correct' | 'wrong' | 'neutral'

interface Segment {
  key: string
  d: string
  state: ConnectorState
}

interface BracketBoardProps {
  t: Tournament
  byRound: Record<Round, Match[]>
  /** Render one match card; attach `cardRef` to the card root for connector measurement. */
  renderCard: (
    match: Match,
    round: RoundInfo,
    cardRef: (el: HTMLElement | null) => void,
  ) => ReactNode
  /** Color of the connector leaving a given feeder match. */
  connectorState: (feederMatchId: number) => ConnectorState
  /** Values that, when changed, should retrigger connector measurement. */
  measureDeps: unknown[]
  /** Optional championship showcase shown in a trailing column. */
  championCard?: ReactNode
}

/**
 * The shared bracket board: round columns with point bands, a championship
 * column, and SVG connector lines from each match's two feeders into the
 * match. Lines are measured from the laid-out DOM (exact at any width,
 * recomputed on resize and when `measureDeps` change). Both the read-only
 * View and the interactive Edit page render their own cards into this layout.
 */
export function BracketBoard({
  t,
  byRound,
  renderCard,
  connectorState,
  measureDeps,
  championCard,
}: BracketBoardProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<number, HTMLElement>())
  const [segments, setSegments] = useState<Segment[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  // The coloring function changes identity every render; read it through a ref
  // so it isn't a measure() dependency (which would cause a re-measure loop).
  const stateFnRef = useRef(connectorState)
  stateFnRef.current = connectorState

  const setCardRef = useCallback(
    (id: number) => (el: HTMLElement | null) => {
      if (el) cardRefs.current.set(id, el)
      else cardRefs.current.delete(id)
    },
    [],
  )

  const measure = useCallback(() => {
    const content = contentRef.current
    if (!content) return
    const base = content.getBoundingClientRect()
    const segs: Segment[] = []
    for (const m of t.matches) {
      if (!m.feeders) continue
      const toEl = cardRefs.current.get(m.id)
      if (!toEl) continue
      const toR = toEl.getBoundingClientRect()
      const toX = toR.left - base.left
      const toY = toR.top - base.top + toR.height / 2
      for (const f of m.feeders) {
        const fromEl = cardRefs.current.get(f)
        if (!fromEl) continue
        const fr = fromEl.getBoundingClientRect()
        const fromX = fr.right - base.left
        const fromY = fr.top - base.top + fr.height / 2
        const midX = fromX + Math.max(14, (toX - fromX) / 2)
        segs.push({
          key: `${f}-${m.id}`,
          d: `M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`,
          state: stateFnRef.current(f),
        })
      }
    }
    setSegments(segs)
    setSize({ w: content.scrollWidth, h: content.scrollHeight })
    // measureDeps is intentionally spread into the dependency list.
  }, [t, ...measureDeps]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    measure()
    const raf = requestAnimationFrame(measure)
    const ro = new ResizeObserver(measure)
    if (contentRef.current) ro.observe(contentRef.current)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  return (
    <div className="bracket-scroll">
      <div className="bracket-grid" ref={contentRef}>
        <svg
          className="bracket-lines"
          width={size.w || '100%'}
          height={size.h || '100%'}
          aria-hidden="true"
        >
          {segments.map((s) => (
            <path key={s.key} d={s.d} className={`bline ${s.state}`} fill="none" />
          ))}
        </svg>

        {t.rounds.map((round) => (
          <div className="bracket-col" key={round.id}>
            <div className="round-band">
              <div className="round-band-name">{round.name}</div>
              <div className="round-band-dates">{ROUND_DATES[round.id]}</div>
              <div className="round-band-pts">
                {round.points} pt{round.points > 1 ? 's' : ''} each
              </div>
            </div>
            <div className="round-matches">
              {byRound[round.id].map((match) =>
                renderCard(match, round, setCardRef(match.id)),
              )}
            </div>
          </div>
        ))}

        {championCard && (
          <div className="bracket-col champ-col">
            <div className="round-band">
              <div className="round-band-name">Champion</div>
              <div className="round-band-dates">July 19</div>
              <div className="round-band-pts">&nbsp;</div>
            </div>
            <div className="round-matches">{championCard}</div>
          </div>
        )}
      </div>
    </div>
  )
}

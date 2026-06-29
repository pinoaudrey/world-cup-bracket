import { Badge, Box, Group, Paper, Stack, Text } from '@mantine/core'
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { flagFor } from '../flags'
import type { Match, Round, RoundInfo, Tournament } from '../types'
import cls from './BracketBoard.module.css'

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

const borderColor = (s: ConnectorState) =>
  s === 'correct'
    ? 'var(--mantine-color-green-6)'
    : s === 'wrong'
      ? 'var(--mantine-color-red-6)'
      : 'var(--mantine-color-gray-3)'

// ---------------------------------------------------------------------------
// Shared card pieces (used by View / Edit / Admin)
// ---------------------------------------------------------------------------

export function PickBadge({ kind }: { kind: 'correct' | 'wrong' | 'locked' }) {
  const bg =
    kind === 'correct'
      ? 'var(--mantine-color-green-6)'
      : kind === 'wrong'
        ? 'var(--mantine-color-red-6)'
        : 'var(--mantine-color-blue-6)'
  const sym = kind === 'correct' ? '✓' : kind === 'wrong' ? '✕' : '🔒'
  return (
    <span className={cls.badge} style={{ background: bg, fontSize: kind === 'locked' ? 9 : 11 }}>
      {sym}
    </span>
  )
}

export function FlagTile({ team, badge }: { team?: string; badge?: ReactNode }) {
  return (
    <div className={cls.flagTile}>
      <span className={cls.flagTileInner}>
        <span className={cls.flag}>{team ? flagFor(team) : '—'}</span>
      </span>
      {badge}
    </div>
  )
}

export function PlaceholderSlot() {
  return (
    <div className={`${cls.slot} ${cls.slotPlaceholder}`}>
      <span className={cls.shield} />
      <span className={cls.bar} />
    </div>
  )
}

/** Read-only team slot (View). */
export function DisplaySlot({ team, winner }: { team: string | null; winner?: boolean }) {
  if (!team) return <PlaceholderSlot />
  return (
    <div className={winner ? `${cls.slot} ${cls.slotWinner}` : cls.slot}>
      <span style={{ fontSize: 17 }}>{flagFor(team)}</span>
      <span className={cls.slotName}>{team}</span>
      {winner && (
        <span className={cls.slotWin} style={{ color: 'var(--mantine-color-blue-6)' }}>
          ◄
        </span>
      )}
    </div>
  )
}

/** Clickable team slot (Edit / Admin). */
export function ClickSlot({
  team,
  selected,
  variant = 'chosen',
  disabled,
  mark = '✓',
  onSelect,
}: {
  team: string | null
  selected: boolean
  variant?: 'chosen' | 'won'
  disabled?: boolean
  mark?: string
  onSelect: () => void
}) {
  if (!team) return <PlaceholderSlot />
  const sel = selected ? (variant === 'won' ? cls.won : cls.chosen) : ''
  const markColor =
    variant === 'won' ? 'var(--mantine-color-green-7)' : 'var(--mantine-color-blue-6)'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={`${cls.slot} ${cls.clickSlot} ${sel}`}
    >
      <span style={{ fontSize: 17 }}>{flagFor(team)}</span>
      <span className={cls.slotName}>{team}</span>
      {selected && (
        <span className={cls.slotWin} style={{ color: markColor }}>
          {mark}
        </span>
      )}
    </button>
  )
}

/** The card shell: two-team main area + a "My Pick" side panel. */
export function MatchCardShell({
  matchId,
  cardRef,
  status,
  label,
  labelColor = 'dimmed',
  time,
  pickPanel,
  children,
}: {
  matchId: number
  cardRef: (el: HTMLElement | null) => void
  status: ConnectorState
  label: string
  labelColor?: string
  time: string
  pickPanel: ReactNode
  children: ReactNode
}) {
  return (
    <Paper
      ref={cardRef}
      data-match={matchId}
      withBorder
      radius="md"
      p={0}
      style={{ overflow: 'hidden', borderWidth: 2, borderColor: borderColor(status) }}
    >
      <Group gap={0} align="stretch" wrap="nowrap">
        <Box p={8} style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" fw={700} c={labelColor} mb={4}>
            {label}
          </Text>
          {children}
          <Text size="xs" c="dimmed" mt={4}>
            {time}
          </Text>
        </Box>
        <Stack
          gap={2}
          align="center"
          w={100}
          p="xs"
          style={{
            background: 'var(--mantine-color-gray-0)',
            borderLeft: '1px solid var(--mantine-color-gray-2)',
          }}
        >
          {pickPanel}
        </Stack>
      </Group>
    </Paper>
  )
}

export function ChampionCard({
  title,
  team,
  status,
}: {
  title: string
  team?: string
  status: ConnectorState
}) {
  const border =
    status === 'correct'
      ? 'var(--mantine-color-green-6)'
      : status === 'wrong'
        ? 'var(--mantine-color-red-6)'
        : 'transparent'
  return (
    <Box
      style={{
        borderRadius: 14,
        padding: '20px 16px',
        textAlign: 'center',
        color: '#fff',
        border: `2px solid ${border}`,
        background:
          'radial-gradient(circle, rgba(255,255,255,0.16) 1px, transparent 1.6px) 0 0 / 14px 14px, linear-gradient(160deg, var(--mantine-color-blue-7), var(--mantine-color-green-8))',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}
    >
      <Text size="sm" fw={700} style={{ letterSpacing: '0.08em', opacity: 0.92 }}>
        {title}
      </Text>
      <Text fz={26} fw={800} my={6}>
        {team ?? 'No pick yet'}
      </Text>
      <span className={cls.flagBig}>{team ? flagFor(team) : '🏆'}</span>
      {status === 'correct' && (
        <Badge color="green" mt="sm" variant="filled">
          ✓ Champion
        </Badge>
      )}
      {status === 'wrong' && (
        <Badge color="red" mt="sm" variant="filled">
          Eliminated
        </Badge>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Board layout + SVG connectors
// ---------------------------------------------------------------------------

interface Segment {
  key: string
  d: string
  state: ConnectorState
}

interface BracketBoardProps {
  t: Tournament
  byRound: Record<Round, Match[]>
  renderCard: (
    match: Match,
    round: RoundInfo,
    cardRef: (el: HTMLElement | null) => void,
  ) => ReactNode
  connectorState: (feederMatchId: number) => ConnectorState
  measureDeps: unknown[]
  championCard?: ReactNode
}

function Band({ name, dates, pts }: { name: string; dates: string; pts?: string }) {
  return (
    <Box ta="center" pb={8} mb={8} style={{ borderBottom: '2px solid var(--mantine-color-blue-5)' }}>
      <Text fw={800} fz="lg">
        {name}
      </Text>
      <Text size="xs" c="dimmed">
        {dates}
      </Text>
      <Text size="xs" c="dimmed">
        {pts ?? ' '}
      </Text>
    </Box>
  )
}

/**
 * Round columns with point bands, an optional championship column, and SVG
 * connector lines from each match's two feeders into the match. Lines are
 * measured from the laid-out DOM (exact at any width; recomputed on resize
 * and when measureDeps change). View / Edit / Admin render their own cards.
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

  const lineClass = (s: ConnectorState) =>
    s === 'correct' ? `${cls.line} ${cls.lineCorrect}` : s === 'wrong' ? `${cls.line} ${cls.lineWrong}` : cls.line

  return (
    <div className={cls.scroll}>
      <div className={cls.grid} ref={contentRef}>
        <svg className={cls.lines} width={size.w || '100%'} height={size.h || '100%'} aria-hidden="true">
          {segments.map((s) => (
            <path key={s.key} d={s.d} className={lineClass(s.state)} fill="none" />
          ))}
        </svg>

        {t.rounds.map((round) => (
          <div className={cls.col} key={round.id}>
            <Band
              name={round.name}
              dates={ROUND_DATES[round.id]}
              pts={`${round.points} pt${round.points > 1 ? 's' : ''} each`}
            />
            <div className={cls.matches}>
              {byRound[round.id].map((match) => renderCard(match, round, setCardRef(match.id)))}
            </div>
          </div>
        ))}

        {championCard && (
          <div className={cls.col}>
            <Band name="Champion" dates="July 19" />
            <div className={cls.matches}>{championCard}</div>
          </div>
        )}
      </div>
    </div>
  )
}

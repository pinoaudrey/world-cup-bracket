import { Anchor, Badge, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { bracketOrder, eliminatedTeams, participants } from '../bracket'
import {
  BracketBoard,
  ChampionCard,
  type ConnectorState,
  DisplaySlot,
  FlagTile,
  MatchCardShell,
  PickBadge,
  shortTime,
} from '../components/BracketBoard'
import { abbrFor } from '../flags'
import { leaderboard, scoreBracket } from '../scoring'
import { useStore } from '../store'
import { isAdminUnlocked } from '../util/admin'

type PickStatus = 'correct' | 'wrong' | 'pending' | 'none'

/**
 * Coloring rules: correct (green) = result matches the pick; wrong (red) =
 * result missed OR the picked team is already eliminated in reality even if
 * unplayed; pending (gray) = no result and the picked team is still alive.
 */
function pickStatus(
  matchId: number,
  pick: string | undefined,
  winners: Record<number, string>,
  eliminated: Set<string>,
): PickStatus {
  if (!pick) return 'none'
  const w = winners[matchId]
  if (w !== undefined) return w === pick ? 'correct' : 'wrong'
  if (eliminated.has(pick)) return 'wrong'
  return 'pending'
}

const toConnector = (s: PickStatus): ConnectorState =>
  s === 'correct' ? 'correct' : s === 'wrong' ? 'wrong' : 'neutral'

function Stat({ num, label }: { num: string | number; label: string }) {
  return (
    <div>
      <Text fz={28} fw={800} lh={1.1}>
        {num}
      </Text>
      <Text fz={10} fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
        {label}
      </Text>
    </div>
  )
}

export function ViewBracket() {
  const { tournament, results, brackets, getBracket } = useStore()
  const { username } = useParams()
  const t = tournament!
  const winners = results.winners

  const bracket = username ? getBracket(username) : undefined
  const byRound = useMemo(() => bracketOrder(t), [t])
  const eliminated = useMemo(() => eliminatedTeams(t, winners), [t, winners])
  const score = useMemo(
    () => (bracket ? scoreBracket(bracket, t, results) : null),
    [bracket, t, results],
  )
  const rank = useMemo(() => {
    if (!bracket) return undefined
    return leaderboard(brackets, t, results).find(
      (r) => r.username.toLowerCase() === bracket.username.toLowerCase(),
    )?.rank
  }, [bracket, brackets, t, results])

  if (!bracket || !score) {
    return (
      <Stack gap="xs">
        <Title order={1}>Bracket not found</Title>
        <Text c="dimmed">
          No saved bracket for “{username}”.{' '}
          <Anchor component={Link} to="/">
            See the leaderboard
          </Anchor>{' '}
          or{' '}
          <Anchor component={Link} to="/create">
            create one
          </Anchor>
          .
        </Text>
      </Stack>
    )
  }

  // While locked, hide picks from everyone except the admin (whoever unlocked
  // the admin gate). The organizer reveals them once all brackets are in.
  if (results.locked === true && !isAdminUnlocked()) {
    return (
      <Stack gap="md">
        <Title order={1}>{bracket.username}’s bracket</Title>
        <Paper withBorder radius="md" p="xl" ta="center">
          <Text fz={40}>🔒</Text>
          <Text fw={600} mt="xs">
            Picks are hidden
          </Text>
          <Text c="dimmed" size="sm" mt={4}>
            Brackets stay private until everyone has submitted. The organizer will
            reveal them — check back then.
          </Text>
          <Anchor component={Link} to="/" mt="md" style={{ display: 'inline-block' }}>
            Back to the leaderboard
          </Anchor>
        </Paper>
      </Stack>
    )
  }

  const picks = bracket.picks
  const finalMatch = t.matches.find((m) => m.round === 'F')
  const champPick = finalMatch ? picks[finalMatch.id] : undefined
  const champStatus = finalMatch
    ? pickStatus(finalMatch.id, champPick, winners, eliminated)
    : 'none'

  const pct = score.pctCorrect
  const subtitle =
    score.decided === 0
      ? 'No matches decided yet'
      : score.correct === score.decided
        ? 'Your bracket is perfect so far'
        : `${score.correct} of ${score.decided} picks correct`

  const connState = (f: number): ConnectorState => {
    const fp = picks[f]
    const fw = winners[f]
    if (fw !== undefined && fp !== undefined) return fp === fw ? 'correct' : 'wrong'
    return 'neutral'
  }

  return (
    <Stack gap="md">
      {/* Summary header */}
      <Paper withBorder radius="md" p="md">
        <Group wrap="nowrap" align="flex-start" gap="md">
          <FlagTile team={champPick} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <Title order={2}>{bracket.username}’s bracket</Title>
              <Text>🏅</Text>
              <Anchor component={Link} to={`/create/${encodeURIComponent(bracket.username)}`} ml="auto">
                ⚙ Edit
              </Anchor>
            </Group>
            <Text c="dimmed" size="sm" mb="xs">
              {subtitle}
            </Text>
            <Group gap="xl">
              <Stat num={rank ?? '—'} label="RANK" />
              <Stat num={pct === null ? '—' : `${pct}%`} label="PCT" />
              <Stat num={score.total} label="PTS" />
            </Group>
          </div>
        </Group>
      </Paper>

      {/* Per-round breakdown */}
      <Group gap="xs">
        {score.byRound.map((r) => (
          <Badge key={r.round} variant="default" size="lg" tt="none">
            {r.round} {r.earned}/{r.maxRound}
          </Badge>
        ))}
        <Badge color="dark" variant="filled" size="lg" tt="none">
          Total {score.total}/80
        </Badge>
        <Text size="sm" c="dimmed">
          · max possible {score.maxPossible}
        </Text>
      </Group>

      <BracketBoard
        t={t}
        byRound={byRound}
        connectorState={connState}
        measureDeps={[picks, winners]}
        renderCard={(match, round, cardRef) => {
          const [realA, realB] = participants(match, winners)
          const winner = winners[match.id]
          const pick = picks[match.id]
          const status = pickStatus(match.id, pick, winners, eliminated)
          const [predA, predB] = participants(match, picks)
          const over = match.round !== 'R32' ? (predA === pick ? predB : predA) : null
          const label =
            status === 'correct' ? 'Correct' : status === 'wrong' ? 'Incorrect' : 'Locked'
          const labelColor =
            status === 'correct' ? 'green.7' : status === 'wrong' ? 'red.7' : 'dimmed'
          const badgeKind = status === 'correct' ? 'correct' : status === 'wrong' ? 'wrong' : 'locked'
          return (
            <MatchCardShell
              key={match.id}
              matchId={match.id}
              cardRef={cardRef}
              status={toConnector(status)}
              label={label}
              labelColor={labelColor}
              time={shortTime(match.datetime)}
              pickPanel={
                <>
                  <FlagTile team={pick} badge={pick ? <PickBadge kind={badgeKind} /> : undefined} />
                  <Text size="xs" c="dimmed">
                    My Pick:
                  </Text>
                  <Text fw={800}>{pick ? abbrFor(pick) : '—'}</Text>
                  {over && (
                    <Text size="xs" c="dimmed">
                      (over {abbrFor(over)})
                    </Text>
                  )}
                  {status === 'correct' && (
                    <Text size="xs" fw={800} c="green.7">
                      +{round.points} PT{round.points > 1 ? 'S' : ''}
                    </Text>
                  )}
                </>
              }
            >
              <DisplaySlot team={realA} winner={winner !== undefined && winner === realA} />
              <DisplaySlot team={realB} winner={winner !== undefined && winner === realB} />
            </MatchCardShell>
          )
        }}
        championCard={
          <ChampionCard
            title="MY CHAMPIONSHIP PICK"
            team={champPick}
            status={toConnector(champStatus)}
          />
        }
      />
    </Stack>
  )
}

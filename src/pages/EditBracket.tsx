import {
  Anchor,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  bracketOrder,
  isComplete,
  participants,
  pickCount,
  setPick,
} from '../bracket'
import {
  BracketBoard,
  ChampionCard,
  ClickSlot,
  FlagTile,
  MatchCardShell,
  shortTime,
} from '../components/BracketBoard'
import { abbrFor } from '../flags'
import { useStore } from '../store'
import type { Match } from '../types'

export function EditBracket() {
  const { tournament, getBracket, saveBracket } = useStore()
  const navigate = useNavigate()
  const { username: usernameParam } = useParams()

  const [username, setUsername] = useState('')
  const [picks, setPicks] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState(false)

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
  const finalMatch = t.matches.find((m) => m.round === 'F')
  const champPick = finalMatch ? picks[finalMatch.id] : undefined

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
      if (!confirm(`A bracket for "${existing.username}" already exists. Overwrite it?`))
        return
    }
    saveBracket({ username: name, picks })
    setSaved(true)
  }

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Title order={2}>
          {usernameParam ? `Edit bracket: ${usernameParam}` : 'Create bracket'}
        </Title>
        <Text c="dimmed" size="sm" mb="sm">
          Pick a winner for each match. Picking a team feeds it into the next round;
          changing an earlier pick clears later picks that depended on it.
        </Text>
        <Group align="flex-end" gap="md">
          <TextInput
            label="Username"
            placeholder="e.g. alex"
            value={username}
            onChange={(e) => {
              setUsername(e.currentTarget.value)
              setSaved(false)
            }}
            disabled={!!usernameParam}
            w={220}
          />
          <Group gap={6}>
            <Text>
              <b>{done}</b> / {total} picks
            </Text>
            {complete && (
              <Badge color="green" variant="light">
                complete
              </Badge>
            )}
          </Group>
          <Button onClick={handleSave}>Save bracket</Button>
          {saved && (
            <Text c="green" size="sm">
              Saved.{' '}
              <Anchor
                component="button"
                type="button"
                onClick={() => navigate(`/view/${encodeURIComponent(username.trim())}`)}
              >
                View it →
              </Anchor>
            </Text>
          )}
        </Group>
      </Paper>

      <BracketBoard
        t={t}
        byRound={byRound}
        connectorState={() => 'neutral'}
        measureDeps={[picks]}
        renderCard={(match, round, cardRef) => {
          const [a, b] = participants(match, picks)
          const pick = picks[match.id]
          const over = pick && round.id !== 'R32' ? (a === pick ? b : a) : null
          return (
            <MatchCardShell
              key={match.id}
              matchId={match.id}
              cardRef={cardRef}
              status="neutral"
              label={pick ? 'Your pick' : 'Pick a winner'}
              time={shortTime(match.datetime)}
              pickPanel={
                <>
                  <FlagTile team={pick} />
                  <Text size="xs" c="dimmed">
                    My Pick:
                  </Text>
                  <Text fw={800}>{pick ? abbrFor(pick) : '—'}</Text>
                  {over && (
                    <Text size="xs" c="dimmed">
                      (over {abbrFor(over)})
                    </Text>
                  )}
                </>
              }
            >
              <ClickSlot
                team={a}
                selected={pick === a}
                onSelect={() => {
                  if (a) choose(match, a)
                }}
              />
              <ClickSlot
                team={b}
                selected={pick === b}
                onSelect={() => {
                  if (b) choose(match, b)
                }}
              />
            </MatchCardShell>
          )
        }}
        championCard={<ChampionCard title="YOUR CHAMPIONSHIP PICK" team={champPick} status="neutral" />}
      />
    </Stack>
  )
}

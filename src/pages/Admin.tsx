import {
  Anchor,
  Button,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { bracketOrder, isEnterable, participants } from '../bracket'
import {
  BracketBoard,
  ClickSlot,
  FlagTile,
  MatchCardShell,
  PickBadge,
  shortTime,
} from '../components/BracketBoard'
import { abbrFor } from '../flags'
import { useStore } from '../store'
import { ADMIN_UNLOCK_KEY } from '../util/admin'

// Casual client-side gate to prevent accidental edits on the public site.
// NOTE: this is NOT real security. The password ships in the static bundle and
// anyone can bypass it. It doesn't matter: editing the live site only changes
// the visitor's own localStorage. Published data only updates when the admin
// exports JSON and commits it to the repo.
const ADMIN_PASSWORD = 'WC26'

export function Admin() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(ADMIN_UNLOCK_KEY) === '1',
  )
  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />
  return <AdminPanel />
}

function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [bad, setBad] = useState(false)
  function submit(e: FormEvent) {
    e.preventDefault()
    if (value === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_UNLOCK_KEY, '1')
      onUnlock()
    } else {
      setBad(true)
    }
  }
  return (
    <Stack gap="md" maw={560}>
      <Title order={1}>Admin</Title>
      <Text c="dimmed">
        Casual gate to avoid accidental edits. This is <em>not</em> security —
        editing this site only changes your own browser; published standings
        update only when the admin commits exported JSON to the repo.
      </Text>
      <form onSubmit={submit}>
        <Group align="flex-end" gap="md">
          <PasswordInput
            label="Password"
            value={value}
            autoFocus
            onChange={(e) => {
              setValue(e.currentTarget.value)
              setBad(false)
            }}
            w={220}
          />
          <Button type="submit">Unlock</Button>
          {bad && (
            <Text c="red" size="sm">
              Wrong password.
            </Text>
          )}
        </Group>
      </form>
    </Stack>
  )
}

function AdminPanel() {
  const { tournament, results, setWinner, clearWinner, setLocked } = useStore()
  const t = tournament!
  const locked = results.locked === true

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>Admin</Title>
        <Text c="dimmed" size="sm">
          Enter match results below. Create, edit, and delete brackets on the{' '}
          <Anchor component={Link} to="/">
            Leaderboard
          </Anchor>{' '}
          page.
          {import.meta.env.DEV
            ? ' On localhost every change auto-saves to public/data/*.json — just commit and push.'
            : ''}
        </Text>
      </div>

      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <div>
            <Title order={3}>Pick visibility</Title>
            <Text c="dimmed" size="sm">
              {locked
                ? '🔒 Locked — everyone else sees “picks hidden” until you reveal. Use this until all brackets are submitted.'
                : '🔓 Revealed — anyone can view all brackets.'}
            </Text>
          </div>
          <Switch
            size="lg"
            checked={!locked}
            onChange={(e) => setLocked(!e.currentTarget.checked)}
            onLabel="Shown"
            offLabel="Hidden"
            aria-label="Reveal picks"
          />
        </Group>
      </Paper>

      <div>
        <Title order={3}>Enter results</Title>
        <Text c="dimmed" size="sm" mb="sm">
          Click the winner of each match. A match unlocks once both real participants
          are known (derived from earlier winners). Changing an earlier result clears
          any now-impossible later results.
        </Text>
        <BracketBoard
          t={t}
          byRound={bracketOrder(t)}
          connectorState={(f) => (results.winners[f] !== undefined ? 'correct' : 'neutral')}
          measureDeps={[results.winners]}
          renderCard={(match, _round, cardRef) => {
            const [a, b] = participants(match, results.winners)
            const enterable = isEnterable(match, results.winners)
            const winner = results.winners[match.id]
            const decided = winner !== undefined
            const label = decided ? 'Final' : enterable ? 'Enter result' : 'Awaiting teams'
            return (
              <MatchCardShell
                key={match.id}
                matchId={match.id}
                cardRef={cardRef}
                status={decided ? 'correct' : 'neutral'}
                label={label}
                labelColor={decided ? 'green.7' : 'dimmed'}
                time={shortTime(match.datetime)}
                pickPanel={
                  <>
                    <FlagTile
                      team={winner}
                      badge={
                        decided ? (
                          <PickBadge kind="correct" />
                        ) : !enterable ? (
                          <PickBadge kind="locked" />
                        ) : undefined
                      }
                    />
                    <Text size="xs" c="dimmed">
                      {decided ? 'Winner' : 'Result'}
                    </Text>
                    <Text fw={800}>{winner ? abbrFor(winner) : '—'}</Text>
                    {decided && (
                      <Anchor component="button" type="button" c="red" fz="xs" onClick={() => clearWinner(match.id)}>
                        Clear
                      </Anchor>
                    )}
                  </>
                }
              >
                <ClickSlot
                  team={a}
                  selected={winner === a}
                  disabled={!enterable}
                  variant="won"
                  onSelect={() => {
                    if (a) setWinner(match.id, a)
                  }}
                />
                <ClickSlot
                  team={b}
                  selected={winner === b}
                  disabled={!enterable}
                  variant="won"
                  onSelect={() => {
                    if (b) setWinner(match.id, b)
                  }}
                />
              </MatchCardShell>
            )
          }}
        />
      </div>
    </Stack>
  )
}

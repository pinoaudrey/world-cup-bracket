import {
  Alert,
  Anchor,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { leaderboard } from '../scoring'
import { useStore } from '../store'
import { isAdminUnlocked } from '../util/admin'

// Edit/Delete only matter for the admin working locally; the published
// read-only site lists brackets as view-only.
const canManage = import.meta.env.DEV

export function Leaderboard() {
  const { tournament, brackets, results, deleteBracket } = useStore()
  const navigate = useNavigate()
  const t = tournament!
  const board = useMemo(
    () => leaderboard(brackets, t, results),
    [brackets, t, results],
  )
  const decided = Object.keys(results.winners).length
  const picksHidden = results.locked === true && !isAdminUnlocked()

  return (
    <Stack gap="md">
      {picksHidden && (
        <Alert color="gray" variant="light" py="xs">
          🔒 Picks are hidden until everyone has submitted — the organizer will
          reveal all brackets.
        </Alert>
      )}
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1}>Leaderboard</Title>
          <Text c="dimmed" size="sm">
            {brackets.length} player{brackets.length === 1 ? '' : 's'} · {decided} of{' '}
            {t.matches.length} matches decided · advancement scoring (max 80) · click a
            row to view
          </Text>
        </div>
        <Button onClick={() => navigate('/create')}>+ New bracket</Button>
      </Group>

      {board.length === 0 ? (
        <Text c="dimmed">
          No brackets yet.{' '}
          <Anchor component={Link} to="/create">
            Create one
          </Anchor>{' '}
          to get started.
        </Text>
      ) : (
        <Paper withBorder radius="md" p="md">
          <Table.ScrollContainer minWidth={canManage ? 660 : 520}>
            <Table striped highlightOnHover verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={36}>#</Table.Th>
                  <Table.Th>Player</Table.Th>
                  {t.rounds.map((r) => (
                    <Table.Th key={r.id}>{r.id}</Table.Th>
                  ))}
                  <Table.Th>Total</Table.Th>
                  <Table.Th title="Correct picks among decided matches">% Correct</Table.Th>
                  <Table.Th>Max</Table.Th>
                  {canManage && <Table.Th>Actions</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {board.map((row) => (
                  <Table.Tr
                    key={row.username}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/view/${encodeURIComponent(row.username)}`)}
                  >
                    <Table.Td fw={700}>{row.rank}</Table.Td>
                    <Table.Td fw={600}>{row.username}</Table.Td>
                    {row.byRound.map((r) => (
                      <Table.Td key={r.round}>{r.earned}</Table.Td>
                    ))}
                    <Table.Td fw={700}>{row.total}</Table.Td>
                    <Table.Td>
                      {row.pctCorrect === null ? '—' : `${row.pctCorrect}%`}
                    </Table.Td>
                    <Table.Td c="dimmed">{row.maxPossible}</Table.Td>
                    {canManage && (
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Anchor
                            component={Link}
                            to={`/create/${encodeURIComponent(row.username)}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Edit
                          </Anchor>
                          <Anchor
                            component="button"
                            type="button"
                            c="red"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`Delete ${row.username}'s bracket?`))
                                deleteBracket(row.username)
                            }}
                          >
                            Delete
                          </Anchor>
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      )}
    </Stack>
  )
}

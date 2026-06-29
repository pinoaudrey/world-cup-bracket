import { Anchor, Paper, Stack, Table, Text, Title } from '@mantine/core'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { leaderboard } from '../scoring'
import { useStore } from '../store'

export function Leaderboard() {
  const { tournament, brackets, results } = useStore()
  const t = tournament!
  const board = useMemo(
    () => leaderboard(brackets, t, results),
    [brackets, t, results],
  )
  const decided = Object.keys(results.winners).length

  return (
    <Stack gap="md">
      <div>
        <Title order={1}>Leaderboard</Title>
        <Text c="dimmed" size="sm">
          {brackets.length} player{brackets.length === 1 ? '' : 's'} · {decided} of{' '}
          {t.matches.length} matches decided · advancement-based scoring (max 80)
        </Text>
      </div>

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
          <Table.ScrollContainer minWidth={520}>
            <Table striped highlightOnHover verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={36}>#</Table.Th>
                  <Table.Th>Player</Table.Th>
                  {t.rounds.map((r) => (
                    <Table.Th key={r.id}>{r.id}</Table.Th>
                  ))}
                  <Table.Th>Total</Table.Th>
                  <Table.Th title="Correct picks among decided matches">
                    % Correct
                  </Table.Th>
                  <Table.Th>Max</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {board.map((row) => (
                  <Table.Tr key={row.username}>
                    <Table.Td fw={700}>{row.rank}</Table.Td>
                    <Table.Td>
                      <Anchor component={Link} to={`/view/${encodeURIComponent(row.username)}`}>
                        {row.username}
                      </Anchor>
                    </Table.Td>
                    {row.byRound.map((r) => (
                      <Table.Td key={r.round}>{r.earned}</Table.Td>
                    ))}
                    <Table.Td fw={700}>{row.total}</Table.Td>
                    <Table.Td>
                      {row.pctCorrect === null ? '—' : `${row.pctCorrect}%`}
                    </Table.Td>
                    <Table.Td c="dimmed">{row.maxPossible}</Table.Td>
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

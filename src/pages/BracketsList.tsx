import {
  Anchor,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { Link, useNavigate } from 'react-router-dom'
import { isComplete, pickCount } from '../bracket'
import { useStore } from '../store'

export function BracketsList() {
  const { tournament, brackets, deleteBracket } = useStore()
  const navigate = useNavigate()
  const t = tournament!

  const sorted = [...brackets].sort((a, b) => a.username.localeCompare(b.username))

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1}>Brackets</Title>
          <Text c="dimmed" size="sm">
            Everyone’s saved picks in this browser.
          </Text>
        </div>
        <Button onClick={() => navigate('/create')}>+ New bracket</Button>
      </Group>

      {sorted.length === 0 ? (
        <Text c="dimmed">
          No brackets saved yet.{' '}
          <Anchor component={Link} to="/create">
            Create one
          </Anchor>
          .
        </Text>
      ) : (
        <Paper withBorder radius="md" p="md">
          <Table highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Player</Table.Th>
                <Table.Th>Picks</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sorted.map((b) => {
                const done = pickCount(b.picks, t)
                const complete = isComplete(b.picks, t)
                return (
                  <Table.Tr key={b.username}>
                    <Table.Td>{b.username}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <span>
                          {done}/{t.matches.length}
                        </span>
                        <Badge color={complete ? 'green' : 'yellow'} variant="light">
                          {complete ? 'complete' : 'partial'}
                        </Badge>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="sm">
                        <Anchor component={Link} to={`/view/${encodeURIComponent(b.username)}`}>
                          View
                        </Anchor>
                        <Anchor component={Link} to={`/create/${encodeURIComponent(b.username)}`}>
                          Edit
                        </Anchor>
                        <Anchor
                          component="button"
                          type="button"
                          c="red"
                          onClick={() => {
                            if (confirm(`Delete ${b.username}'s bracket?`))
                              deleteBracket(b.username)
                          }}
                        >
                          Delete
                        </Anchor>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  )
}

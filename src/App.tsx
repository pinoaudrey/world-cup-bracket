import {
  Alert,
  AppShell,
  Box,
  Container,
  Group,
  Loader,
  Text,
} from '@mantine/core'
import { Navigate, NavLink as RouterNavLink, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import { WC_RIBBON } from './theme'
import { Admin } from './pages/Admin'
import { BracketsList } from './pages/BracketsList'
import { EditBracket } from './pages/EditBracket'
import { Leaderboard } from './pages/Leaderboard'
import { ViewBracket } from './pages/ViewBracket'

const navLinks = [
  { to: '/', label: 'Leaderboard', end: true },
  { to: '/brackets', label: 'Brackets' },
  { to: '/admin', label: 'Admin' },
]

function HeaderLink({
  to,
  label,
  end,
}: {
  to: string
  label: string
  end?: boolean
}) {
  return (
    <RouterNavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        color: '#fff',
        textDecoration: 'none',
        fontWeight: isActive ? 700 : 500,
        opacity: isActive ? 1 : 0.78,
        borderBottom: `2px solid ${isActive ? '#fff' : 'transparent'}`,
        paddingBottom: 2,
      })}
    >
      {label}
    </RouterNavLink>
  )
}

export default function App() {
  const { loading, error, tournament } = useStore()

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header bg="blue.7" withBorder={false}>
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Text fw={700} c="white" style={{ whiteSpace: 'nowrap' }}>
              ⚽ World Cup 2026 Bracket Challenge
            </Text>
            <Group gap="lg" wrap="nowrap">
              {navLinks.map((l) => (
                <HeaderLink key={l.to} {...l} />
              ))}
            </Group>
          </Group>
        </Container>
        {/* World Cup color-block ribbon evoking the "26" branding. */}
        <Box pos="absolute" left={0} right={0} bottom={0} h={5} style={{ background: WC_RIBBON }} />
      </AppShell.Header>

      <AppShell.Main bg="gray.0">
        <Container size="lg" px={0}>
          {error && (
            <Alert color="red" title="Couldn’t load tournament data" mb="md">
              {error}
            </Alert>
          )}
          {loading && !error && (
            <Group gap="xs" c="dimmed">
              <Loader size="sm" /> <Text c="dimmed">Loading tournament…</Text>
            </Group>
          )}
          {!loading && tournament && (
            <Routes>
              <Route path="/" element={<Leaderboard />} />
              <Route path="/create" element={<EditBracket />} />
              <Route path="/create/:username" element={<EditBracket />} />
              <Route path="/brackets" element={<BracketsList />} />
              <Route path="/view/:username" element={<ViewBracket />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

import { Navigate, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import { useStore } from './store'
import { Admin } from './pages/Admin'
import { BracketsList } from './pages/BracketsList'
import { EditBracket } from './pages/EditBracket'
import { Leaderboard } from './pages/Leaderboard'
import { ViewBracket } from './pages/ViewBracket'

export default function App() {
  const { loading, error, tournament } = useStore()

  return (
    <div className="app">
      <Nav />
      <main className="content">
        {error && (
          <div className="banner error">
            Couldn’t load tournament data: {error}
          </div>
        )}
        {loading && !error && <p className="muted">Loading tournament…</p>}
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
      </main>
    </div>
  )
}

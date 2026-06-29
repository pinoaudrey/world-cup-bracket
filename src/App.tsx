import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import CreateBracket from './pages/CreateBracket'
import ViewBracket from './pages/ViewBracket'
import Leaderboard from './pages/Leaderboard'
import Admin from './pages/Admin'

function NavBar() {
  return (
    <header className="nav">
      <div className="nav__brand">⚽ World Cup 2026 Bracket</div>
      <nav className="nav__links">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/leaderboard">Leaderboard</NavLink>
        <NavLink to="/create">Create / Edit</NavLink>
        <NavLink to="/admin">Admin</NavLink>
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <div className="app">
      <NavBar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/create" element={<CreateBracket />} />
          <Route path="/create/:username" element={<CreateBracket />} />
          <Route path="/bracket/:username" element={<ViewBracket />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <footer className="footer">
        Static demo · data is published by committing JSON to the repo.
      </footer>
    </div>
  )
}

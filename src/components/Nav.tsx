import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Leaderboard', end: true },
  { to: '/brackets', label: 'Brackets' },
  { to: '/admin', label: 'Admin' },
]

export function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <span className="brand">⚽ World Cup 2026 Bracket Challenge</span>
        <nav className="nav-links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

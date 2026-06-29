import { flagFor } from '../lib/flags'

export default function TeamName({ team }: { team: string }) {
  const flag = flagFor(team)
  return (
    <span>
      {flag && (
        <span className="flag" aria-hidden="true">
          {flag}{' '}
        </span>
      )}
      {team}
    </span>
  )
}

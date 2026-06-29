// Casual admin gate state, shared across pages. Set when someone enters the
// admin password; lets the admin see picks even while they're locked.
// NOTE: not real security — the password ships in the bundle.
export const ADMIN_UNLOCK_KEY = 'wc2026.admin.unlocked'

export function isAdminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

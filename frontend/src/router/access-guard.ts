import { canAccessPage, homeForRole, isStaffRole, type StaffIdentity } from '@/access'

interface AccessSession {
  token: string
  user: StaffIdentity | null
  getProfile(): Promise<unknown>
  clearSession(): void
}
export function createAccessGuard(session: AccessSession) {
  return async (to: { path: string }): Promise<true | string> => {
    if (to.path === '/login') return true
    if (!session.token) return '/login'
    if (!session.user) {
      try { await session.getProfile() } catch { return '/login' }
    }
    if (!session.user || !isStaffRole(session.user.role) || !Number.isSafeInteger(session.user.id) || session.user.id < 1) {
      session.clearSession()
      return '/login'
    }
    return canAccessPage(session.user.role, to.path) ? true : homeForRole(session.user.role)
  }
}

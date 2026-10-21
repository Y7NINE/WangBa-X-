export const staffRoles = ['admin', 'manager', 'cashier', 'technician', 'cleaner'] as const
export type StaffRole = (typeof staffRoles)[number]
export interface StaffIdentity { id: number; role: string }
const finance: StaffRole[] = ['admin', 'manager', 'cashier']
const managers: StaffRole[] = ['admin', 'manager']

export const navigationItems = [
  { path: '/dashboard', title: '数据大盘', icon: 'DataBoard', roles: finance },
  { path: '/seats', title: '座位管理', icon: 'Grid', roles: [...staffRoles] },
  { path: '/faults', title: '故障管理', icon: 'Warning', roles: [...finance, 'technician'] as StaffRole[] },
  { path: '/billing', title: '计费管理', icon: 'Money', roles: finance },
  { path: '/users', title: '用户管理', icon: 'User', roles: finance },
  { path: '/cleaning', title: '保洁管理', icon: 'Brush', roles: [...finance, 'cleaner'] as StaffRole[] },
  { path: '/orders', title: '水吧订单', icon: 'Coffee', roles: finance },
  { path: '/reports', title: '数据报表', icon: 'DataAnalysis', roles: finance },
  { path: '/settings', title: '系统设置', icon: 'Setting', roles: managers },
]

export function isStaffRole(role: unknown): role is StaffRole {
  return typeof role === 'string' && staffRoles.includes(role as StaffRole)
}
export function menuForRole(role: unknown) {
  return isStaffRole(role) ? navigationItems.filter(item => item.roles.includes(role)) : []
}
export function canAccessPage(role: unknown, path: string) {
  return menuForRole(role).some(item => item.path === (path.replace(/\/+$/, '') || '/'))
}
export function homeForRole(role: unknown): string {
  if (role === 'technician') return '/faults'
  if (role === 'cleaner') return '/cleaning'
  return isStaffRole(role) ? '/dashboard' : '/login'
}
function hasRole(user: StaffIdentity | null | undefined, roles: readonly StaffRole[]) {
  return !!user && Number.isSafeInteger(user.id) && user.id > 0 && isStaffRole(user.role) && roles.includes(user.role)
}
interface FaultAction { status: string; handlerId?: number | null }
export function canAcceptFault(user: StaffIdentity | null | undefined, task: FaultAction) {
  return task.status === 'pending' && hasRole(user, [...managers, 'technician'])
}
export function canResolveFault(user: StaffIdentity | null | undefined, task: FaultAction) {
  return ['accepted', 'processing'].includes(task.status) &&
    (hasRole(user, managers) || (hasRole(user, ['technician']) && task.handlerId === user?.id))
}
export function canTransferFault(user: StaffIdentity | null | undefined, task: FaultAction) {
  return ['accepted', 'processing'].includes(task.status) &&
    (hasRole(user, finance) || (hasRole(user, ['technician']) && task.handlerId === user?.id))
}
export function canStartCleaning(user: StaffIdentity | null | undefined) {
  return hasRole(user, [...managers, 'cleaner'])
}
export function canCompleteCleaning(user: StaffIdentity | null | undefined, task: { status: string; cleanerId?: number | null }) {
  return task.status === 'in_progress' &&
    (hasRole(user, managers) || (hasRole(user, ['cleaner']) && task.cleanerId === user?.id))
}

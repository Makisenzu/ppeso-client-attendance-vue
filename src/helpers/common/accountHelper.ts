import type { MyAccount } from '@/types/common/account'

/** Minimum password length — keep in step with Supabase Auth settings and the signup form. */
export const MIN_PASSWORD_LENGTH = 6

export function formatAccountFullName(account: Pick<MyAccount, 'firstname' | 'middlename' | 'lastname'>): string {
  return [account.firstname, account.middlename, account.lastname].filter(Boolean).join(' ').trim()
}

export function getAccountInitials(account: Pick<MyAccount, 'firstname' | 'lastname'>): string {
  return `${account.firstname.charAt(0)}${account.lastname.charAt(0)}`.toUpperCase() || 'U'
}

const POSITION_LABELS: Record<MyAccount['position'], string> = {
  admin: 'Admin',
  employee: 'Employee',
  gip: 'GIP',
  tupad: 'TUPAD',
  client: 'Client',
}

export function formatPositionLabel(position: MyAccount['position']): string {
  return POSITION_LABELS[position] ?? position
}

export function formatAccountRoleLabel(role: MyAccount['role']): string {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'No role'
}

export function formatAccountStatusLabel(status: MyAccount['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

/** Status badge colors (same as User Management's). */
export function getAccountStatusBadgeClass(status: MyAccount['status']): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'pending':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    default:
      return 'bg-destructive/10 text-destructive border-destructive/30'
  }
}

import type {
  ProfilePosition,
  ProfileRecord,
  ProfileRole,
  ProfileStatus,
} from '@/types/peso/userManagement'
import type { OfficeRecord } from '@/types/peso/office'
import type { SearchSelectOption } from '@/types/common/searchSelect'

// ─── SearchSelect options for the Add / Edit User forms ───
export const POSITION_OPTIONS: SearchSelectOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'employee', label: 'Employee' },
  { value: 'gip', label: 'GIP' },
  { value: 'tupad', label: 'TUPAD' },
  { value: 'client', label: 'Client' },
]

export const ROLE_OPTIONS: SearchSelectOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'beneficiary', label: 'Beneficiary' },
  { value: '', label: 'No role' },
]

export const STATUS_OPTIONS: SearchSelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
]

/** "No Office Assigned" plus each office as "Name (CODE)", with its head (and "Inactive") underneath. */
export function toOfficeSelectOptions(offices: OfficeRecord[]): SearchSelectOption[] {
  return [
    { value: '', label: 'No Office Assigned' },
    ...offices.map((office) => ({
      value: office.id,
      label: office.code ? `${office.name} (${office.code})` : office.name,
      description:
        [office.officeHead, office.isActive ? null : 'Inactive'].filter(Boolean).join(' · ') || undefined,
    })),
  ]
}

/**
 * Default role for a position: only Admin gets admin access; Employee / GIP / TUPAD are
 * beneficiaries; Client has no role. Supervisors are set by hand in Edit User.
 */
export function getDefaultRoleForPosition(position: ProfilePosition): ProfileRole | null {
  switch (position) {
    case 'admin':
      return 'admin'
    case 'employee':
    case 'gip':
    case 'tupad':
      return 'beneficiary'
    default:
      return null
  }
}

export function formatRoleLabel(role?: ProfileRole | null): string {
  if (!role) return 'No role'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function getStatusBadgeClass(status?: ProfileStatus | string | null): string {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'inactive':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
    case 'pending':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    default:
      return 'bg-muted text-muted-foreground border-transparent'
  }
}

export function formatStatusLabel(status?: ProfileStatus | string | null): string {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'Active'
    case 'inactive':
      return 'Inactive'
    case 'pending':
      return 'Pending'
    default:
      return status || '—'
  }
}

export function buildFullName(
  first?: string | null,
  middle?: string | null,
  last?: string | null,
): string {
  return `${first || ''} ${middle ? middle + ' ' : ''}${last || ''}`.trim() || 'Unknown'
}

export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
  } catch {
    return dateStr
  }
  return dateStr
}

export function exportProfilesToCsv(records: ProfileRecord[]): void {
  const headers = [
    'ID',
    'First Name',
    'Middle Name',
    'Last Name',
    'Full Name',
    'Position',
    'Office',
    'Status',
    'Passcode',
    'Created At',
    'Updated At',
  ]

  const rows = records.map((r) => [
    `"${r.id}"`,
    `"${r.firstname}"`,
    `"${r.middlename || ''}"`,
    `"${r.lastname}"`,
    `"${r.fullName}"`,
    `"${r.position.toUpperCase()}"`,
    `"${r.officeName ? `${r.officeName}${r.officeCode ? ` (${r.officeCode})` : ''}` : 'None'}"`,
    `"${r.status}"`,
    `"${r.passcode}"`,
    `"${formatDateDisplay(r.createdAt)}"`,
    `"${formatDateDisplay(r.updatedAt)}"`,
  ])

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute(
    'download',
    `User_Profiles_${new Date().toISOString().slice(0, 10)}.csv`,
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

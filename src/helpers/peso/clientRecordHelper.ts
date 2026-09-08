import type {
  ClientRecordItem,
  ClientRecordStats,
  GenderType,
  ServiceRequired,
} from '@/types/peso/clientRecord'

export const PURPOSE_OPTIONS: { value: ServiceRequired; label: string; shortLabel: string }[] = [
  { value: 'gip', label: 'Government Internship Program (GIP)', shortLabel: 'GIP' },
  { value: 'spes', label: 'Special Program for Employment of Students (SPES)', shortLabel: 'SPES' },
  { value: 'job_start', label: 'JobStart Philippines', shortLabel: 'JobStart' },
  { value: 'ofw', label: 'OFW / Migrant Assistance', shortLabel: 'OFW Help' },
  { value: 'cea', label: 'Career Guidance / CEA', shortLabel: 'Career Guidance' },
  { value: 'skills', label: 'Skills Training / Registry', shortLabel: 'Skills Training' },
  { value: 'others', label: 'General Inquiry / Others', shortLabel: 'Others' },
]

export const GENDER_OPTIONS: { value: GenderType; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'not specified', label: 'Not Specified' },
]

export function formatPurposeLabel(purpose?: string | null): string {
  if (!purpose) return 'Not Specified'
  const match = PURPOSE_OPTIONS.find((p) => p.value === purpose)
  return match ? match.label : purpose
}

export function formatPurposeShortLabel(purpose?: string | null): string {
  if (!purpose) return 'N/A'
  const match = PURPOSE_OPTIONS.find((p) => p.value === purpose)
  return match ? match.shortLabel : purpose.toUpperCase()
}

export function getPurposeBadgeClass(purpose?: string | null): string {
  switch (purpose) {
    case 'gip':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
    case 'spes':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
    case 'job_start':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50'
    case 'ofw':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
    case 'cea':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/50'
    case 'skills':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50'
    case 'others':
    default:
      return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
  }
}

export function getGenderBadgeClass(gender?: string | null): string {
  switch (gender) {
    case 'male':
      return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/40'
    case 'female':
      return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-900/40'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export function getNowDateTimeLocal(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function computeClientRecordStats(records: ClientRecordItem[]): ClientRecordStats {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  let todayCount = 0
  let maleCount = 0
  let femaleCount = 0

  const purposeCounts: Record<ServiceRequired, number> = {
    gip: 0,
    spes: 0,
    job_start: 0,
    ofw: 0,
    cea: 0,
    skills: 0,
    others: 0,
  }

  for (const r of records) {
    // Check-in date match
    if (r.check_in) {
      const recDate = new Date(r.check_in)
      const recDateStr = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`
      if (recDateStr === todayStr) {
        todayCount++
      }
    }

    if (r.gender === 'male') {
      maleCount++
    } else if (r.gender === 'female') {
      femaleCount++
    }

    if (r.purpose && purposeCounts[r.purpose] !== undefined) {
      purposeCounts[r.purpose]++
    }
  }

  // Find top purpose
  let topPurpose = 'None'
  let maxPurposeCount = 0
  for (const [key, count] of Object.entries(purposeCounts)) {
    if (count > maxPurposeCount) {
      maxPurposeCount = count
      topPurpose = formatPurposeShortLabel(key)
    }
  }

  return {
    total: records.length,
    today: todayCount,
    male: maleCount,
    female: femaleCount,
    topPurpose,
    purposeCounts,
  }
}

export function exportClientRecordsToCsv(records: ClientRecordItem[]): void {
  if (!records || records.length === 0) return

  const headers = [
    'Client ID',
    'First Name',
    'Middle Name',
    'Last Name',
    'Full Name',
    'Gender',
    'Contact Number',
    'Purok',
    'Barangay',
    'Municipality/City',
    'Province',
    'Full Address',
    'Service Required',
    'Check-in Time',
    'Check-out Time',
    'Created At',
  ]

  const rows = records.map((r) => [
    r.id,
    r.firstname,
    r.middlename || '',
    r.lastname,
    r.fullName,
    r.gender || 'not specified',
    r.contact_number || '',
    r.purok,
    r.barangay,
    r.geographic,
    r.province,
    r.formattedAddress,
    formatPurposeLabel(r.purpose),
    r.formattedCheckIn || r.check_in,
    r.formattedCheckOut || r.check_out || '',
    r.created_at,
  ])

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""'
    const value = String(str).replace(/"/g, '""')
    return `"${value}"`
  }

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n')

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  const dateStr = new Date().toISOString().slice(0, 10)
  link.setAttribute('download', `Walkin_Client_Records_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

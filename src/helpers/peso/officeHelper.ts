import type { OfficeFormData, OfficeRecord } from '@/types/peso/office'

export function getStatusBadgeClass(isActive?: boolean | string | null): string {
  if (isActive === true || isActive === 'active' || isActive === 'true') {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
  }
  return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
}

export function formatStatusLabel(isActive?: boolean | string | null): string {
  if (isActive === true || isActive === 'active' || isActive === 'true') {
    return 'Active'
  }
  return 'Inactive'
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

export function validateOfficeForm(formData: OfficeFormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (!formData.name || !formData.name.trim()) {
    errors.name = 'Office Name is required'
  } else if (formData.name.trim().length < 2) {
    errors.name = 'Office Name must be at least 2 characters'
  }

  if (formData.code && formData.code.trim().length > 20) {
    errors.code = 'Code cannot exceed 20 characters'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export function exportOfficesToCsv(records: OfficeRecord[]): void {
  const headers = [
    'Office ID',
    'Office Name',
    'Code',
    'Total Beneficiaries',
    'Status',
    'Created At',
    'Updated At',
  ]

  const rows = records.map((r) => [
    `"${r.id}"`,
    `"${r.name.replace(/"/g, '""')}"`,
    `"${(r.code || '').replace(/"/g, '""')}"`,
    `"${r.totalBeneficiaries}"`,
    `"${r.isActive ? 'Active' : 'Inactive'}"`,
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
    `Offices_Report_${new Date().toISOString().slice(0, 10)}.csv`,
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

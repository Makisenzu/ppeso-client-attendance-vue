import type { SearchSelectOption } from '@/types/common/searchSelect'
import type { PacdFile, PacdFileCategory, PacdFileFormData, PacdFileFormErrors } from '@/types/peso/pacdFile'

/** Same limits as the `pacd-files` bucket and core.pacd_files (migration 20261119000100). */
export const PACD_FILE_MAX_BYTES = 20 * 1024 * 1024
export const PACD_TITLE_MAX = 200
export const PACD_DESCRIPTION_MAX = 1000

const PDF = 'application/pdf'
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const PACD_FILE_TYPES = [PDF, DOCX, XLSX]
/** For the file input's `accept` */
export const PACD_FILE_ACCEPT = `.pdf,.docx,.xlsx,${PDF},${DOCX},${XLSX}`

/** File extension of each accepted type */
const EXTENSIONS: Record<string, string> = { [PDF]: 'pdf', [DOCX]: 'docx', [XLSX]: 'xlsx' }

export const PACD_CATEGORIES: { value: PacdFileCategory; label: string }[] = [
  { value: 'forms', label: 'Printable Forms' },
  { value: 'templates', label: 'Templates' },
  { value: 'guidelines', label: 'Guidelines' },
  { value: 'others', label: 'Others' },
]

export const PACD_CATEGORY_OPTIONS: SearchSelectOption[] = PACD_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))
export const PACD_CATEGORY_FILTER_OPTIONS: SearchSelectOption[] = [
  { value: 'ALL', label: 'All Categories' },
  ...PACD_CATEGORY_OPTIONS,
]

export function formatPacdCategory(category: string): string {
  return PACD_CATEGORIES.find((c) => c.value === category)?.label ?? 'Others'
}

export function getPacdCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'forms':
      return 'border-primary/30 bg-primary/10 text-primary'
    case 'templates':
      return 'border-chart-2/30 bg-chart-2/10 text-chart-2'
    case 'guidelines':
      return 'border-chart-4/30 bg-chart-4/10 text-chart-4'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

/** Some browsers leave `file.type` empty for .docx / .xlsx: fall back to the extension. */
export function resolvePacdMimeType(file: File): string | null {
  if (PACD_FILE_TYPES.includes(file.type)) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  return Object.keys(EXTENSIONS).find((type) => EXTENSIONS[type] === ext) ?? null
}

export function isPdf(file: Pick<PacdFile, 'mimeType'>): boolean {
  return file.mimeType === PDF
}

export function formatFileType(mimeType: string): string {
  return (EXTENSIONS[mimeType] ?? 'file').toUpperCase()
}

/** Colour of the file-type tag on each row: PDF red, Word blue (primary), Excel green */
export function getFileTypeBadgeClass(mimeType: string): string {
  if (mimeType === PDF) return 'border-destructive/30 bg-destructive/10 text-destructive'
  if (mimeType === XLSX) return 'border-chart-2/30 bg-chart-2/10 text-chart-2'
  return 'border-primary/30 bg-primary/10 text-primary'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** "Request Letter.docx" → "Request Letter" (the default title) */
export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim().slice(0, PACD_TITLE_MAX)
}

/** A storage path that is safe whatever the original name: "<category>/<timestamp>-<random>.<ext>" */
export function buildPacdFilePath(category: PacdFileCategory, mimeType: string): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${category}/${Date.now()}-${random}.${EXTENSIONS[mimeType] ?? 'bin'}`
}

export function validatePacdFile(file: File | null): string | undefined {
  if (!file) return 'Choose a PDF, Word (.docx) or Excel (.xlsx) file.'
  if (!resolvePacdMimeType(file)) return 'Only PDF, Word (.docx) and Excel (.xlsx) files can be uploaded.'
  if (file.size === 0) return 'This file is empty.'
  if (file.size > PACD_FILE_MAX_BYTES) return 'The file is larger than 20 MB.'
  return undefined
}

export function validatePacdForm(form: PacdFileFormData): PacdFileFormErrors {
  const errors: PacdFileFormErrors = {}
  const title = form.title.trim()
  if (!title) errors.title = 'Enter a title.'
  else if (title.length > PACD_TITLE_MAX) errors.title = `Keep the title under ${PACD_TITLE_MAX} characters.`
  if (form.description.trim().length > PACD_DESCRIPTION_MAX) {
    errors.description = `Keep the description under ${PACD_DESCRIPTION_MAX} characters.`
  }
  return errors
}

export function pacdFileMatches(file: PacdFile, query: string, category: string): boolean {
  if (category !== 'ALL' && file.category !== category) return false
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    file.title.toLowerCase().includes(q) ||
    file.fileName.toLowerCase().includes(q) ||
    file.description.toLowerCase().includes(q)
  )
}

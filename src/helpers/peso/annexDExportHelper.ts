import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { contactDigits, isValidContactNumber } from '@/helpers/common/contactNumberHelper'
import {
  beneficiaryTypeExportLabel,
  civilStatusCode,
  computeAge,
} from '@/helpers/common/dataEntryHelper'
import type { AnnexDEntry } from '@/types/common/dataEntry'
import templateUrl from '@/assets/form/ANNEX D BLANK FORM.xlsx?url'

/**
 * Exports DOLE's "Profile of TUPAD Beneficiaries" (ANNEX D) by filling the official blank form itself
 * (`src/assets/form/ANNEX D BLANK FORM.xlsx`). The file is opened as a zip and only the cell values of
 * `xl/worksheets/sheet1.xml` change, so the logos, the DOLE letterhead text box, fonts, borders, row heights,
 * notes and the certification block stay exactly as in the reference. Re-saving with a spreadsheet library would
 * drop the letterhead text box.
 *
 * Template layout (verified against the file): data rows 23–227 (205 rows); columns B = No., C–F = name, H =
 * birthdate, I–K, M = location, N–Z = the rest (G and L are the form's empty spacer columns). Rows 17–19 hold the
 * Province / Municipality / Barangay lines. More than 205 entries → rows are added after row 227 and everything
 * below moves down.
 */

const SHEET_PATH = 'xl/worksheets/sheet1.xml'
const WORKBOOK_PATH = 'xl/workbook.xml'
const FIRST_DATA_ROW = 23
const LAST_DATA_ROW = 227
const TEMPLATE_ROWS = LAST_DATA_ROW - FIRST_DATA_ROW + 1
/** Columns of a data row that hold ANNEX D values (cleared in unused rows). */
const DATA_COLUMNS = 'BCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

type CellValue = string | number | null

const XML_TEXT_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
function escapeXml(text: string): string {
  // Drop control characters XML 1.0 can't hold, then escape
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"]/g, (c) => XML_TEXT_ESCAPES[c])
}

/** `A, B & C` */
function joinList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? ''
  return `${values.slice(0, -1).join(', ')} & ${values[values.length - 1]}`
}

function distinctUpper(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v?.trim()).map((v) => v.trim().toUpperCase()))].sort()
}

/** A form line: plain label, then the value in bold + underline (as the blank form writes it). */
export interface AnnexDHeaderLine {
  label: string
  value: string
}

/** Rows 17–19 of the form (Province / Municipality / Barangay), filled from the exported entries. */
export function buildAnnexDHeaderLines(entries: AnnexDEntry[]): {
  province: AnnexDHeaderLine
  municipality: AnnexDHeaderLine
  barangay: AnnexDHeaderLine
} {
  const provinces = distinctUpper(entries.map((e) => e.province))
  const districts = distinctUpper(entries.map((e) => e.district)).map((d) => d.replace(/^DISTRICT\s*/, ''))
  const province = provinces.length > 0 ? `PROVINCIAL GOVERNMENT OF ${joinList(provinces)}` : ''
  return {
    province: { label: 'Province: ', value: `${province}${districts.length > 0 ? `-DISTRICT ${joinList(districts)}` : ''}` },
    municipality: { label: 'Municipality: ', value: joinList(distinctUpper(entries.map((e) => e.municipality))) },
    barangay: { label: 'Barangay: ', value: joinList(distinctUpper(entries.map((e) => e.barangay))) },
  }
}

/** One ANNEX D row as column letter → value. */
export function buildAnnexDRow(entry: AnnexDEntry, no: number, today: Date): Record<string, CellValue> {
  const contact = contactDigits(entry.contact_number)
  return {
    B: no,
    C: entry.lastname.toUpperCase(),
    D: entry.firstname.toUpperCase(),
    E: (entry.middlename ?? '').toUpperCase(),
    F: (entry.extension_name ?? '').toUpperCase(),
    H: formatDisplayDate(entry.birthdate, ''),
    I: entry.barangay.toUpperCase(),
    J: entry.municipality.toUpperCase(),
    K: entry.province.toUpperCase(),
    M: (entry.district ?? '').toUpperCase(),
    N: (entry.id_type ?? '').toUpperCase(),
    O: entry.id_number ?? '',
    // The form formats this column as 00000000000, so an 11-digit number keeps its leading 0
    P: isValidContactNumber(contact) ? Number(contact) : contact,
    Q: entry.epayment_account ?? '',
    R: beneficiaryTypeExportLabel(entry.beneficiary_type),
    S: (entry.occupation ?? '').toUpperCase(),
    T: entry.sex === 'male' ? 'M' : entry.sex === 'female' ? 'F' : '',
    U: civilStatusCode(entry.civil_status),
    V: computeAge(entry.birthdate, today),
    W: entry.average_monthly_income,
    X: (entry.dependent ?? '').toUpperCase(),
    Y: entry.interested_in_employment === null ? '' : entry.interested_in_employment ? 'Yes' : 'No',
    Z: (entry.skills_training_needed ?? '').toUpperCase(),
  }
}

const byText = (a: string | null, b: string | null) =>
  (a ?? '').trim().localeCompare((b ?? '').trim(), 'en', { sensitivity: 'base' })

/**
 * ANNEX D row order: grouped by municipality, then barangay (both A–Z), and within each barangay by
 * last name, first name, middle name, extension (A–Z). "No." runs continuously through the sheet.
 */
export function sortAnnexDEntries(entries: AnnexDEntry[]): AnnexDEntry[] {
  return [...entries].sort(
    (a, b) =>
      byText(a.municipality, b.municipality) ||
      byText(a.barangay, b.barangay) ||
      byText(a.lastname, b.lastname) ||
      byText(a.firstname, b.firstname) ||
      byText(a.middlename, b.middlename) ||
      byText(a.extension_name, b.extension_name) ||
      a.id.localeCompare(b.id),
  )
}

// ─── Sheet XML editing ───────────────────────────────────────────────────────

/** `<c r="REF" …/>` or `<c r="REF" …>…</c>` → the same cell with `value`, keeping its style. */
function setCell(rowXml: string, ref: string, value: CellValue): string {
  const pattern = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`)
  return rowXml.replace(pattern, (_match, attrs: string) => {
    const style = /\ss="(\d+)"/.exec(attrs)
    const s = style ? ` s="${style[1]}"` : ''
    if (value === null || value === '') return `<c r="${ref}"${s}/>`
    if (typeof value === 'number') return `<c r="${ref}"${s}><v>${value}</v></c>`
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
  })
}

/** Same run fonts as the blank form's rows 15–19: Arial 24, label plain, value bold + underlined. */
const HEADER_RUN = '<sz val="24"/><color theme="1"/><rFont val="Arial"/><charset val="134"/>'

/** Writes a form line as rich text, keeping the cell's style. */
function setHeaderCell(rowXml: string, ref: string, line: AnnexDHeaderLine): string {
  const pattern = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`)
  return rowXml.replace(pattern, (_match, attrs: string) => {
    const style = /\ss="(\d+)"/.exec(attrs)
    const s = style ? ` s="${style[1]}"` : ''
    return (
      `<c r="${ref}"${s} t="inlineStr"><is>` +
      `<r><rPr>${HEADER_RUN}</rPr><t xml:space="preserve">${escapeXml(line.label)}</t></r>` +
      `<r><rPr><b/><u/>${HEADER_RUN}</rPr><t xml:space="preserve">${escapeXml(line.value)}</t></r>` +
      `</is></c>`
    )
  })
}

/** Moves every cell reference at or below `fromRow` down by `by` rows. */
function shiftRefs(text: string, fromRow: number, by: number): string {
  return text.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)\b/g, (match, d1: string, col: string, d2: string, row: string) => {
    const n = Number(row)
    return n >= fromRow ? `${d1}${col}${d2}${n + by}` : match
  })
}

/** Shifts one row's number, its cells and its formulas. */
function shiftRow(rowXml: string, fromRow: number, by: number): string {
  return rowXml
    .replace(/(<row [^>]*?\br=")(\d+)"/, (_m, head: string, r: string) => `${head}${Number(r) + by}"`)
    .replace(/(<c r=")([A-Z]{1,3})(\d+)"/g, (_m, head: string, col: string, r: string) => `${head}${col}${Number(r) + by}"`)
    .replace(/(<f\b[^>]*?\bref=")([^"]+)"/g, (_m, head: string, ref: string) => `${head}${shiftRefs(ref, fromRow, by)}"`)
    .replace(/(<f\b[^>]*>)([^<]*)(<\/f>)/g, (_m, open: string, body: string, close: string) => `${open}${shiftRefs(body, fromRow, by)}${close}`)
}

/** A copy of the last data row renumbered to `rowNumber`, with its helper formulas dropped. */
function cloneDataRow(templateRow: string, rowNumber: number): string {
  return templateRow
    .replace(/(<row [^>]*?\br=")\d+"/, `$1${rowNumber}"`)
    .replace(/(<c r=")([A-Z]{1,3})\d+"/g, `$1$2${rowNumber}"`)
    // `/>` is tried first so a self-closing cell never runs on to the next cell's `</c>`
    .replace(/<c r="([A-Z]{1,3}\d+)"([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g, (_m, ref: string, attrs: string) => {
      const style = /\ss="(\d+)"/.exec(attrs)
      return `<c r="${ref}"${style ? ` s="${style[1]}"` : ''}/>`
    })
}

/** Fills the template's sheet XML with `entries`. Pure: returns the new XML. */
export function fillAnnexDSheet(sheetXml: string, unsorted: AnnexDEntry[], today: Date): string {
  const entries = sortAnnexDEntries(unsorted)
  const start = sheetXml.indexOf('<sheetData>') + '<sheetData>'.length
  const end = sheetXml.indexOf('</sheetData>')
  const rows = sheetXml.slice(start, end).match(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g) ?? []
  const rowNumber = (xml: string) => Number(/<row [^>]*?\br="(\d+)"/.exec(xml)?.[1] ?? 0)

  const extra = Math.max(0, entries.length - TEMPLATE_ROWS)
  const header = buildAnnexDHeaderLines(entries)
  const lastTemplateRow = rows.find((r) => rowNumber(r) === LAST_DATA_ROW) ?? ''

  const out: string[] = []
  for (const row of rows) {
    const n = rowNumber(row)
    if (n === 17) out.push(setHeaderCell(row, 'B17', header.province))
    else if (n === 18) out.push(setHeaderCell(row, 'B18', header.municipality))
    else if (n === 19) out.push(setHeaderCell(row, 'B19', header.barangay))
    else if (n >= FIRST_DATA_ROW && n <= LAST_DATA_ROW) out.push(fillDataRow(row, n, entries[n - FIRST_DATA_ROW], today))
    else if (n > LAST_DATA_ROW) out.push(extra > 0 ? shiftRow(row, LAST_DATA_ROW + 1, extra) : row)
    else out.push(row)

    if (n === LAST_DATA_ROW) {
      for (let i = 0; i < extra; i++) {
        const target = LAST_DATA_ROW + 1 + i
        out.push(fillDataRow(cloneDataRow(lastTemplateRow, target), target, entries[TEMPLATE_ROWS + i], today))
      }
    }
  }

  let before = sheetXml.slice(0, start)
  let after = sheetXml.slice(end)
  if (extra > 0) {
    const shiftAttr = (xml: string, tag: string) =>
      xml.replace(new RegExp(`(<${tag}\\b[^>]*?\\b(?:ref|sqref)=")([^"]+)"`, 'g'), (_m, head: string, ref: string) =>
        `${head}${shiftRefs(ref, LAST_DATA_ROW + 1, extra)}"`,
      )
    before = shiftAttr(before, 'dimension')
    for (const tag of ['mergeCell', 'hyperlink', 'autoFilter', 'conditionalFormatting', 'dataValidation']) {
      after = shiftAttr(after, tag)
    }
  }
  // Open at the top of the form (the blank form was saved scrolled to row 217)
  before = before.replace(/\stopLeftCell="[^"]*"/, ' topLeftCell="A1"').replace(/<selection [^>]*\/>/, '<selection activeCell="A1" sqref="A1"/>')

  return before + out.join('') + after
}

function fillDataRow(rowXml: string, rowNum: number, entry: AnnexDEntry | undefined, today: Date): string {
  const values = entry ? buildAnnexDRow(entry, rowNum - FIRST_DATA_ROW + 1, today) : {}
  let xml = rowXml
  for (const col of DATA_COLUMNS) xml = setCell(xml, `${col}${rowNum}`, values[col] ?? null)
  return xml
}

/** Keeps the workbook's filter range in step with the rows added below the table. */
export function fillAnnexDWorkbookXml(workbookXml: string, entries: AnnexDEntry[]): string {
  const extra = Math.max(0, entries.length - TEMPLATE_ROWS)
  if (extra === 0) return workbookXml
  return workbookXml.replace(/(<definedName [^>]*>)([^<]*)(<\/definedName>)/g, (_m, open: string, body: string, close: string) =>
    `${open}${shiftRefs(body, LAST_DATA_ROW + 1, extra)}${close}`,
  )
}

// ─── Build + download ───────────────────────────────────────────────────────

/** The filled ANNEX D workbook as an .xlsx Blob. */
export async function buildAnnexDXlsx(entries: AnnexDEntry[], today: Date = new Date()): Promise<Blob> {
  const [{ default: JSZip }, template] = await Promise.all([
    import('jszip'),
    fetch(templateUrl).then((res) => {
      if (!res.ok) throw new Error('Could not load the ANNEX D form.')
      return res.arrayBuffer()
    }),
  ])
  const zip = await JSZip.loadAsync(template)
  const sheet = await zip.file(SHEET_PATH)?.async('string')
  const workbook = await zip.file(WORKBOOK_PATH)?.async('string')
  if (!sheet || !workbook) throw new Error('The ANNEX D form file is damaged.')

  zip.file(SHEET_PATH, fillAnnexDSheet(sheet, entries, today))
  zip.file(WORKBOOK_PATH, fillAnnexDWorkbookXml(workbook, entries))

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** `ANNEX-D-TUPAD-Beneficiaries-2026-11-26.xlsx` (ISO date in file names, DESIGN.md §3.1). */
export function annexDFileName(today: Date = new Date()): string {
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return `ANNEX-D-TUPAD-Beneficiaries-${iso}.xlsx`
}

/** Fills the ANNEX D form with `entries` and downloads it. */
export async function downloadAnnexDXlsx(entries: AnnexDEntry[]): Promise<void> {
  const today = new Date()
  const blob = await buildAnnexDXlsx(entries, today)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = annexDFileName(today)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

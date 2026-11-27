import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { contactDigits, isValidContactNumber } from '@/helpers/common/contactNumberHelper'
import {
  beneficiaryTypeExportLabel,
  civilStatusCode,
  computeAge,
} from '@/helpers/common/dataEntryHelper'
import type { AnnexDEntry, AnnexDExportHighlight } from '@/types/common/dataEntry'
import type JSZipArchive from 'jszip'
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
 *
 * Highlighting: each highlight group (a colour + a reason) fills its entries' rows (columns B–Z) with its colour.
 * For every group colour, every cell style of the template gets a filled twin appended to `xl/styles.xml`, and a
 * highlighted cell swaps its `s` to that twin, so its font, border and number format stay the same. A "LEGEND"
 * block (colour swatch, reason, number of beneficiaries) is added two rows below the end of the form.
 *
 * Colour sheets: with highlight groups, the first sheet is renamed "All Beneficiaries" and every group gets its own
 * sheet (named "<Colour> - <reason>"): a full copy of the form (its own copy of the letterhead drawing, same
 * header, notes and certification) holding only that group's entries, numbered from 1, in its colour, with a
 * one-line legend.
 */

const SHEET_PATH = 'xl/worksheets/sheet1.xml'
const WORKBOOK_PATH = 'xl/workbook.xml'
const STYLES_PATH = 'xl/styles.xml'
const FIRST_DATA_ROW = 23
const LAST_DATA_ROW = 227
const TEMPLATE_ROWS = LAST_DATA_ROW - FIRST_DATA_ROW + 1
/** Columns of a data row that hold ANNEX D values (cleared in unused rows). */
const DATA_COLUMNS = 'BCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

type CellValue = string | number | null
/** Maps a cell's style index to the one it should use (identity for plain rows). */
type StyleMap = (style: string) => string
const keepStyle: StyleMap = (style) => style

/** The styles the legend block uses (indexes into `cellXfs`). */
export interface AnnexDLegendStyles {
  title: string
  header: string
  text: string
  count: string
  /** Swatch style of group k */
  swatch: (k: number) => string
}

/** The rows to highlight: entry id → style map of its group's colour, plus the legend to write. */
export interface AnnexDHighlight {
  styleOfEntry: (id: string) => StyleMap
  groups: AnnexDExportHighlight[]
  legend: AnnexDLegendStyles
}

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
 * ANNEX D row order: grouped by municipality (A–Z), and within each municipality by last name, first name,
 * middle name, extension (A–Z) across all its barangays. "No." runs continuously through the sheet.
 */
export function sortAnnexDEntries(entries: AnnexDEntry[]): AnnexDEntry[] {
  return [...entries].sort(
    (a, b) =>
      byText(a.municipality, b.municipality) ||
      byText(a.lastname, b.lastname) ||
      byText(a.firstname, b.firstname) ||
      byText(a.middlename, b.middlename) ||
      byText(a.extension_name, b.extension_name) ||
      a.id.localeCompare(b.id),
  )
}

// ─── Sheet XML editing ───────────────────────────────────────────────────────

const LEGEND_FONT = '<sz val="27"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/>'
/** Thin border on all four sides (the template's data-cell border) */
const LEGEND_BORDER_ID = 5

/**
 * Adds one solid fill per colour in `argbs` and, for each, a twin of every cell style that uses it (twin of style
 * i for colour k = xfCount × (k + 1) + i), plus the legend block's styles. Pure: returns the new styles XML.
 */
export function addAnnexDHighlightStyles(
  stylesXml: string,
  argbs: string[],
): { xml: string; twinOf: (k: number) => StyleMap; legend: AnnexDLegendStyles } {
  const fillsCount = Number(/<fills count="(\d+)"/.exec(stylesXml)?.[1] ?? NaN)
  const fontsCount = Number(/<fonts count="(\d+)"/.exec(stylesXml)?.[1] ?? NaN)
  const xfsBlock = /<cellXfs count="(\d+)">([\s\S]*?)<\/cellXfs>/.exec(stylesXml)
  if (!Number.isFinite(fillsCount) || !Number.isFinite(fontsCount) || !xfsBlock) {
    throw new Error('The ANNEX D form file is damaged.')
  }
  const xfCount = Number(xfsBlock[1])
  const baseXfs = xfsBlock[2].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g) ?? []
  const withFill = (xf: string, fillId: number) =>
    xf
      .replace(/\sfillId="\d+"/, ` fillId="${fillId}"`)
      .replace(/\sapplyFill="\d"/, '')
      .replace(/^<xf\b/, '<xf applyFill="1"')
  const twins = argbs.flatMap((_argb, k) => baseXfs.map((xf) => withFill(xf, fillsCount + k)))

  const fills = argbs
    .map((argb) => `<fill><patternFill patternType="solid"><fgColor rgb="${argb}"/><bgColor indexed="64"/></patternFill></fill>`)
    .join('')
  const fonts = `<font><b/>${LEGEND_FONT}</font><font>${LEGEND_FONT}</font>`
  const boldFont = fontsCount
  const plainFont = fontsCount + 1

  const legendBase = xfCount + twins.length
  const legendXfs = [
    `<xf numFmtId="0" fontId="${boldFont}" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>`,
    `<xf numFmtId="0" fontId="${boldFont}" fillId="0" borderId="${LEGEND_BORDER_ID}" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>`,
    `<xf numFmtId="0" fontId="${plainFont}" fillId="0" borderId="${LEGEND_BORDER_ID}" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>`,
    `<xf numFmtId="0" fontId="${plainFont}" fillId="0" borderId="${LEGEND_BORDER_ID}" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
    ...argbs.map(
      (_argb, k) =>
        `<xf numFmtId="0" fontId="0" fillId="${fillsCount + k}" borderId="${LEGEND_BORDER_ID}" xfId="0" applyFill="1" applyBorder="1"/>`,
    ),
  ]

  const xml = stylesXml
    .replace(/<fonts count="\d+"([^>]*)>([\s\S]*?)<\/fonts>/, (_m, attrs: string, body: string) =>
      `<fonts count="${fontsCount + 2}"${attrs}>${body}${fonts}</fonts>`,
    )
    .replace(/<fills count="\d+">([\s\S]*?)<\/fills>/, (_m, body: string) =>
      `<fills count="${fillsCount + argbs.length}">${body}${fills}</fills>`,
    )
    .replace(/<cellXfs count="\d+">([\s\S]*?)<\/cellXfs>/, (_m, body: string) =>
      `<cellXfs count="${legendBase + legendXfs.length}">${body}${twins.join('')}${legendXfs.join('')}</cellXfs>`,
    )
  return {
    xml,
    twinOf: (k) => (style) => String(xfCount * (k + 1) + Number(style)),
    legend: {
      title: String(legendBase),
      header: String(legendBase + 1),
      text: String(legendBase + 2),
      count: String(legendBase + 3),
      swatch: (k) => String(legendBase + 4 + k),
    },
  }
}

/** `<c r="REF" …/>` or `<c r="REF" …>…</c>` → the same cell with `value`, keeping its style (mapped by `styleOf`). */
function setCell(rowXml: string, ref: string, value: CellValue, styleOf: StyleMap = keepStyle): string {
  const pattern = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`)
  return rowXml.replace(pattern, (_match, attrs: string) => {
    const mapped = styleOf(/\ss="(\d+)"/.exec(attrs)?.[1] ?? '0')
    const s = mapped === '0' ? '' : ` s="${mapped}"`
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
export function fillAnnexDSheet(
  sheetXml: string,
  unsorted: AnnexDEntry[],
  today: Date,
  highlight?: AnnexDHighlight,
): string {
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
    else if (n >= FIRST_DATA_ROW && n <= LAST_DATA_ROW) out.push(fillDataRow(row, n, entries[n - FIRST_DATA_ROW], today, highlight))
    else if (n > LAST_DATA_ROW) out.push(extra > 0 ? shiftRow(row, LAST_DATA_ROW + 1, extra) : row)
    else out.push(row)

    if (n === LAST_DATA_ROW) {
      for (let i = 0; i < extra; i++) {
        const target = LAST_DATA_ROW + 1 + i
        out.push(fillDataRow(cloneDataRow(lastTemplateRow, target), target, entries[TEMPLATE_ROWS + i], today, highlight))
      }
    }
  }

  let before = sheetXml.slice(0, start)
  let after = sheetXml.slice(end)

  // Legend two rows below the end of the form (after any added rows)
  const lastRow = Math.max(0, ...rows.map(rowNumber)) + extra
  const legend = highlight && highlight.groups.length > 0 ? buildLegendRows(lastRow + 2, entries, highlight) : null
  if (legend) out.push(...legend.rows)

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
  // After the shift above: the legend's rows are already at their final numbers
  if (legend) {
    before = before.replace(/(<dimension ref="[A-Z]+\d+:[A-Z]+)\d+"/, `$1${legend.lastRow}"`)
    after = after.replace(/<mergeCells count="(\d+)">([\s\S]*?)<\/mergeCells>/, (_m, count: string, body: string) =>
      `<mergeCells count="${Number(count) + legend.merges.length}">${body}${legend.merges.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`,
    )
  }
  // Open at the top of the form (the blank form was saved scrolled to row 217)
  before = before.replace(/\stopLeftCell="[^"]*"/, ' topLeftCell="A1"').replace(/<selection [^>]*\/>/, '<selection activeCell="A1" sqref="A1"/>')

  return before + out.join('') + after
}

function fillDataRow(
  rowXml: string,
  rowNum: number,
  entry: AnnexDEntry | undefined,
  today: Date,
  highlight?: AnnexDHighlight,
): string {
  const values = entry ? buildAnnexDRow(entry, rowNum - FIRST_DATA_ROW + 1, today) : {}
  const styleOf = entry && highlight ? highlight.styleOfEntry(entry.id) : keepStyle
  let xml = rowXml
  for (const col of DATA_COLUMNS) xml = setCell(xml, `${col}${rowNum}`, values[col] ?? null, styleOf)
  return xml
}

/** Legend columns: B = swatch, C–H (merged) = reason, I = number of beneficiaries. */
const LEGEND_REASON_COLS = ['C', 'D', 'E', 'F', 'G', 'H']
const LEGEND_COUNT_COL = 'I'
/** About how many characters of the reason fit on one line of the merged C–H cell */
const LEGEND_CHARS_PER_LINE = 90
const LEGEND_LINE_HEIGHT = 40

function legendCell(ref: string, style: string, value: CellValue = null): string {
  if (value === null || value === '') return `<c r="${ref}" s="${style}"/>`
  if (typeof value === 'number') return `<c r="${ref}" s="${style}"><v>${value}</v></c>`
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

function legendRow(n: number, height: number, cells: string[]): string {
  return `<row r="${n}" ht="${height}" customHeight="1">${cells.join('')}</row>`
}

/** The "LEGEND" block from row `startRow`: title, column headers, one line per group, and the total. */
function buildLegendRows(
  startRow: number,
  entries: AnnexDEntry[],
  highlight: AnnexDHighlight,
): { rows: string[]; merges: string[]; lastRow: number } {
  const { legend, groups } = highlight
  const exported = new Set(entries.map((e) => e.id))
  const rows: string[] = []
  const merges: string[] = []
  const reasonCells = (row: number, style: string, value: string | null) =>
    LEGEND_REASON_COLS.map((col, i) => legendCell(`${col}${row}`, style, i === 0 ? value : null))
  let n = startRow

  rows.push(legendRow(n, LEGEND_LINE_HEIGHT, [legendCell(`B${n}`, legend.title, 'LEGEND:')]))
  n++

  rows.push(
    legendRow(n, LEGEND_LINE_HEIGHT, [
      legendCell(`B${n}`, legend.header, 'Color'),
      ...reasonCells(n, legend.header, 'Reason'),
      legendCell(`${LEGEND_COUNT_COL}${n}`, legend.header, 'No. of Beneficiaries'),
    ]),
  )
  merges.push(`C${n}:H${n}`)
  n++

  let total = 0
  groups.forEach((group, k) => {
    const count = [...group.ids].filter((id) => exported.has(id)).length
    total += count
    const lines = Math.max(1, Math.ceil(group.reason.length / LEGEND_CHARS_PER_LINE))
    rows.push(
      legendRow(n, LEGEND_LINE_HEIGHT * lines, [
        legendCell(`B${n}`, legend.swatch(k)),
        ...reasonCells(n, legend.text, group.reason),
        legendCell(`${LEGEND_COUNT_COL}${n}`, legend.count, count),
      ]),
    )
    merges.push(`C${n}:H${n}`)
    n++
  })

  rows.push(
    legendRow(n, LEGEND_LINE_HEIGHT, [
      legendCell(`B${n}`, legend.header),
      ...reasonCells(n, legend.header, 'Total highlighted'),
      legendCell(`${LEGEND_COUNT_COL}${n}`, legend.header, total),
    ]),
  )
  merges.push(`C${n}:H${n}`)

  return { rows, merges, lastRow: n }
}

/** Keeps the workbook's filter range in step with the rows added below the table. */
export function fillAnnexDWorkbookXml(workbookXml: string, entries: AnnexDEntry[]): string {
  const extra = Math.max(0, entries.length - TEMPLATE_ROWS)
  if (extra === 0) return workbookXml
  return workbookXml.replace(/(<definedName [^>]*>)([^<]*)(<\/definedName>)/g, (_m, open: string, body: string, close: string) =>
    `${open}${shiftRefs(body, LAST_DATA_ROW + 1, extra)}${close}`,
  )
}

// ─── Colour sheets ──────────────────────────────────────────────────────────

const MAIN_SHEET_NAME = 'All Beneficiaries'
const CONTENT_TYPES_PATH = '[Content_Types].xml'
const WORKBOOK_RELS_PATH = 'xl/_rels/workbook.xml.rels'
const SHEET_RELS_PATH = 'xl/worksheets/_rels/sheet1.xml.rels'
const DRAWING_PATH = 'xl/drawings/drawing1.xml'
const DRAWING_RELS_PATH = 'xl/drawings/_rels/drawing1.xml.rels'
const APP_PATH = 'docProps/app.xml'
const WORKSHEET_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'
const DRAWING_TYPE = 'application/vnd.openxmlformats-officedocument.drawing+xml'
const WORKSHEET_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet'
const SHEET_NAME_MAX = 31

/** A sheet to add after the first one: its name, filled XML and how many rows were added below row 227. */
interface AnnexDExtraSheet {
  name: string
  xml: string
  extra: number
}

/** An Excel sheet name: ≤ 31 characters, none of : \ / ? * [ ], not blank, unique (case-insensitive) in `taken`. */
export function annexDSheetName(base: string, taken: Set<string>): string {
  const clean = base.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^'+|'+$/g, '') || 'Sheet'
  let name = clean.slice(0, SHEET_NAME_MAX).trim()
  for (let n = 2; taken.has(name.toLowerCase()); n++) {
    const suffix = ` (${n})`
    name = clean.slice(0, SHEET_NAME_MAX - suffix.length).trim() + suffix
  }
  taken.add(name.toLowerCase())
  return name
}

/** `'Sheet name'` as a formula reference (apostrophes doubled), XML-escaped for a definedName body. */
const sheetRef = (name: string) => escapeXml(`'${name.replace(/'/g, "''")}'`)

/**
 * Adds `sheets` after the first sheet (renamed "All Beneficiaries"): each one gets its own worksheet part, a copy
 * of the letterhead drawing, its relationships, a content-type entry, a filter range and a title in app.xml.
 */
async function addAnnexDSheets(
  zip: JSZipArchive,
  templateWorkbook: string,
  workbookXml: string,
  sheets: AnnexDExtraSheet[],
): Promise<string> {
  const read = async (path: string) => {
    const text = await zip.file(path)?.async('string')
    if (!text) throw new Error('The ANNEX D form file is damaged.')
    return text
  }
  const [contentTypes, workbookRels, sheetRels, drawing, drawingRels] = await Promise.all([
    read(CONTENT_TYPES_PATH),
    read(WORKBOOK_RELS_PATH),
    read(SHEET_RELS_PATH),
    read(DRAWING_PATH),
    read(DRAWING_RELS_PATH),
  ])
  const app = await zip.file(APP_PATH)?.async('string')

  // The form's filter range (B4:Z248 in the template), moved down by each sheet's added rows
  const filterRange = /!(\$B\$\d+:\$Z\$\d+)</.exec(templateWorkbook)?.[1] ?? '$B$4:$Z$248'
  const firstSheetId = Math.max(0, ...[...workbookXml.matchAll(/<sheet [^>]*?sheetId="(\d+)"/g)].map((m) => Number(m[1]))) + 1

  let wb = workbookXml
    .replace(/(<sheet [^>]*?name=")[^"]*"/, `$1${escapeXml(MAIN_SHEET_NAME)}"`)
    .replace(/(<definedName [^>]*localSheetId="0"[^>]*>)[^<!]*!/, `$1${sheetRef(MAIN_SHEET_NAME)}!`)
  let rels = workbookRels
  let types = contentTypes
  const sheetTags: string[] = []
  const filterNames: string[] = []

  sheets.forEach((sheet, i) => {
    const n = i + 2
    const relId = `rIdAnnexD${n}`
    zip.file(`xl/worksheets/sheet${n}.xml`, sheet.xml)
    zip.file(`xl/worksheets/_rels/sheet${n}.xml.rels`, sheetRels.replace('../drawings/drawing1.xml', `../drawings/drawing${n}.xml`))
    zip.file(`xl/drawings/drawing${n}.xml`, drawing)
    zip.file(`xl/drawings/_rels/drawing${n}.xml.rels`, drawingRels)
    rels = rels.replace('</Relationships>', `<Relationship Id="${relId}" Type="${WORKSHEET_REL}" Target="worksheets/sheet${n}.xml"/></Relationships>`)
    types = types.replace(
      '</Types>',
      `<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="${WORKSHEET_TYPE}"/>` +
        `<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="${DRAWING_TYPE}"/></Types>`,
    )
    sheetTags.push(`<sheet name="${escapeXml(sheet.name)}" sheetId="${firstSheetId + i}" r:id="${relId}"/>`)
    const range = sheet.extra > 0 ? shiftRefs(filterRange, LAST_DATA_ROW + 1, sheet.extra) : filterRange
    filterNames.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i + 1}" hidden="1">${sheetRef(sheet.name)}!${range}</definedName>`)
  })

  wb = wb.replace('</sheets>', `${sheetTags.join('')}</sheets>`)
  wb = wb.includes('</definedNames>')
    ? wb.replace('</definedNames>', `${filterNames.join('')}</definedNames>`)
    : wb.replace('</sheets>', `</sheets><definedNames>${filterNames.join('')}</definedNames>`)
  zip.file(WORKBOOK_RELS_PATH, rels)
  zip.file(CONTENT_TYPES_PATH, types)

  // Sheet titles shown in File → Info (Excel reads the sheets from workbook.xml either way)
  if (app) {
    const titles = [MAIN_SHEET_NAME, ...sheets.map((sh) => sh.name)]
    zip.file(
      APP_PATH,
      app
        .replace(/(<HeadingPairs>[\s\S]*?<vt:i4>)\d+(<\/vt:i4>)/, `$1${titles.length}$2`)
        .replace(
          /<TitlesOfParts>[\s\S]*?<\/TitlesOfParts>/,
          `<TitlesOfParts><vt:vector size="${titles.length}" baseType="lpstr">${titles.map((t) => `<vt:lpstr>${escapeXml(t)}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts>`,
        ),
    )
  }
  return wb
}

// ─── Build + download ───────────────────────────────────────────────────────

/**
 * The filled ANNEX D workbook as an .xlsx Blob. Each highlight group's rows get its colour, with a legend, and
 * each group also gets its own sheet listing only its entries (same form).
 */
export async function buildAnnexDXlsx(
  entries: AnnexDEntry[],
  today: Date = new Date(),
  highlights: AnnexDExportHighlight[] = [],
): Promise<Blob> {
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

  let highlight: AnnexDHighlight | undefined
  const colourSheets: AnnexDExtraSheet[] = []
  const exported = new Set(entries.map((e) => e.id))
  const groups = highlights.filter((g) => [...g.ids].some((id) => exported.has(id)))
  if (groups.length > 0) {
    const styles = await zip.file(STYLES_PATH)?.async('string')
    if (!styles) throw new Error('The ANNEX D form file is damaged.')
    const { xml, twinOf, legend } = addAnnexDHighlightStyles(styles, groups.map((g) => g.argb))
    zip.file(STYLES_PATH, xml)
    const groupOf = new Map<string, number>()
    groups.forEach((g, k) => g.ids.forEach((id) => groupOf.set(id, k)))
    const maps = groups.map((_g, k) => twinOf(k))
    highlight = {
      styleOfEntry: (id) => {
        const k = groupOf.get(id)
        return k === undefined ? keepStyle : maps[k]
      },
      groups,
      legend,
    }

    // One sheet per colour: the same form with only that group's entries (not selected, so tabs aren't grouped)
    const taken = new Set([MAIN_SHEET_NAME.toLowerCase()])
    groups.forEach((group, k) => {
      const members = entries.filter((e) => group.ids.has(e.id))
      const own: AnnexDHighlight = {
        styleOfEntry: (id) => (group.ids.has(id) ? maps[k] : keepStyle),
        groups: [group],
        legend: { ...legend, swatch: () => legend.swatch(k) },
      }
      colourSheets.push({
        name: annexDSheetName(`${group.label} - ${group.reason}`, taken),
        xml: fillAnnexDSheet(sheet, members, today, own).replace(/\stabSelected="1"/, ''),
        extra: Math.max(0, members.length - TEMPLATE_ROWS),
      })
    })
  }

  zip.file(SHEET_PATH, fillAnnexDSheet(sheet, entries, today, highlight))
  let workbookXml = fillAnnexDWorkbookXml(workbook, entries)
  if (colourSheets.length > 0) workbookXml = await addAnnexDSheets(zip, workbook, workbookXml, colourSheets)
  zip.file(WORKBOOK_PATH, workbookXml)

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

/** Fills the ANNEX D form with `entries` (each highlight group's rows coloured, with a legend) and downloads it. */
export async function downloadAnnexDXlsx(
  entries: AnnexDEntry[],
  highlights: AnnexDExportHighlight[] = [],
): Promise<void> {
  const today = new Date()
  const blob = await buildAnnexDXlsx(entries, today, highlights)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = annexDFileName(today)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

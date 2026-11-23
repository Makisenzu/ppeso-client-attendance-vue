/**
 * The GIP ID card, ported from vue-agsurjobs (laid out from its GIP_ID.docx template, measured from Word's own
 * rendering). Pure functions: the composable supplies text measuring and does the printing.
 *
 * The sheet is two copies of one card, 3.408 × 4.871 in each, at their places on Letter landscape; print at 100%
 * (Actual size). A card is the template's background with the PGAS seal, the QR code and the washed-out PESO logo
 * placed over it, then four centred lines in Calibri Bold (Carlito, its metric twin, when Calibri isn't installed):
 *
 *   "NICKNAME"            34 pt, drop shadow        (above the red band)
 *   FULL NAME              18 pt, drop shadow        (on the red band)
 *   Administrative Aide    14 pt
 *   OFFICE                 24 pt, drop shadow
 *
 * Positions are in points from the card's top-left corner; text is placed by its baseline. Official printed
 * document: fixed black-on-white colours, as on paper.
 */

export interface IdCardData {
  nickname: string
  fullName: string
  position: string
  office: string
  /** A data: URL of the uploaded photo (never stored), or null for an empty frame */
  photoUrl: string | null
}

/** Measures `text` in Calibri / Carlito Bold at `fontSizePt`, returning its width in points */
export type MeasureText = (text: string, fontSizePt: number) => number

export const ID_CARD_POSITION = 'Administrative Aide'
export const ID_NICKNAME_MAX = 20
export const ID_FONT_FAMILY = 'Calibri, Carlito, sans-serif'
/** Carlito (metric-compatible with Calibri) for browsers without Calibri; loads no personal data */
export const ID_CARLITO_CSS = 'https://fonts.googleapis.com/css2?family=Carlito:wght@700&display=swap'

const ASSET_PATH = '/templates/gip-id'

// ─── Template geometry (pt) ───

const CARD = { width: 245.4, height: 350.7 }
/** One card's size in points (72 per inch), for exporting it as an image */
export const ID_CARD_SIZE_PT = CARD

/** Where the two copies sit from the paper's top-left (the printed page is only as big as the cards) */
const CARD_SLOTS = [
  { left: 72, top: 69.72 },
  { left: 322.85, top: 69.6 },
] as const

const IMAGES = {
  seal: { x: 6.75, y: 5.63, size: 52.5 },
  qr: { x: 6.765, y: 95.678, width: 57.05, height: 57.0 },
  pesoLogo: { x: 179.95, y: 92.93, size: 60 },
  /** Inside the background's black photo frame */
  photo: { x: 71.33, y: 55.67, width: 105.03, height: 130.65 },
}

interface TextLine {
  centerX: number
  baseline: number
  size: number
  /** Longer text is scaled down to fit on one line */
  maxWidth: number
  shadow: boolean
}

const TEXT = {
  nickname: { centerX: 123.18, baseline: 217.92, size: 34, maxWidth: 145.5, shadow: true },
  fullName: { centerX: 122.7, baseline: 244.42, size: 18, maxWidth: 231, shadow: true },
  position: { centerX: 122.25, baseline: 270.53, size: 14, maxWidth: 230.1, shadow: false },
  office: { centerX: 122.25, baseline: 306.4, size: 24, maxWidth: 230.1, shadow: true },
} satisfies Record<string, TextLine>

/** 3 pt blur, 1.5 pt away at 45°, black at 60% */
const SHADOW = { offset: 1.06, blur: 1.5, opacity: 0.6 }

// ─── Text ───

const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()

/** “KATE” */
export const formatIdNickname = (nickname: string) => `“${clean(nickname).toUpperCase()}”`

/** JUAN S. DELA CRUZ: first name, middle initial, surname */
export function formatIdFullName(
  firstname: string | null | undefined,
  middlename: string | null | undefined,
  lastname: string | null | undefined,
): string {
  const middle = clean(middlename)
  return [clean(firstname), middle ? `${middle.charAt(0)}.` : '', clean(lastname)].filter(Boolean).join(' ').toUpperCase()
}

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** The font size that keeps the text within the line's width (never larger than the template's) */
function fittedSize(text: string, line: TextLine, measure: MeasureText): number {
  const width = measure(text, line.size)
  return width > line.maxWidth ? Math.floor((line.size * line.maxWidth * 100) / width) / 100 : line.size
}

function textElement(text: string, line: TextLine, shadowId: string, measure: MeasureText): string {
  const size = fittedSize(text, line, measure)
  return (
    `<text x="${line.centerX}" y="${line.baseline}" text-anchor="middle" font-family="${ID_FONT_FAMILY}" font-weight="700" ` +
    `font-size="${size}" fill="#000" style="font-kerning:none;font-variant-ligatures:none"` +
    `${line.shadow ? ` filter="url(#${shadowId})"` : ''}>${escapeXml(text)}</text>`
  )
}

// ─── Card & sheet ───

/**
 * One card as SVG, sized in points. `origin` (window.location.origin) resolves the template images;
 * `key` keeps element ids apart when several cards share a page. `fontCss` (an @font-face with the font inlined) is
 * embedded for the downloaded image: an SVG drawn as an image can't use the page's fonts.
 */
export function buildIdCardSvg(
  data: IdCardData,
  measure: MeasureText,
  origin: string,
  key = 'gip-id',
  fontCss = '',
): string {
  const shadowId = `${key}-shadow`
  const photoClipId = `${key}-photo`
  const asset = (name: string) => `${origin}${ASSET_PATH}/${name}`
  const { seal, qr, pesoLogo, photo } = IMAGES
  const image = (href: string, x: number, y: number, width: number, height: number, extra = '') =>
    `<image href="${escapeXml(href)}" x="${x}" y="${y}" width="${width}" height="${height}"${extra}/>`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD.width} ${CARD.height}" width="${CARD.width}pt" height="${CARD.height}pt">`,
    '<defs>',
    fontCss ? `<style>${escapeXml(fontCss)}</style>` : '',
    `<filter id="${shadowId}" x="-10%" y="-40%" width="120%" height="180%" color-interpolation-filters="sRGB">`,
    `<feDropShadow dx="${SHADOW.offset}" dy="${SHADOW.offset}" stdDeviation="${SHADOW.blur}" flood-color="#000" flood-opacity="${SHADOW.opacity}"/>`,
    '</filter>',
    `<clipPath id="${photoClipId}"><rect x="${photo.x}" y="${photo.y}" width="${photo.width}" height="${photo.height}"/></clipPath>`,
    '</defs>',
    image(asset('background.jpg'), 0, 0, CARD.width, CARD.height, ' preserveAspectRatio="none"'),
    data.photoUrl
      ? image(data.photoUrl, photo.x, photo.y, photo.width, photo.height, ` preserveAspectRatio="xMidYMid slice" clip-path="url(#${photoClipId})"`)
      : '',
    image(asset('qr.png'), qr.x, qr.y, qr.width, qr.height, ' preserveAspectRatio="none"'),
    image(asset('peso-logo.png'), pesoLogo.x, pesoLogo.y, pesoLogo.size, pesoLogo.size),
    image(asset('seal.png'), seal.x, seal.y, seal.size, seal.size),
    textElement(formatIdNickname(data.nickname), TEXT.nickname, shadowId, measure),
    textElement(data.fullName, TEXT.fullName, shadowId, measure),
    textElement(data.position, TEXT.position, shadowId, measure),
    textElement(data.office, TEXT.office, shadowId, measure),
    '</svg>',
  ].join('')
}

/** `GIP-ID-JUAN-S-DELA-CRUZ.pdf` */
export const idCardFileName = (fullName: string) =>
  `GIP-ID-${clean(fullName).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'card'}.pdf`

/** Letter landscape, the paper the print sheet is laid out on (pt) */
const LETTER_LANDSCAPE = { width: 792, height: 612 }

/**
 * The downloadable PDF: the print sheet as one Letter-landscape page, with the card image (a JPEG of one card)
 * drawn at both copies' places, so it prints exactly like Print. A minimal hand-written PDF, no library.
 */
export function buildIdCardSheetPdf(jpeg: Uint8Array, widthPx: number, heightPx: number): Blob {
  const page = LETTER_LANDSCAPE
  const content = CARD_SLOTS.map(
    (slot) =>
      `q ${CARD.width} 0 0 ${CARD.height} ${slot.left} ${(page.height - slot.top - CARD.height).toFixed(2)} cm /Card Do Q`,
  ).join('\n')

  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part
    parts.push(bytes)
    length += bytes.length
  }
  const object = (body: string) => {
    offsets.push(length)
    push(`${offsets.length} 0 obj\n${body}\nendobj\n`)
  }

  push('%PDF-1.4\n')
  object('<< /Type /Catalog /Pages 2 0 R >>')
  object('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  object(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] ` +
      '/Resources << /XObject << /Card 5 0 R >> >> /Contents 4 0 R >>',
  )
  object(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`)
  offsets.push(length)
  push(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB ` +
      `/BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  )
  push(jpeg)
  push('\nendstream\nendobj\n')

  const xref = length
  push(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`)
  offsets.forEach((offset) => push(`${String(offset).padStart(10, '0')} 00000 n \n`))
  push(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}

/** The print document: two copies of the card at the template's places, landscape, no margins */
export function buildIdCardSheetHtml(data: IdCardData, measure: MeasureText, origin: string): string {
  const sheetWidth = Math.max(...CARD_SLOTS.map((slot) => slot.left)) + CARD.width
  const sheetHeight = Math.max(...CARD_SLOTS.map((slot) => slot.top)) + CARD.height
  const cards = CARD_SLOTS.map(
    (slot, index) =>
      `<div class="card" style="left:${slot.left}pt;top:${slot.top}pt">${buildIdCardSvg(data, measure, origin, `gip-id-${index}`)}</div>`,
  ).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>GIP ID</title>
<link rel="stylesheet" href="${ID_CARLITO_CSS}">
<style>
  @page { size: landscape; margin: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .sheet { position: relative; width: ${sheetWidth}pt; height: ${sheetHeight}pt; }
  .card { position: absolute; width: ${CARD.width}pt; height: ${CARD.height}pt; }
  .card svg { display: block; }
</style></head><body><div class="sheet">${cards}</div></body></html>`
}

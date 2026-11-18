import type { ReportDay, ReportPrintContext, ReportPrintData } from '@/types/common/accomplishment'
import {
  bulletLines,
  daysBetween,
  formatLongDate,
  formatPesoAmount,
  formatReceiptPeriod,
  formatReportPeriod,
  isWeekendIso,
  weekdayName,
} from '@/helpers/common/accomplishmentHelper'

/**
 * The printable accomplishment report on the funding's own form, as a standalone HTML document for the browser's
 * print dialog (Print → Save as PDF also works). Ported from vue-agsurjobs' report templates:
 *   DOLE — GIP Work Accomplishment Report: DOLE letterhead, every day of the dates with what was done
 *   PGAS — Accomplishment Report: Activities / Output / Remarks + Acknowledgement Receipt of Payment
 * Long reports flow onto the next page; table headers repeat. Official forms use fixed black-on-white colors.
 */

const escapeHtml = (value: string | null | undefined) =>
  (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const BASE_STYLES = `
  @page { size: A4 portrait; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  .keep { page-break-inside: avoid; }
`

// ─── DOLE: GIP Work Accomplishment Report ───

const DOLE_STYLES = `
  body { font-family: Calibri, Carlito, 'Segoe UI', Arial, sans-serif; font-size: 13px; padding: 0 28px; }
  .letterhead { display: flex; align-items: center; justify-content: center; gap: 18px; padding-bottom: 8px; }
  .letterhead img { height: 84px; width: auto; object-fit: contain; }
  .letterhead .seal-right { height: 74px; }
  .letterhead .agency { text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 15px; line-height: 1.2; }
  .letterhead .agency b { font-size: 16px; }
  .title { text-align: center; line-height: 1.35; margin: 18px 0 22px; }
  .title b { font-size: 14px; }
  .identity { line-height: 1.5; margin-bottom: 12px; }
  table.report { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.report td { border: 1px solid #000; vertical-align: top; padding: 2px 8px; line-height: 1.4; text-transform: uppercase; }
  table.report td.date { text-align: center; white-space: nowrap; }
  table.report ul { margin: 0; padding: 0; list-style: none; }
  table.report li { position: relative; padding-left: 24px; }
  table.report li::before { content: '\\27A2'; position: absolute; left: 4px; }
  table.report .off { color: #e00000; }
  .closing { margin-top: 28px; line-height: 1.45; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; column-gap: 40px; margin-top: 30px; }
  .label { margin-bottom: 40px; }
  .name { font-weight: bold; text-transform: uppercase; }
  .name.underline { text-decoration: underline; }
  .approved { margin-top: 34px; }
  .footer { display: flex; align-items: flex-end; gap: 40px; margin-top: 36px; padding-left: 40px;
            font-family: 'Times New Roman', Times, serif; font-size: 11px; line-height: 1.25; }
  .footer img { height: 42px; width: auto; }
`

function doleDayRow(date: string, day: ReportDay | undefined): string {
  const dateCell = `<td class="date">${escapeHtml(formatLongDate(date))}</td>`
  if (isWeekendIso(date)) {
    return `<tr>${dateCell}<td><ul><li class="off">${weekdayName(date)}</li></ul></td></tr>`
  }
  if (!day) return `<tr>${dateCell}<td>&nbsp;</td></tr>`

  const items = bulletLines(day.entry).map((line) => `<li>${escapeHtml(line)}</li>`)
  if (day.status === 'Holiday') items.unshift('<li class="off">HOLIDAY</li>')
  if (day.status === 'Leave') items.unshift('<li class="off">ON LEAVE</li>')
  return `<tr>${dateCell}<td><ul>${items.join('') || '&nbsp;'}</ul></td></tr>`
}

function doleBody(data: ReportPrintData, ctx: ReportPrintContext, origin: string): string {
  const byDate = new Map(data.dailyEntries.map((day) => [day.date, day]))
  const rows = daysBetween(ctx.from, ctx.to).map((date) => doleDayRow(date, byDate.get(date)))
  const img = (path: string) => `${origin}${path}`

  return `
    <div class="letterhead">
      <img src="${img('/images/dole.png')}" alt="DOLE">
      <div class="agency">Republic of the Philippines<br><b>DEPARTMENT OF LABOR AND EMPLOYMENT</b><br>CARAGA Regional Office<br><b>Agusan del Sur Provincial Office</b></div>
      <img class="seal-right" src="${img('/images/bagongPilipinas.png')}" alt="Bagong Pilipinas">
    </div>
    <div class="title"><b>GIP WORK ACCOMPLISHMENT REPORT</b><br>For the period of <b>${escapeHtml(formatReportPeriod(ctx.from, ctx.to).toUpperCase())}</b></div>
    <div class="identity">NAME: ${escapeHtml(ctx.name.toUpperCase())}<br>OFFICE ASSIGNMENT: ${escapeHtml(ctx.office.toUpperCase())}</div>
    <table class="report"><colgroup><col style="width:24%"><col></colgroup><tbody>${rows.join('')}</tbody></table>
    <div class="closing keep">I hereby certify that the above report is true and correct. This report is prepared to support my claim of salary within the period started.</div>
    <div class="signatures keep">
      <div><div class="label">Prepared by:</div>
        <div class="name underline">${escapeHtml(ctx.name) || 'NAME OF GIP'}</div><div style="padding-left:40px">GIP</div></div>
      <div><div class="label">Noted by:</div>
        <div class="name">${escapeHtml(data.supervisorName) || 'NAME OF SUPERVISOR'}</div><div style="padding-left:12px">SUPERVISOR</div></div>
    </div>
    <div class="approved keep"><div class="label">Approved by:</div>
      <div class="name">${escapeHtml(data.approverName) || 'NAME OF OFFICE HEAD'}</div>
      <div style="text-transform:uppercase">${escapeHtml(data.approverPosition) || 'POSITION OF OFFICE HEAD'}</div></div>
    <div class="footer keep">
      <img src="${img('/images/isoSeal.png')}" alt="ISO 9001:2015">
      <div>Address:&nbsp; 2f D'Survi Bldg. Brgy.3 San Francisco, Agusan del Sur<br>Tel. No:&nbsp;&nbsp; (085) 839-5932<br>Email&nbsp;&nbsp;&nbsp; : dole_ads@yahoo.com</div>
    </div>`
}

// ─── PGAS: Accomplishment Report + Acknowledgement Receipt of Payment ───

const PGAS_STYLES = `
  body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; padding: 24px 48px; }
  .province { text-align: center; line-height: 1.3; }
  .province .pname { font-size: 16px; font-variant: small-caps; letter-spacing: 0.3px; }
  .title { text-align: center; margin-top: 16px; line-height: 1.25; }
  .title b { font-size: 17px; }
  .identity { margin: 16px 0 20px; line-height: 1.6; }
  .identity .line { display: inline-block; min-width: 360px; border-bottom: 1px solid #000; padding: 0 4px; }
  table.report { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.report th { border: 1px solid #000; padding: 4px 6px; font-weight: bold; text-align: center; }
  table.report td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; line-height: 1.35; white-space: pre-line; height: 38px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; column-gap: 48px; margin-top: 24px; }
  .slabel { font-weight: bold; margin-bottom: 32px; }
  .sline { border-bottom: 1.5px solid #000; min-height: 20px; text-align: center; font-weight: bold; text-transform: uppercase; padding: 0 4px; }
  .role { text-align: center; font-style: italic; }
  .certify { margin-top: 18px; font-style: italic; text-indent: 48px; line-height: 1.35; }
  .approved { display: grid; grid-template-columns: 1fr 1fr; column-gap: 48px; margin-top: 8px; }
  .receipt-title { text-align: center; font-weight: bold; margin-top: 52px; }
  .receipt { margin-top: 16px; text-indent: 48px; line-height: 1.5; text-align: justify; }
  .receipt u { font-weight: bold; }
  .receipt-sign { display: grid; grid-template-columns: 1fr 1fr; column-gap: 48px; margin-top: 56px; }
`

function pgasBody(data: ReportPrintData, ctx: ReportPrintContext): string {
  // At least the template's four rows, so a short report still looks like the form
  const rows = data.activities.map(
    (row) =>
      `<tr><td>${escapeHtml(row.activity)}</td><td>${escapeHtml(row.output)}</td><td style="text-align:center">${escapeHtml(row.remarks)}</td></tr>`,
  )
  while (rows.length < 4) rows.push('<tr><td></td><td></td><td></td></tr>')

  const amount = formatPesoAmount(data.amount)
  const words = (data.amountInWords ?? '').trim().toUpperCase()

  return `
    <div class="province"><div class="pname">PROVINCE OF AGUSAN DEL SUR</div>Gov. Democrito O. Plaza Government Center, Prosperidad</div>
    <div class="title"><b>ACCOMPLISHMENT REPORT</b><br><i>For the period of <b><u>${escapeHtml(formatReportPeriod(ctx.from, ctx.to))}</u></b></i></div>
    <div class="identity">
      Name: <span class="line">${escapeHtml(ctx.name)}</span><br>
      Designation: <span class="line">${escapeHtml(data.designation)}</span><br>
      Office: <span class="line">${escapeHtml(ctx.office)}</span>
    </div>
    <table class="report">
      <colgroup><col style="width:51%"><col style="width:30%"><col style="width:19%"></colgroup>
      <thead><tr><th>ACTIVITIES</th><th>OUTPUT</th><th>REMARKS</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
    <div class="signatures keep">
      <div><div class="slabel">Prepared by:</div><div class="sline">${escapeHtml(ctx.name)}</div><div class="role">GIP</div></div>
      <div><div class="slabel">Reviewed by:</div><div class="sline">${escapeHtml(data.supervisorName)}</div><div class="role">Supervisor</div></div>
    </div>
    <div class="keep">
      <div class="certify">I certify that the above listed activities/task/output had been accomplished by the named employee in compliance with the agreed conditions and is/are officially accepted by this office.</div>
      <div class="approved"><div></div><div><div class="slabel">Approved by:</div>
        <div class="sline">${escapeHtml(data.approverName)}</div><div class="role">${escapeHtml(data.approverPosition)}</div></div></div>
    </div>
    <div class="keep">
      <div class="receipt-title">ACKNOWLEDGEMENT RECEIPT OF PAYMENT</div>
      <div class="receipt">I hereby acknowledge the receipt of the sum of
        <u>${escapeHtml(words) || '&nbsp;'.repeat(40)}</u> <b>(${escapeHtml(amount) || '&nbsp;'.repeat(12)})</b>
        as payment for my services rendered for the period of <u>${escapeHtml(formatReceiptPeriod(ctx.from, ctx.to))}.</u></div>
      <div class="receipt-sign"><div></div><div><div class="sline">${escapeHtml(ctx.name)}</div><div class="role" style="font-style:normal">GIP</div></div></div>
    </div>`
}

/**
 * A complete HTML document of the report on its funding's form.
 * `origin` (e.g. window.location.origin) resolves the letterhead images.
 */
export function buildAccomplishmentDocument(data: ReportPrintData, ctx: ReportPrintContext, origin: string): string {
  const isDole = data.funding === 'DOLE'
  const title = `Accomplishment Report - ${ctx.name} (${formatReportPeriod(ctx.from, ctx.to)})`
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>${BASE_STYLES}${isDole ? DOLE_STYLES : PGAS_STYLES}</style></head>
    <body>${isDole ? doleBody(data, ctx, origin) : pgasBody(data, ctx)}</body></html>`
}

import type { AttendanceRecord } from '@/types/peso/attendance'
import type { DtrDayRow, DtrGenerationResult, DtrOptions } from '@/types/peso/dtr'

/**
 * Formats a raw time string (e.g. "07:36:00", "07:36", "17:16:00", "2026-06-01T07:36:00Z")
 * into the exact format seen in Civil Service Form 48:
 * - 12-hour format without leading zero (e.g. "7:36", "12:16", "12:45", "5:16")
 * - No "AM" or "PM" text since the column headers already specify A.M. and P.M.
 */
export function formatDtrTime(timeStr?: string | null): string {
  if (!timeStr) return ''
  const trimmed = timeStr.trim()
  if (!trimmed || trimmed === '—') return ''

  // Format HH:mm:ss or HH:mm
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const [h, m] = trimmed.split(':').map(Number)
    const hour12 = h % 12 || 12
    return `${hour12}:${String(m).padStart(2, '0')}`
  }

  // ISO timestamp or Date parseable
  try {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      const h = d.getHours()
      const m = d.getMinutes()
      const hour12 = h % 12 || 12
      return `${hour12}:${String(m).padStart(2, '0')}`
    }
  } catch {
    return ''
  }

  return ''
}

/**
 * Calculates undertime (tardiness or early departure) in minutes
 * Standard Philippine Civil Service official hours:
 * Morning: 8:00 AM to 12:00 PM
 * Afternoon: 1:00 PM to 5:00 PM
 */
export function calculateUndertimeMinutes(
  amIn?: string | null,
  amOut?: string | null,
  pmIn?: string | null,
  pmOut?: string | null
): number {
  let undertime = 0

  const parseToMinutes = (str?: string | null): number | null => {
    if (!str) return null
    const trimmed = str.trim()
    if (/^\d{1,2}:\d{2}/.test(trimmed)) {
      const [h, m] = trimmed.split(':').map(Number)
      return h * 60 + m
    }
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes()
    }
    return null
  }

  const amInMin = parseToMinutes(amIn)
  const amOutMin = parseToMinutes(amOut)
  const pmInMin = parseToMinutes(pmIn)
  const pmOutMin = parseToMinutes(pmOut)

  // AM Session: Expected 8:00 (480 min) to 12:00 (720 min)
  if (amInMin !== null && amInMin > 480) {
    undertime += Math.min(amInMin - 480, 240) // capped at morning session length
  }
  if (amOutMin !== null && amOutMin < 720 && amOutMin >= 480) {
    undertime += 720 - amOutMin
  }

  // PM Session: Expected 13:00 (780 min) to 17:00 (1020 min)
  if (pmInMin !== null && pmInMin > 780) {
    undertime += Math.min(pmInMin - 780, 240)
  }
  if (pmOutMin !== null && pmOutMin < 1020 && pmOutMin >= 780) {
    undertime += 1020 - pmOutMin
  }

  return undertime
}

/**
 * Formats month display string for Form 48 header
 * e.g., "June 1-17, 2026" or "June 2026" or "June 1-15, 2026"
 */
export function formatMonthHeader(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return ''

  const [startY, startM, startD] = startDateStr.split('-').map(Number)
  const [endY, endM, endD] = endDateStr.split('-').map(Number)

  const startDate = new Date(startY, startM - 1, startD)
  const monthName = startDate.toLocaleString('en-US', { month: 'long' })
  const daysInMonth = new Date(startY, startM, 0).getDate()

  if (startY === endY && startM === endM) {
    if (startD === 1 && endD === daysInMonth) {
      return `${monthName} ${startY}`
    }
    return `${monthName} ${startD}-${endD}, ${startY}`
  }

  const endDate = new Date(endY, endM - 1, endD)
  const endMonthName = endDate.toLocaleString('en-US', { month: 'long' })
  return `${monthName} ${startD}, ${startY} - ${endMonthName} ${endD}, ${endY}`
}

/**
 * Generates the complete set of DTR day rows (typically 1 to 30/31) based on month and date range
 */
export function buildDtrRows(
  startDateStr: string,
  endDateStr: string,
  attendances: AttendanceRecord[]
): {
  rows: DtrDayRow[]
  activeStartDay: number
  activeEndDay: number
  totalDaysInMonth: number
  totalUndertimeHours: number
  totalUndertimeMinutes: number
} {
  const [startY, startM, startD] = startDateStr.split('-').map(Number)
  const [endY, endM, endD] = endDateStr.split('-').map(Number)

  const totalDaysInMonth = new Date(startY, startM, 0).getDate()

  // Build a lookup map of attendance records by day number
  const attendanceMap = new Map<number, AttendanceRecord>()
  for (const rec of attendances) {
    if (rec.attendanceDate) {
      const [y, m, d] = rec.attendanceDate.split('-').map(Number)
      if (y === startY && m === startM) {
        attendanceMap.set(d, rec)
      }
    }
  }

  const rows: DtrDayRow[] = []
  let totalUndertimeMinutes = 0

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const date = new Date(startY, startM - 1, day)
    const dayOfWeek = date.getDay() // 0 = Sun, 6 = Sat
    const isSaturday = dayOfWeek === 6
    const isSunday = dayOfWeek === 0

    const dateStr = `${startY}-${String(startM).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isWithinRange = day >= startD && day <= endD

    let amArrival = ''
    let amDeparture = ''
    let pmArrival = ''
    let pmDeparture = ''
    let undertimeHours = ''
    let undertimeMinutes = ''

    if (isWithinRange) {
      const rec = attendanceMap.get(day)
      if (rec) {
        amArrival = formatDtrTime(rec.amCheckIn)
        amDeparture = formatDtrTime(rec.amCheckOut)
        pmArrival = formatDtrTime(rec.pmCheckIn)
        pmDeparture = formatDtrTime(rec.pmCheckOut)

        const uMin = calculateUndertimeMinutes(
          rec.amCheckIn,
          rec.amCheckOut,
          rec.pmCheckIn,
          rec.pmCheckOut
        )
        if (uMin > 0) {
          totalUndertimeMinutes += uMin
          const h = Math.floor(uMin / 60)
          const m = uMin % 60
          undertimeHours = h > 0 ? String(h) : ''
          undertimeMinutes = m > 0 ? String(m) : ''
        }
      }
    }

    rows.push({
      day,
      dateStr,
      dayOfWeek,
      isSaturday,
      isSunday,
      isWithinRange,
      amArrival,
      amDeparture,
      pmArrival,
      pmDeparture,
      undertimeHours,
      undertimeMinutes,
    })
  }

  const totalH = Math.floor(totalUndertimeMinutes / 60)
  const remM = totalUndertimeMinutes % 60

  return {
    rows,
    activeStartDay: startD,
    activeEndDay: endD,
    totalDaysInMonth,
    totalUndertimeHours: totalH,
    totalUndertimeMinutes: remM,
  }
}

/**
 * Generate full DtrGenerationResult
 */
export function generateDtrData(
  options: DtrOptions,
  attendances: AttendanceRecord[]
): DtrGenerationResult {
  const employeeName = options.employee?.fullName
    ? options.employee.fullName.toUpperCase()
    : 'EMPLOYEE NAME'

  const monthDisplay = options.monthLabel || formatMonthHeader(options.startDate, options.endDate)
  const regularHours = options.regularHours || ''
  const saturdayHours = options.saturdayHours || ''
  const supervisorName = options.supervisorName || 'PGDH'
  const supervisorTitle = options.supervisorTitle || '(PESO Manager)'

  const {
    rows,
    activeStartDay,
    activeEndDay,
    totalDaysInMonth,
    totalUndertimeHours,
    totalUndertimeMinutes,
  } = buildDtrRows(options.startDate, options.endDate, attendances)

  return {
    employeeName,
    monthDisplay,
    regularHours,
    saturdayHours,
    supervisorName,
    supervisorTitle,
    rows,
    activeStartDay,
    activeEndDay,
    totalDaysInMonth,
    totalUndertimeHours,
    totalUndertimeMinutes,
  }
}

/**
 * Generates an exact, 100% self-contained standalone HTML document
 * matching the Civil Service Form No. 48 reference image.
 * This can be directly saved, printed, or emailed.
 */
export function generateStandaloneDtrHtml(
  data: DtrGenerationResult,
  options: { dualCopy?: boolean; rightCopyHasName?: boolean } = {}
): string {
  const dualCopy = options.dualCopy !== false
  const rightCopyHasName = options.rightCopyHasName ?? false

  const renderSingleSlipHtml = (employeeNameDisplay: string) => {
    // Generate rows
    let tableRowsHtml = ''
    for (const row of data.rows) {
      if (row.isSaturday) {
        tableRowsHtml += `
          <tr class="day-row sat-row">
            <td class="col-day">${row.day}</td>
            <td colspan="6" class="col-weekend">S A T U R D A Y</td>
          </tr>`
      } else if (row.isSunday) {
        tableRowsHtml += `
          <tr class="day-row sun-row">
            <td class="col-day">${row.day}</td>
            <td colspan="6" class="col-weekend">S U N D A Y</td>
          </tr>`
      } else {
        tableRowsHtml += `
          <tr class="day-row">
            <td class="col-day">${row.day}</td>
            <td class="col-time">${row.amArrival || ''}</td>
            <td class="col-time">${row.amDeparture || ''}</td>
            <td class="col-time">${row.pmArrival || ''}</td>
            <td class="col-time">${row.pmDeparture || ''}</td>
            <td class="col-undertime">${row.undertimeHours || ''}</td>
            <td class="col-undertime">${row.undertimeMinutes || ''}</td>
          </tr>`
      }
    }

    // Determine diagonal slash coordinate calculation
    // From day after activeEndDay to totalDaysInMonth (or 30/31)
    const hasDiagonalSlash = data.activeEndDay < data.totalDaysInMonth
    const slashStartDay = data.activeEndDay + 1
    const slashEndDay = data.totalDaysInMonth

    // Calculate percentage offset for SVG diagonal line
    // The table header is 2 rows tall. Total rows = 2 + data.totalDaysInMonth
    const totalTableRows = 2 + data.totalDaysInMonth
    const startRowIndex = 2 + (slashStartDay - 1)
    const endRowIndex = 2 + slashEndDay
    const topPct = ((startRowIndex / totalTableRows) * 100).toFixed(2)
    const bottomPct = ((endRowIndex / totalTableRows) * 100).toFixed(2)

    return `
      <div class="dtr-slip">
        <div class="dtr-top-form-no">Civil Service Form No. 48</div>
        <h1 class="dtr-main-title">DAILY TIME RECORD</h1>
        <div class="dtr-subtitle">-----o0o-----</div>

        <div class="dtr-name-section">
          <div class="dtr-name-text">${employeeNameDisplay || '&nbsp;'}</div>
          <div class="dtr-name-line"></div>
          <div class="dtr-name-label">(Name)</div>
        </div>

        <div class="dtr-meta-section">
          <div class="dtr-month-row">
            <span class="dtr-label">For the month of</span>
            <span class="dtr-value-line">${data.monthDisplay}</span>
          </div>
          <div class="dtr-hours-row">
            <div class="dtr-hours-col1">
              <span>Official hours for</span><br/>
              <span>arrival and departure</span>
            </div>
            <div class="dtr-hours-col2">
              <div class="dtr-hours-line-item">
                <span>Regular days</span>
                <span class="dtr-dotted-line">${data.regularHours || ''}</span>
              </div>
              <div class="dtr-hours-line-item">
                <span>Saturdays</span>
                <span class="dtr-dotted-line">${data.saturdayHours || ''}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="dtr-table-wrapper">
          <table class="dtr-table">
            <thead>
              <tr class="th-group">
                <th rowspan="2" class="th-corner">c</th>
                <th colspan="2" class="th-session">A.M.</th>
                <th colspan="2" class="th-session">P.M.</th>
                <th colspan="2" class="th-session">Undertime</th>
              </tr>
              <tr class="th-sub">
                <th class="th-arrival">Arrival</th>
                <th class="th-departure">Depart<br/>ure</th>
                <th class="th-arrival">Arrival</th>
                <th class="th-departure">Departu<br/>re</th>
                <th class="th-under-hr">Hours</th>
                <th class="th-under-min">Min-<br/>utes</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          ${
            hasDiagonalSlash
              ? `
          <svg class="dtr-diagonal-slash" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="12" y1="${topPct}" x2="99" y2="${bottomPct}" stroke="black" stroke-width="0.8" />
          </svg>
          `
              : ''
          }
        </div>

        <div class="dtr-certification">
          I certify on my honor that the above is a true and correct report of
          the hours of work performed, record of which was made daily at the
          time of arrival and departure from office.
        </div>

        <div class="dtr-signature-section">
          <div class="dtr-sig-line"></div>
          <div class="dtr-sig-label">Name</div>
        </div>

        <div class="dtr-verified-text">
          VERIFIED as to the prescribed office hours:
        </div>

        <div class="dtr-supervisor-section">
          <div class="dtr-sig-line"></div>
          <div class="dtr-sup-name">${data.supervisorName}</div>
          <div class="dtr-sup-title">${data.supervisorTitle}</div>
        </div>
      </div>
    `
  }

  const leftSlip = renderSingleSlipHtml(data.employeeName)
  const rightSlip = dualCopy
    ? renderSingleSlipHtml(rightCopyHasName ? data.employeeName : '')
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Time Record - ${data.employeeName} (${data.monthDisplay})</title>
  <style>
    @page {
      size: letter portrait;
      margin: 0.25in 0.35in;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 8.5pt;
      line-height: 1.15;
      color: #000;
      background-color: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .dtr-page-container {
      display: flex;
      justify-content: center;
      gap: 24px;
      width: 100%;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 8px 0;
    }
    .dtr-slip {
      flex: 1;
      max-width: 3.9in;
      min-width: 3.6in;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .dtr-top-form-no {
      font-family: "Times New Roman", Times, serif;
      font-style: italic;
      font-size: 8pt;
      margin-bottom: 2px;
      color: #000;
    }
    .dtr-main-title {
      font-size: 11.5pt;
      font-weight: bold;
      text-align: center;
      letter-spacing: 0.5px;
      margin-top: 1px;
      margin-bottom: 0px;
    }
    .dtr-subtitle {
      text-align: center;
      font-size: 8pt;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .dtr-name-section {
      text-align: center;
      margin-bottom: 6px;
    }
    .dtr-name-text {
      font-weight: bold;
      font-size: 9.5pt;
      letter-spacing: 0.5px;
      min-height: 14px;
      line-height: 14px;
    }
    .dtr-name-line {
      border-bottom: 1.5px solid #000;
      width: 100%;
      margin: 1px 0 1px 0;
    }
    .dtr-name-label {
      font-size: 7.5pt;
      color: #000;
      line-height: 10px;
    }
    .dtr-meta-section {
      font-size: 8pt;
      margin-bottom: 5px;
    }
    .dtr-month-row {
      display: flex;
      align-items: flex-end;
      margin-bottom: 4px;
      font-style: italic;
    }
    .dtr-month-row .dtr-label {
      font-style: italic;
      white-space: nowrap;
      margin-right: 4px;
      font-size: 7.8pt;
    }
    .dtr-month-row .dtr-value-line {
      flex: 1;
      border-bottom: 1px solid #000;
      font-style: normal;
      font-weight: 500;
      padding-left: 4px;
      font-size: 8pt;
      line-height: 12px;
    }
    .dtr-hours-row {
      display: flex;
      font-size: 7.5pt;
      align-items: flex-start;
      margin-top: 2px;
    }
    .dtr-hours-col1 {
      width: 42%;
      font-style: italic;
      line-height: 1.1;
      font-size: 7.2pt;
    }
    .dtr-hours-col2 {
      width: 58%;
      line-height: 1.15;
    }
    .dtr-hours-line-item {
      display: flex;
      align-items: flex-end;
      margin-bottom: 1px;
    }
    .dtr-hours-line-item span:first-child {
      white-space: nowrap;
      margin-right: 4px;
      font-size: 7.2pt;
    }
    .dtr-dotted-line {
      flex: 1;
      border-bottom: 1px solid #000;
      min-height: 10px;
      line-height: 10px;
      padding-left: 2px;
      font-size: 7pt;
    }
    .dtr-table-wrapper {
      position: relative;
      width: 100%;
      margin-top: 4px;
      margin-bottom: 6px;
    }
    .dtr-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000;
      font-size: 7.5pt;
      text-align: center;
    }
    .dtr-table th,
    .dtr-table td {
      border: 1px solid #000;
      padding: 0;
      height: 13.8px;
      line-height: 13.8px;
      vertical-align: middle;
    }
    .th-group th {
      font-weight: bold;
      font-size: 8pt;
      height: 14px;
    }
    .th-corner {
      width: 22px;
      font-size: 6.5pt;
      font-weight: normal;
    }
    .th-sub th {
      font-weight: normal;
      font-size: 6.8pt;
      line-height: 1;
      height: 20px;
      vertical-align: middle;
    }
    .th-arrival {
      width: 44px;
    }
    .th-departure {
      width: 46px;
    }
    .th-under-hr {
      width: 34px;
    }
    .th-under-min {
      width: 34px;
    }
    .col-day {
      font-weight: bold;
      font-size: 7.5pt;
      width: 22px;
    }
    .col-time {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 7.2pt;
      letter-spacing: -0.2px;
    }
    .col-undertime {
      font-size: 7pt;
    }
    .col-weekend {
      font-weight: 500;
      letter-spacing: 3px;
      font-size: 7pt;
      text-align: center;
    }
    .dtr-diagonal-slash {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .dtr-certification {
      font-family: "Times New Roman", Times, serif;
      font-style: italic;
      font-size: 6.8pt;
      line-height: 1.15;
      text-align: justify;
      margin-top: 4px;
      margin-bottom: 12px;
    }
    .dtr-signature-section {
      text-align: center;
      margin-bottom: 8px;
    }
    .dtr-sig-line {
      border-bottom: 1.5px solid #000;
      width: 85%;
      margin: 0 auto;
    }
    .dtr-sig-label {
      font-family: "Times New Roman", Times, serif;
      font-style: italic;
      font-size: 7.5pt;
      margin-top: 2px;
    }
    .dtr-verified-text {
      font-family: "Times New Roman", Times, serif;
      font-style: italic;
      font-size: 7pt;
      margin-top: 2px;
      margin-bottom: 14px;
      text-align: left;
    }
    .dtr-supervisor-section {
      text-align: center;
      margin-top: 4px;
    }
    .dtr-sup-name {
      font-size: 7.5pt;
      font-weight: normal;
      margin-top: 2px;
      line-height: 10px;
    }
    .dtr-sup-title {
      font-family: "Times New Roman", Times, serif;
      font-style: italic;
      font-size: 7pt;
      line-height: 10px;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .dtr-page-container {
        padding: 0;
        gap: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="dtr-page-container">
    ${leftSlip}
    ${rightSlip}
  </div>
</body>
</html>`
}

<script setup lang="ts">
import { computed } from 'vue'
import type { DtrDayRow } from '@/types/peso/dtr'

const props = withDefaults(
  defineProps<{
    employeeName?: string
    monthDisplay?: string
    regularHours?: string
    saturdayHours?: string
    supervisorName?: string
    supervisorTitle?: string
    rows?: DtrDayRow[]
    activeEndDay?: number
    totalDaysInMonth?: number
    isDuplicateBlankName?: boolean
  }>(),
  {
    employeeName: '',
    monthDisplay: '',
    regularHours: '',
    saturdayHours: '',
    supervisorName: 'PGDH',
    supervisorTitle: '(PESO Manager)',
    rows: () => [],
    activeEndDay: 31,
    totalDaysInMonth: 31,
    isDuplicateBlankName: false,
  }
)

// Diagonal slash calculation (draw diagonal line across inactive days e.g. rows 18 to 30)
const hasDiagonalSlash = computed(() => {
  return props.activeEndDay < props.totalDaysInMonth && props.rows.length > 0
})

const slashYCoords = computed(() => {
  if (!hasDiagonalSlash.value) return { y1: 0, y2: 0 }
  const totalRows = 2 + props.totalDaysInMonth
  const startRow = 2 + props.activeEndDay
  const endRow = 2 + props.totalDaysInMonth
  const y1 = ((startRow / totalRows) * 100).toFixed(2)
  const y2 = ((endRow / totalRows) * 100).toFixed(2)
  return { y1: Number(y1), y2: Number(y2) }
})
</script>

<template>
  <div class="dtr-slip-box">
    <!-- Top Form Identifier -->
    <div class="dtr-top-form-no">Civil Service Form No. 48</div>

    <!-- Main Title -->
    <h1 class="dtr-main-title">DAILY TIME RECORD</h1>
    <div class="dtr-subtitle">-----o0o-----</div>

    <!-- Employee Name -->
    <div class="dtr-name-section">
      <div class="dtr-name-text">
        {{ isDuplicateBlankName ? '' : employeeName }}
      </div>
      <div class="dtr-name-line"></div>
      <div class="dtr-name-label">(Name)</div>
    </div>

    <!-- Month & Official Hours Meta Section -->
    <div class="dtr-meta-section">
      <div class="dtr-month-row">
        <span class="dtr-label">For the month of</span>
        <span class="dtr-value-line">{{ monthDisplay }}</span>
      </div>
      <div class="dtr-hours-row">
        <div class="dtr-hours-col1">
          <span>Official hours for</span><br />
          <span>arrival and departure</span>
        </div>
        <div class="dtr-hours-col2">
          <div class="dtr-hours-line-item">
            <span>Regular days</span>
            <span class="dtr-dotted-line">{{ regularHours }}</span>
          </div>
          <div class="dtr-hours-line-item">
            <span>Saturdays</span>
            <span class="dtr-dotted-line">{{ saturdayHours }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Attendance Table -->
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
            <th class="th-departure">Depart<br />ure</th>
            <th class="th-arrival">Arrival</th>
            <th class="th-departure">Departu<br />re</th>
            <th class="th-under-hr">Hours</th>
            <th class="th-under-min">Min-<br />utes</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in rows" :key="row.day">
            <!-- Saturday Row -->
            <tr v-if="row.isSaturday" class="day-row sat-row">
              <td class="col-day">{{ row.day }}</td>
              <td colspan="6" class="col-weekend">S A T U R D A Y</td>
            </tr>

            <!-- Sunday Row -->
            <tr v-else-if="row.isSunday" class="day-row sun-row">
              <td class="col-day">{{ row.day }}</td>
              <td colspan="6" class="col-weekend">S U N D A Y</td>
            </tr>

            <!-- Normal Day Row -->
            <tr v-else class="day-row">
              <td class="col-day">{{ row.day }}</td>
              <td class="col-time">{{ row.amArrival }}</td>
              <td class="col-time">{{ row.amDeparture }}</td>
              <td class="col-time">{{ row.pmArrival }}</td>
              <td class="col-time">{{ row.pmDeparture }}</td>
              <td class="col-undertime">{{ row.undertimeHours }}</td>
              <td class="col-undertime">{{ row.undertimeMinutes }}</td>
            </tr>
          </template>
        </tbody>
      </table>

      <!-- Authentic Diagonal Slash for Inactive Rows -->
      <svg
        v-if="hasDiagonalSlash"
        class="dtr-diagonal-slash"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line
          x1="12"
          :y1="slashYCoords.y1"
          x2="99"
          :y2="slashYCoords.y2"
          stroke="#000"
          stroke-width="0.8"
        />
      </svg>
    </div>

    <!-- Certification Text -->
    <div class="dtr-certification">
      I certify on my honor that the above is a true and correct report of the hours of work
      performed, record of which was made daily at the time of arrival and departure from office.
    </div>

    <!-- Employee Signature Line -->
    <div class="dtr-signature-section">
      <div class="dtr-sig-line"></div>
      <div class="dtr-sig-label">Name</div>
    </div>

    <!-- Verified Verification Note -->
    <div class="dtr-verified-text">
      VERIFIED as to the prescribed office hours:
    </div>

    <!-- Supervisor Signature Section -->
    <div class="dtr-supervisor-section">
      <div class="dtr-sup-name">{{ supervisorName }}</div>
      <div class="dtr-sig-line"></div>
      <div class="dtr-sup-title">{{ supervisorTitle }}</div>
    </div>
  </div>
</template>

<style scoped>
.dtr-slip-box {
  width: 100%;
  max-width: 3.9in;
  min-width: 3.4in;
  margin: 0 auto;
  padding: 4px;
  background-color: #ffffff;
  color: #000000;
  font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  font-size: 8.5pt;
  line-height: 1.15;
  box-sizing: border-box;
  position: relative;
  user-select: text;
}

.dtr-top-form-no {
  font-family: "Times New Roman", Times, serif;
  font-style: italic;
  font-size: 8pt;
  margin-bottom: 2px;
  color: #000000;
}

.dtr-main-title {
  font-size: 11.5pt;
  font-weight: bold;
  text-align: center;
  letter-spacing: 0.5px;
  margin: 0;
  color: #000000;
}

.dtr-subtitle {
  text-align: center;
  font-size: 8pt;
  letter-spacing: 1px;
  margin-bottom: 6px;
  color: #000000;
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
  color: #000000;
  text-transform: uppercase;
}

.dtr-name-line {
  border-bottom: 1.5px solid #000000;
  width: 100%;
  margin: 1px 0;
}

.dtr-name-label {
  font-size: 7.5pt;
  color: #000000;
  line-height: 10px;
}

.dtr-meta-section {
  font-size: 8pt;
  margin-bottom: 5px;
  color: #000000;
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
  border-bottom: 1px solid #000000;
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
  border-bottom: 1px solid #000000;
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
  border: 1.5px solid #000000;
  font-size: 7.5pt;
  text-align: center;
  background-color: #ffffff;
}

.dtr-table th,
.dtr-table td {
  border: 1px solid #000000;
  padding: 0;
  height: 13.8px;
  line-height: 13.8px;
  vertical-align: middle;
  color: #000000;
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
  color: #000000;
}

.dtr-signature-section {
  text-align: center;
  margin-bottom: 8px;
}

.dtr-sig-line {
  border-bottom: 1.5px solid #000000;
  width: 85%;
  margin: 0 auto;
}

.dtr-sig-label {
  font-family: "Times New Roman", Times, serif;
  font-style: italic;
  font-size: 7.5pt;
  margin-top: 2px;
  color: #000000;
}

.dtr-verified-text {
  font-family: "Times New Roman", Times, serif;
  font-style: italic;
  font-size: 7pt;
  margin-top: 2px;
  margin-bottom: 14px;
  text-align: left;
  color: #000000;
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
  color: #000000;
}

.dtr-sup-title {
  font-family: "Times New Roman", Times, serif;
  font-style: italic;
  font-size: 7pt;
  line-height: 10px;
  color: #000000;
}
</style>

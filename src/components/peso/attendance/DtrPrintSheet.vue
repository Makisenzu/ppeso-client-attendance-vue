<script setup lang="ts">
import { Scissors } from '@lucide/vue'
import type { DtrGenerationResult } from '@/types/peso/dtr'
import DtrSlip from './DtrSlip.vue'

/**
 * One letter-size sheet of Civil Service Form 48, shown on screen exactly as it prints:
 * with 2 copies, each fills half the page and a dashed line marks the center cut.
 * Used by the admin Generate DTR page and the beneficiary My DTR page.
 */
defineProps<{
  data: DtrGenerationResult
  dualCopy: boolean
  rightCopyHasName: boolean
}>()
</script>

<template>
  <div class="dtr-print-canvas">
    <div class="dtr-page-sheet" :class="dualCopy ? 'is-dual' : 'is-single'">
      <div class="dtr-copy">
        <DtrSlip
          :employee-name="data.employeeName"
          :month-display="data.monthDisplay"
          :regular-hours="data.regularHours"
          :saturday-hours="data.saturdayHours"
          :supervisor-name="data.supervisorName"
          :supervisor-title="data.supervisorTitle"
          :rows="data.rows"
          :active-start-day="data.activeStartDay"
          :active-end-day="data.activeEndDay"
          :total-days-in-month="data.totalDaysInMonth"
          :is-duplicate-blank-name="false"
        />
      </div>

      <template v-if="dualCopy">
        <div class="dtr-cut-line" aria-hidden="true">
          <Scissors class="dtr-cut-icon" />
        </div>
        <div class="dtr-copy">
          <DtrSlip
            :employee-name="data.employeeName"
            :month-display="data.monthDisplay"
            :regular-hours="data.regularHours"
            :saturday-hours="data.saturdayHours"
            :supervisor-name="data.supervisorName"
            :supervisor-title="data.supervisorTitle"
            :rows="data.rows"
            :active-start-day="data.activeStartDay"
            :active-end-day="data.activeEndDay"
            :total-days-in-month="data.totalDaysInMonth"
            :is-duplicate-blank-name="!rightCopyHasName"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style>
/*
 * Civil Service Form 48 sheet (official printed form — DESIGN.md §13 exception; the form is always
 * black on white, so it uses fixed colors instead of theme tokens).
 * Letter paper with 0.35in side margins leaves 7.8in: each copy gets exactly half (3.9in), and the
 * dashed line sits on the center fold so the two copies are separated with one straight cut.
 */
.dtr-page-sheet {
  display: grid;
  box-sizing: border-box;
  width: 7.8in;
  margin: 0 auto;
  padding: 0.15in 0;
  background: #ffffff;
  color: #000000;
}

.dtr-page-sheet.is-dual {
  grid-template-columns: 1fr 0 1fr;
}

.dtr-page-sheet.is-single {
  grid-template-columns: 1fr;
  width: 3.9in;
}

.dtr-copy {
  display: flex;
  justify-content: center;
  min-width: 0;
  padding: 0 0.12in;
}

.dtr-cut-line {
  position: relative;
  border-left: 1px dashed #000000;
}

.dtr-cut-icon {
  position: absolute;
  top: -0.1in;
  left: -7px;
  width: 13px;
  height: 13px;
  padding: 1px 0;
  background: #ffffff;
  color: #000000;
  transform: rotate(-90deg);
}

@media screen {
  .dtr-page-sheet {
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.12);
  }
}

@media print {
  @page {
    size: letter portrait;
    margin: 0.25in 0.35in;
  }

  /* Only while a DTR sheet is on the page: print that sheet and nothing else, on one page. */
  html:has(.dtr-print-canvas),
  body:has(.dtr-print-canvas) {
    height: 100%;
    overflow: hidden;
  }

  body:has(.dtr-print-canvas) * {
    visibility: hidden;
  }

  .dtr-print-canvas,
  .dtr-print-canvas * {
    visibility: visible !important;
  }

  .dtr-print-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    margin: 0 !important;
    padding: 0 !important;
  }

  .dtr-page-sheet {
    margin: 0 auto !important;
    break-inside: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>

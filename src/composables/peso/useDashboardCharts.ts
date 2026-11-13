import { computed, ref, useTemplateRef } from 'vue'
import '@/lib/chartSetup'
import { useDashboard } from '@/composables/peso/useDashboard'
import {
  barChartOptions,
  buildAttendanceStatusChartData,
  buildClientPurposeChartData,
  buildGenderChartData,
  buildPersonnelPositionChartData,
  buildPurposeLegendItems,
  buildWeeklyAttendanceChartData,
  buildWeeklyClientChartData,
  doughnutOptions,
  hasChartData,
  lineChartOptions,
  pieOptions,
} from '@/helpers/peso/dashboardChartHelper'

/** Minimal shape of the vue-chartjs component instance (template ref on <Pie>). */
interface ChartComponentRef {
  chart?: { toggleDataVisibility: (index: number) => void; update: () => void }
}

/** Admin dashboard: KPI data from useDashboard plus every chart's data and options. */
export function useDashboardCharts() {
  const dashboard = useDashboard()

  // ─── Purpose pie: clickable legend that hides / shows slices ───
  // Bound to <Pie ref="purposePieChart"> in PesoDashboard.vue.
  const purposePieChartRef = useTemplateRef<ChartComponentRef>('purposePieChart')
  const hiddenPurposeIndices = ref<Set<number>>(new Set())

  const purposeLegendItems = computed(() =>
    buildPurposeLegendItems(dashboard.clientPurposeDistribution.value, hiddenPurposeIndices.value),
  )

  const togglePurposeVisibility = (index: number) => {
    const chart = purposePieChartRef.value?.chart
    if (!chart) return
    chart.toggleDataVisibility(index)
    chart.update()
    const next = new Set(hiddenPurposeIndices.value)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    hiddenPurposeIndices.value = next
  }

  // ─── Chart data ───
  const attendanceStatusChartData = computed(() =>
    buildAttendanceStatusChartData(dashboard.attendanceStatusDistribution.value),
  )
  const clientPurposeChartData = computed(() =>
    buildClientPurposeChartData(dashboard.clientPurposeDistribution.value),
  )
  const weeklyAttendanceChartData = computed(() =>
    buildWeeklyAttendanceChartData(dashboard.weeklyAttendanceTrend.value),
  )
  const weeklyClientChartData = computed(() => buildWeeklyClientChartData(dashboard.weeklyClientTrend.value))
  const personnelPositionChartData = computed(() =>
    buildPersonnelPositionChartData(dashboard.personnelByPosition.value),
  )
  const genderChartData = computed(() => buildGenderChartData(dashboard.genderDistribution.value))

  /** Width of the on-time progress bar, capped at 100%. */
  const onTimeRateBarWidth = computed(() => `${Math.min(dashboard.onTimeRate.value, 100)}%`)

  return {
    ...dashboard,
    purposeLegendItems,
    togglePurposeVisibility,
    attendanceStatusChartData,
    clientPurposeChartData,
    weeklyAttendanceChartData,
    weeklyClientChartData,
    personnelPositionChartData,
    genderChartData,
    onTimeRateBarWidth,
    doughnutOptions,
    pieOptions,
    lineChartOptions,
    barChartOptions,
    hasData: hasChartData,
  }
}

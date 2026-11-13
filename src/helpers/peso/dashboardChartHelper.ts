import type { ChartOptions } from 'chart.js'
import type {
  AttendanceStatusDistribution,
  ClientPurposeDistribution,
  GenderDistribution,
  PersonnelByPosition,
  WeeklyTrendData,
} from '@/helpers/peso/dashboardHelper'

/*
 * Chart.js options and dataset builders for the admin dashboard (pure functions, no Vue).
 * NOTE: colors are still raw values — move them to --chart-* tokens when restyling (DESIGN.md §2).
 */

const AXIS_FONT = { size: 11, family: 'Roboto, sans-serif' }
const AXIS_COLOR = '#64748b'
const SLICE_BORDER = 'rgba(15, 23, 42, 0.6)'

const commonPlugins = {
  legend: {
    position: 'bottom' as const,
    labels: {
      usePointStyle: true,
      boxWidth: 8,
      padding: 14,
      font: AXIS_FONT,
      color: AXIS_COLOR,
    },
  },
  tooltip: {
    backgroundColor: '#0f172a',
    titleColor: '#f8fafc',
    bodyColor: '#f8fafc',
    borderColor: '#334155',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    boxPadding: 4,
  },
}

const hiddenLegendPlugins = { ...commonPlugins, legend: { display: false } }

const cartesianScales = {
  x: {
    grid: { display: false },
    ticks: { font: AXIS_FONT, color: AXIS_COLOR },
  },
  y: {
    beginAtZero: true,
    grid: { color: 'rgba(148, 163, 184, 0.12)' },
    ticks: { precision: 0, font: AXIS_FONT, color: AXIS_COLOR },
  },
}

export const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: hiddenLegendPlugins,
  cutout: '62%',
}

export const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: hiddenLegendPlugins,
}

export const lineChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: hiddenLegendPlugins,
  scales: cartesianScales,
}

export const barChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: hiddenLegendPlugins,
  scales: cartesianScales,
}

/** Slice colors for walk-in purposes, in the order of PURPOSE_OPTIONS. */
export const PURPOSE_COLORS = [
  '#3b82f6', // GIP - Blue
  '#8b5cf6', // SPES - Violet
  '#06b6d4', // JobStart - Cyan
  '#f97316', // OFW - Orange
  '#10b981', // CEA - Emerald
  '#ec4899', // Skills - Pink
  '#94a3b8', // Others - Slate
]

const PURPOSE_HOVER_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#ea580c', '#059669', '#db2777', '#64748b']

export function buildAttendanceStatusChartData(dist: AttendanceStatusDistribution) {
  return {
    labels: ['On-time', 'Late', 'Early Out', 'Absent'],
    datasets: [
      {
        data: [dist.ontime, dist.late, dist.earlyOut, dist.absent],
        backgroundColor: ['#10b981', '#f59e0b', '#f43f5e', '#64748b'],
        hoverBackgroundColor: ['#059669', '#d97706', '#e11d48', '#475569'],
        borderWidth: 2,
        borderColor: SLICE_BORDER,
      },
    ],
  }
}

export function buildClientPurposeChartData(dist: ClientPurposeDistribution) {
  return {
    labels: dist.labels,
    datasets: [
      {
        data: dist.data,
        backgroundColor: PURPOSE_COLORS,
        hoverBackgroundColor: PURPOSE_HOVER_COLORS,
        borderWidth: 2,
        borderColor: SLICE_BORDER,
      },
    ],
  }
}

export interface PurposeLegendItem {
  index: number
  label: string
  value: string
  count: number
  percentage: number
  color: string
  hidden: boolean
}

export function buildPurposeLegendItems(
  dist: ClientPurposeDistribution,
  hiddenIndices: Set<number>,
): PurposeLegendItem[] {
  const total = dist.data.reduce((acc, val) => acc + val, 0)
  return dist.labels.map((label, index) => {
    const count = dist.data[index] || 0
    return {
      index,
      label,
      value: dist.values[index],
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: PURPOSE_COLORS[index] || '#94a3b8',
      hidden: hiddenIndices.has(index),
    }
  })
}

function buildTrendLine(trend: WeeklyTrendData, label: string, color: string, fill: string) {
  return {
    labels: trend.labels,
    datasets: [
      {
        label,
        data: trend.data,
        borderColor: color,
        backgroundColor: fill,
        borderWidth: 2.5,
        pointBackgroundColor: color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35,
      },
    ],
  }
}

export function buildWeeklyAttendanceChartData(trend: WeeklyTrendData) {
  return buildTrendLine(trend, 'Attendance Punches', '#3b82f6', 'rgba(59, 130, 246, 0.12)')
}

export function buildWeeklyClientChartData(trend: WeeklyTrendData) {
  return buildTrendLine(trend, 'Walk-in Clients', '#10b981', 'rgba(16, 185, 129, 0.12)')
}

export function buildPersonnelPositionChartData(pos: PersonnelByPosition) {
  return {
    labels: pos.labels,
    datasets: [
      {
        label: 'Personnel Count',
        data: pos.data,
        // Admin, Employee, GIP, TUPAD, Client
        backgroundColor: ['#64748b', '#3b82f6', '#8b5cf6', '#f59e0b', '#14b8a6'],
        borderRadius: 6,
        maxBarThickness: 42,
      },
    ],
  }
}

export function buildGenderChartData(g: GenderDistribution) {
  return {
    labels: ['Male', 'Female', 'Not Specified'],
    datasets: [
      {
        data: [g.male, g.female, g.notSpecified],
        backgroundColor: ['#3b82f6', '#ec4899', '#94a3b8'],
        hoverBackgroundColor: ['#2563eb', '#db2777', '#64748b'],
        borderWidth: 2,
        borderColor: SLICE_BORDER,
      },
    ],
  }
}

/** True when a chart has at least one non-zero value (otherwise show the empty state). */
export function hasChartData(numbers: number[]): boolean {
  return numbers.some((n) => n > 0)
}

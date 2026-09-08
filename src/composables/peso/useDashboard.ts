import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { AttendanceRecord } from '@/types/peso/attendance'
import type { ClientRecordItem } from '@/types/peso/clientRecord'
import type { ProfileRecord } from '@/types/peso/userManagement'
import { attendanceService } from '@/services/peso/attendanceService'
import { clientRecordService } from '@/services/peso/clientRecordService'
import { userManagementService } from '@/services/peso/userManagementService'
import {
  computeAttendanceStatusDistribution,
  computeClientPurposeDistribution,
  computeGenderDistribution,
  computeOnTimeRate,
  computePersonnelByPosition,
  computePersonnelByStatus,
  computeTodayClientCount,
  computeWeeklyAttendanceTrend,
  computeWeeklyClientTrend,
} from '@/helpers/peso/dashboardHelper'

export function useDashboard() {
  const attendances = ref<AttendanceRecord[]>([])
  const walkins = ref<ClientRecordItem[]>([])
  const profiles = ref<ProfileRecord[]>([])
  const isLoading = ref<boolean>(true)
  const isRefreshing = ref<boolean>(false)

  let attendanceSub: { unsubscribe: () => void } | null = null

  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      isRefreshing.value = true
    } else {
      isLoading.value = true
    }

    try {
      const [attendancesRes, walkinsRes, profilesRes] = await Promise.allSettled([
        attendanceService.getAttendances(),
        clientRecordService.getWalkinAttendances(),
        userManagementService.getProfiles(),
      ])

      if (attendancesRes.status === 'fulfilled') {
        attendances.value = attendancesRes.value
      } else {
        console.error('Failed to load attendances for dashboard:', attendancesRes.reason)
      }

      if (walkinsRes.status === 'fulfilled') {
        walkins.value = walkinsRes.value
      } else {
        console.error('Failed to load walk-in client records for dashboard:', walkinsRes.reason)
      }

      if (profilesRes.status === 'fulfilled') {
        profiles.value = profilesRes.value
      } else {
        console.error('Failed to load profiles for dashboard:', profilesRes.reason)
      }
    } catch (err) {
      console.error('Unexpected error fetching dashboard data:', err)
    } finally {
      isLoading.value = false
      isRefreshing.value = false
    }
  }

  const refreshAll = async () => {
    await fetchDashboardData(true)
  }

  // ─── KPI Metrics ───
  const clientsTodayCount = computed(() => computeTodayClientCount(walkins.value))
  const totalAttendanceLogs = computed(() => attendances.value.length)
  const activePersonnelCount = computed(() => computePersonnelByStatus(profiles.value).active)
  const onTimeRate = computed(() => computeOnTimeRate(attendances.value))

  // ─── Analytics Distributions ───
  const attendanceStatusDistribution = computed(() =>
    computeAttendanceStatusDistribution(attendances.value)
  )

  const clientPurposeDistribution = computed(() =>
    computeClientPurposeDistribution(walkins.value)
  )

  const genderDistribution = computed(() =>
    computeGenderDistribution(walkins.value)
  )

  const weeklyAttendanceTrend = computed(() =>
    computeWeeklyAttendanceTrend(attendances.value)
  )

  const weeklyClientTrend = computed(() =>
    computeWeeklyClientTrend(walkins.value)
  )

  const personnelByPosition = computed(() =>
    computePersonnelByPosition(profiles.value)
  )

  const personnelByStatus = computed(() =>
    computePersonnelByStatus(profiles.value)
  )

  onMounted(() => {
    fetchDashboardData()

    // Real-time updates when attendance punch occurs
    attendanceSub = attendanceService.subscribeToAttendances(() => {
      fetchDashboardData(true)
    })
  })

  onUnmounted(() => {
    if (attendanceSub) {
      attendanceSub.unsubscribe()
      attendanceSub = null
    }
  })

  return {
    // Data
    attendances,
    walkins,
    profiles,
    isLoading,
    isRefreshing,

    // Actions
    refreshAll,

    // KPIs
    clientsTodayCount,
    totalAttendanceLogs,
    activePersonnelCount,
    onTimeRate,

    // Analytics
    attendanceStatusDistribution,
    clientPurposeDistribution,
    genderDistribution,
    weeklyAttendanceTrend,
    weeklyClientTrend,
    personnelByPosition,
    personnelByStatus,
  }
}

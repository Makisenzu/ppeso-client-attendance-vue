import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAttendanceStore } from '@/stores/kioskStore'
import { formatFullName, formatPunchTypeLabel } from '@/helpers/peso/kioskhelper'

export const useAttendanceKiosk = () => {
  const store = useAttendanceStore()

  const currentTime = ref('')
  const currentDate = ref('')
  const currentPeriod = ref('')
  let clockTimer: ReturnType<typeof setInterval> | null = null

  const updateClock = () => {
    const now = new Date()
    // e.g. "10:45:12"
    currentTime.value = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })

    // AM or PM
    currentPeriod.value = now.getHours() >= 12 ? 'PM' : 'AM'

    // e.g. "Tuesday, September 8, 2026"
    currentDate.value = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    // Prevent typing if active in an input/textarea if any
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return
    }

    if (e.key >= '0' && e.key <= '9') {
      store.appendDigit(e.key)
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      store.deleteDigit()
    } else if (e.key === 'Enter') {
      store.submitAttendance()
    } else if (e.key === 'Escape') {
      store.clearPasscode()
    }
  }

  onMounted(() => {
    updateClock()
    clockTimer = setInterval(updateClock, 1000)
    window.addEventListener('keydown', handleKeyDown)
    store.fetchTodayPunches()
    store.initRealtime()
  })

  onUnmounted(() => {
    if (clockTimer) {
      clearInterval(clockTimer)
      clockTimer = null
    }
    window.removeEventListener('keydown', handleKeyDown)
    store.cleanupRealtime()
  })

  // ─── Last punch result, formatted for display ───
  const resultPunchLabel = computed(() =>
    store.lastResult?.punchType ? formatPunchTypeLabel(store.lastResult.punchType) : 'Attendance',
  )

  const resultEmployeeName = computed(() =>
    store.lastResult?.profile ? formatFullName(store.lastResult.profile) : '',
  )

  const resultTimeDisplay = computed(() => {
    const timestamp = store.lastResult?.timestamp
    if (!timestamp) return ''
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return timestamp
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  })

  const dismissError = () => {
    store.error = null
  }

  return {
    store,
    currentTime,
    currentDate,
    currentPeriod,
    resultPunchLabel,
    resultEmployeeName,
    resultTimeDisplay,
    dismissError,
  }
}
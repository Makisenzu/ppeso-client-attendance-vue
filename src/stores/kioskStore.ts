import { defineStore } from 'pinia'
import { ref } from 'vue'
import { attendanceService } from '@/services/peso/kioskService'
import type { AttendanceResult, PunchMode } from '@/types/peso/kiosk'

export const useAttendanceStore = defineStore('attendance', () => {
  const passcode = ref('')
  const loading = ref(false)
  const lastResult = ref<AttendanceResult | null>(null)
  const error = ref<string | null>(null)
  const punchMode = ref<PunchMode>('auto')
  const countdown = ref(0)

  let autoClearTimer: ReturnType<typeof setInterval> | null = null

  const clearCountdown = () => {
    if (autoClearTimer) {
      clearInterval(autoClearTimer)
      autoClearTimer = null
    }
    countdown.value = 0
  }

  const startAutoDismiss = () => {
    clearCountdown()
    countdown.value = 6
    autoClearTimer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) {
        clearCountdown()
        lastResult.value = null
      }
    }, 1000)
  }

  const appendDigit = (digit: string) => {
    if (loading.value) return
    // If there's an error displayed, clear it when user starts typing again
    if (error.value) {
      error.value = null
    }

    if (passcode.value.length < 6) {
      passcode.value += digit
      // Auto-submit when reaching 6 digits
      if (passcode.value.length === 6) {
        // slight tick for visual feedback of the last dot
        setTimeout(() => {
          if (passcode.value.length === 6 && !loading.value) {
            submitAttendance()
          }
        }, 120)
      }
    }
  }

  const clearPasscode = () => {
    passcode.value = ''
    error.value = null
  }

  const deleteDigit = () => {
    if (loading.value) return
    passcode.value = passcode.value.slice(0, -1)
    if (error.value) {
      error.value = null
    }
  }

  const setPunchMode = (mode: PunchMode) => {
    punchMode.value = mode
  }

  const dismissResult = () => {
    clearCountdown()
    lastResult.value = null
  }

  const submitAttendance = async () => {
    if (loading.value) return

    if (passcode.value.length !== 6) {
      error.value = 'Please enter a complete 6-digit passcode.'
      return
    }

    loading.value = true
    error.value = null
    clearCountdown()

    try {
      const result = await attendanceService.processPunchByPasscode(
        passcode.value,
        punchMode.value
      )
      lastResult.value = result
      clearPasscode()
      startAutoDismiss()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An unexpected error occurred.'
      // Clear passcode so user can retry easily
      passcode.value = ''
    } finally {
      loading.value = false
    }
  }

  return {
    passcode,
    loading,
    lastResult,
    error,
    punchMode,
    countdown,
    appendDigit,
    clearPasscode,
    deleteDigit,
    setPunchMode,
    dismissResult,
    submitAttendance,
  }
})
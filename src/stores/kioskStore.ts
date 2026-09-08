import { defineStore } from 'pinia'
import { ref } from 'vue'
import { attendanceService } from '@/services/peso/kioskService'
import { supabase } from '@/services/supabase'
import type { AttendanceResult, PunchMode, KioskRecentPunch } from '@/types/peso/kiosk'

export const useAttendanceStore = defineStore('attendance', () => {
  const passcode = ref('')
  const loading = ref(false)
  const lastResult = ref<AttendanceResult | null>(null)
  const error = ref<string | null>(null)
  const punchMode = ref<PunchMode>('auto')
  const countdown = ref(0)

  // Real-time recent punches today
  const recentPunches = ref<KioskRecentPunch[]>([])
  const loadingPunches = ref(false)
  let realtimeChannel: any = null

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
    // If there's an error or previous result displayed, clear it when user starts typing again
    if (error.value) {
      error.value = null
    }
    if (lastResult.value) {
      dismissResult()
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

  const fetchTodayPunches = async () => {
    loadingPunches.value = true
    try {
      recentPunches.value = await attendanceService.getTodayRecentPunches()
    } catch (err) {
      console.error('Failed to load today punches:', err)
    } finally {
      loadingPunches.value = false
    }
  }

  const initRealtime = () => {
    if (realtimeChannel) return
    realtimeChannel = attendanceService.subscribeToTodayPunches(() => {
      fetchTodayPunches()
    })
  }

  const cleanupRealtime = () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
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

      // If successful, immediately prepend to recent punches for zero-latency feedback
      if (result.success && result.profile && result.punchType) {
        const middle = result.profile.middlename ? ` ${result.profile.middlename[0]}.` : ''
        const fullName = `${result.profile.firstname}${middle} ${result.profile.lastname}`.trim()

        const newPunch: KioskRecentPunch = {
          id: `local-${Date.now()}`,
          profileId: result.profile.id,
          fullName,
          firstName: result.profile.firstname,
          lastName: result.profile.lastname,
          position: result.profile.position || 'Employee',
          punchType: result.punchType,
          status: result.status,
          timestamp: result.timestamp || new Date().toISOString(),
        }

        recentPunches.value = [
          newPunch,
          ...recentPunches.value.filter(
            (p) => !(p.profileId === newPunch.profileId && p.punchType === newPunch.punchType)
          ),
        ]
      }

      // Re-fetch in background to sync fully with database state
      fetchTodayPunches()
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
    recentPunches,
    loadingPunches,
    appendDigit,
    clearPasscode,
    deleteDigit,
    setPunchMode,
    dismissResult,
    submitAttendance,
    fetchTodayPunches,
    initRealtime,
    cleanupRealtime,
  }
})
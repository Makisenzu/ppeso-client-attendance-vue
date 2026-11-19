import { ref } from 'vue'
import type { DtrAttendance, DtrGenerationResult } from '@/types/peso/dtr'
// Holidays are readable by every signed-in user (RLS "holidays: authenticated read").
import { holidayService } from '@/services/peso/holidayService'
import { formatMonthHeader, generateDtrData, getDtrPresetDateRange } from '@/helpers/peso/dtrHelper'

interface DtrPreviewSubject {
  /** Whose DTR (passed to the loader; '' for the signed-in user's own) */
  profileId: string
  fullName: string
  /** Any day of the month to show (yyyy-mm-dd) */
  date: string
  supervisorName?: string
  supervisorTitle?: string
}

/**
 * "View" on a daily time record: shows the person's Civil Service Form 48 for that day's month, exactly as it
 * prints (DtrPrintSheet), never the raw punches. Each role passes its own loader (RLS decides whose rows it reads).
 */
export function useDtrPreview(
  loadAttendances: (profileId: string, startDate: string, endDate: string) => Promise<DtrAttendance[]>,
) {
  const previewData = ref<DtrGenerationResult | null>(null)
  const previewMonth = ref('')
  const isPreviewLoading = ref(false)
  const previewError = ref<string | null>(null)
  /** Ignores a late answer for a record the user has already left */
  let requestId = 0

  const loadPreview = async (subject: DtrPreviewSubject) => {
    const { startDate, endDate } = getDtrPresetDateRange('wholeMonth', new Date(`${subject.date}T00:00:00`))
    previewData.value = null
    previewError.value = null
    previewMonth.value = formatMonthHeader(startDate, endDate)
    isPreviewLoading.value = true
    const id = ++requestId
    try {
      const [records, holidays] = await Promise.all([
        loadAttendances(subject.profileId, startDate, endDate),
        holidayService.getHolidaysInRange(startDate, endDate),
      ])
      if (id !== requestId) return
      previewData.value = generateDtrData(
        {
          employee: { fullName: subject.fullName },
          startDate,
          endDate,
          supervisorName: subject.supervisorName ?? '',
          supervisorTitle: subject.supervisorTitle ?? '',
          duplicateLayout: false,
          printSignatureName: true,
        },
        records,
        holidays,
      )
    } catch (err) {
      if (id !== requestId) return
      console.error('Failed to load the DTR preview.')
      previewError.value = err instanceof Error && err.message ? err.message : 'Failed to load the daily time record.'
    } finally {
      if (id === requestId) isPreviewLoading.value = false
    }
  }

  const clearPreview = () => {
    requestId++
    isPreviewLoading.value = false
    previewData.value = null
    previewError.value = null
  }

  return { previewData, previewMonth, isPreviewLoading, previewError, loadPreview, clearPreview }
}

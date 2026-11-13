import { computed } from 'vue'
import type { DtrDayRow } from '@/types/peso/dtr'
import { calculateDiagonalSlashes } from '@/helpers/peso/dtrHelper'

export interface UseDtrSlipProps {
  rows?: DtrDayRow[]
  activeStartDay?: number
  activeEndDay?: number
  totalDaysInMonth?: number
}

export function useDtrSlip(props: UseDtrSlipProps) {
  /** One slash per block of days outside the DTR period (before the start, after the end). */
  const slashSegments = computed(() =>
    calculateDiagonalSlashes(
      props.activeStartDay ?? 1,
      props.activeEndDay ?? 31,
      props.totalDaysInMonth ?? 31,
      props.rows?.length ?? 0
    )
  )

  return {
    slashSegments,
  }
}

import { computed } from 'vue'
import type { DtrDayRow } from '@/types/peso/dtr'
import { calculateDiagonalSlash } from '@/helpers/peso/dtrHelper'

export interface UseDtrSlipProps {
  rows?: DtrDayRow[]
  activeEndDay?: number
  totalDaysInMonth?: number
}

export function useDtrSlip(props: UseDtrSlipProps) {
  const slashCalculation = computed(() => {
    return calculateDiagonalSlash(
      props.activeEndDay ?? 31,
      props.totalDaysInMonth ?? 31,
      props.rows?.length ?? 0
    )
  })

  const hasDiagonalSlash = computed(() => slashCalculation.value.hasSlash)
  const slashYCoords = computed(() => slashCalculation.value.coords)

  return {
    hasDiagonalSlash,
    slashYCoords,
  }
}

import type { AnnexDHighlightColor } from '@/types/common/dataEntry'

/**
 * Highlight colors for marking ANNEX D entries. `argb` is the Excel fill (a spreadsheet colour, not a UI token);
 * `swatchClass` shows the same colour on screen. One group per colour, so the export's legend is unambiguous.
 */
export const ANNEX_D_HIGHLIGHT_COLORS: { value: AnnexDHighlightColor; label: string; argb: string; swatchClass: string }[] = [
  { value: 'yellow', label: 'Yellow', argb: 'FFFFFF00', swatchClass: 'bg-yellow-300' },
  { value: 'green', label: 'Green', argb: 'FF92D050', swatchClass: 'bg-green-400' },
  { value: 'blue', label: 'Blue', argb: 'FF9BC2E6', swatchClass: 'bg-sky-300' },
  { value: 'orange', label: 'Orange', argb: 'FFF4B084', swatchClass: 'bg-orange-300' },
  { value: 'pink', label: 'Pink', argb: 'FFFF99CC', swatchClass: 'bg-pink-300' },
  { value: 'purple', label: 'Purple', argb: 'FFCCC0DA', swatchClass: 'bg-violet-300' },
  { value: 'red', label: 'Red', argb: 'FFFF7C80', swatchClass: 'bg-red-400' },
  { value: 'gray', label: 'Gray', argb: 'FFBFBFBF', swatchClass: 'bg-zinc-400' },
]

/** Longest reason accepted (it is written into one legend cell of the export) */
export const HIGHLIGHT_REASON_MAX = 120

export function highlightColorOption(color: AnnexDHighlightColor) {
  return ANNEX_D_HIGHLIGHT_COLORS.find((c) => c.value === color) ?? ANNEX_D_HIGHLIGHT_COLORS[0]
}

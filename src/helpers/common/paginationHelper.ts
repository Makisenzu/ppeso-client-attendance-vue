/** 1-based first and last row numbers shown on a page ("Showing 11 to 20 of 45"). */
export function getPageRange(currentPage: number, pageSize: number, total: number): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: 0 }
  const start = (currentPage - 1) * pageSize + 1
  return { start, end: Math.min(currentPage * pageSize, total) }
}

/** Sliding window of page numbers (default 5) centred on the current page. */
export function getVisiblePages(currentPage: number, totalPages: number, windowSize = 5): number[] {
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const half = Math.floor(windowSize / 2)
  let start = Math.max(1, currentPage - half)
  const end = Math.min(totalPages, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

/** Share of `part` in `total` as a whole percentage (0 when total is 0). */
export function toPercentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

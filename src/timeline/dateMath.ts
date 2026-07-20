// Pure 'YYYY-MM' month arithmetic used throughout the timeline. Deliberately
// avoids Date objects — the projection engine and this app only ever deal in
// whole calendar months, and Date/TZ conversions are a common source of
// off-by-one bugs at month granularity.

export interface YearMonth {
  y: number
  m: number // 1-12
}

export function parseYm(ym: string): YearMonth {
  const [y, m] = ym.split('-').map(Number)
  return { y, m }
}

export function formatYm(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`
}

/** Zero-based number of months `ym` is after `from` (negative if before). */
export function monthIndex(ym: string, from: string): number {
  const a = parseYm(ym)
  const b = parseYm(from)
  return (a.y - b.y) * 12 + (a.m - b.m)
}

/** `ym` shifted by `delta` whole months (delta may be negative). */
export function addMonths(ym: string, delta: number): string {
  const { y, m } = parseYm(ym)
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = total - ny * 12 + 1
  return formatYm(ny, nm)
}

/** Inclusive month count spanned between `from` and `to` (both 'YYYY-MM'). */
export function monthSpan(from: string, to: string): number {
  return monthIndex(to, from) + 1
}

/**
 * Clamp `ym` into the inclusive ['min', 'max'] range. Plain string comparison
 * is safe here because zero-padded 'YYYY-MM' sorts lexicographically in the
 * same order as chronologically.
 */
export function clampYm(ym: string, min: string, max: string): string {
  if (ym < min) return min
  if (ym > max) return max
  return ym
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortMonthLabel(ym: string): string {
  const { y, m } = parseYm(ym)
  return `${MONTH_LABELS[m - 1]} ${y}`
}

/**
 * Round a horizontal pixel delta to the nearest whole month at the given
 * scale, or the nearest multiple of `snapMonths` when a coarser snap unit is
 * requested (e.g. 12 to snap to whole years at zoomed-out granularities).
 */
export function pxDeltaToMonths(deltaPx: number, pxPerMonth: number, snapMonths = 1): number {
  if (pxPerMonth <= 0) return 0
  return Math.round(deltaPx / pxPerMonth / snapMonths) * snapMonths
}

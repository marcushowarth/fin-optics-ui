// Column scale for the timeline's time axis — the DOM/CSS-grid replacement
// for ECharts' dataZoom (see ticket #946). 30 years is 360 months, too many
// literal columns to render at a readable width at once, so the widget picks
// a granularity (month/quarter/year) and the user scrolls horizontally
// through it, like a calendar app's agenda view.
//
// Default: quarter granularity + horizontal scroll, with a month/quarter/year
// toggle. Quarter is the sweet spot for a 30-year plan — month is too fine
// (360 columns) to eyeball overlaps at a glance, year is too coarse to see
// mid-year start/end months precisely; quarter (120 columns) balances both.

import { addMonths, formatYm, monthIndex, parseYm } from './dateMath'

export type Granularity = 'month' | 'quarter' | 'year'

export const GRANULARITIES: Granularity[] = ['month', 'quarter', 'year']

export const MONTHS_PER_COLUMN: Record<Granularity, number> = {
  month: 1,
  quarter: 3,
  year: 12,
}

// Column pixel widths, tuned per granularity so labels fit without crowding:
// a "Q1 2026" label needs more room than "2026", and month columns are 4x as
// numerous as quarter ones so are kept narrower but still comfortably
// clickable/draggable.
export const COLUMN_WIDTH_PX: Record<Granularity, number> = {
  month: 34,
  quarter: 64,
  year: 96,
}

export function pxPerMonth(granularity: Granularity): number {
  return COLUMN_WIDTH_PX[granularity] / MONTHS_PER_COLUMN[granularity]
}

/**
 * Calendar-aligned start of the column containing `ym` — quarters start on
 * Jan/Apr/Jul/Oct, years on Jan — regardless of where the timeline's `from`
 * falls, matching how a calendar app buckets dates.
 */
export function columnStart(ym: string, granularity: Granularity): string {
  const { y, m } = parseYm(ym)
  if (granularity === 'month') return ym
  if (granularity === 'year') return formatYm(y, 1)
  const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1
  return formatYm(y, qStartMonth)
}

function columnLabel(start: string, granularity: Granularity): string {
  const { y, m } = parseYm(start)
  if (granularity === 'year') return `${y}`
  if (granularity === 'quarter') return `Q${Math.floor((m - 1) / 3) + 1} ${y}`
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${MONTH_LABELS[m - 1]} ${y}`
}

export interface TimelineColumn {
  /** Header label, e.g. 'Jan 2026', 'Q1 2026', '2026'. */
  label: string
  /** Width of this column in months — the first/last column may be a partial
   *  period if `from`/`to` isn't calendar-aligned to the chosen granularity. */
  months: number
}

/**
 * Header columns spanning ['from', 'to'] inclusive, bucketed calendar-aligned
 * at the given granularity. Sequential column widths (in months) always sum
 * to monthSpan(from, to), so laying them out left-to-right with width =
 * months * pxPerMonth stays pixel-aligned with bars positioned absolutely via
 * monthIndex(x, from) * pxPerMonth — both share the same origin and scale.
 */
export function buildColumns(from: string, to: string, granularity: Granularity): TimelineColumn[] {
  const columns: TimelineColumn[] = []
  const totalMonths = monthIndex(to, from) + 1
  if (totalMonths <= 0) return columns

  let cursor = from
  while (monthIndex(cursor, from) < totalMonths) {
    const start = columnStart(cursor, granularity)
    const nextStart = addMonths(start, MONTHS_PER_COLUMN[granularity])
    // Clip to the visible [from, to] window - first/last column may be partial.
    const visibleStartIdx = Math.max(monthIndex(start, from), 0)
    const visibleEndIdx = Math.min(monthIndex(nextStart, from), totalMonths)
    columns.push({ label: columnLabel(start, granularity), months: visibleEndIdx - visibleStartIdx })
    cursor = nextStart
  }
  return columns
}

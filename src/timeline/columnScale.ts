// Column scale for the timeline's time axis — the DOM/CSS-grid replacement
// for ECharts' dataZoom (see ticket #946). 30 years is 360 months, too many
// literal columns to render at a readable width at once, so the widget picks
// a granularity (month/quarter/year/fiveYear/decade) and the user scrolls
// horizontally through it, like a calendar app's agenda view.
//
// Default: quarter granularity + horizontal scroll, with a month → quarter →
// year → fiveYear → decade toggle (in zoom-out order). Quarter is the sweet
// spot for a 30-year plan — month is too fine (360 columns) to eyeball
// overlaps at a glance, year is too coarse to see mid-year start/end months
// precisely; quarter (120 columns) balances both.
//
// fiveYear/decade exist for a different job than month/quarter/year: getting
// a rough sense of the landscape on a long-horizon "what if" (e.g. "what if
// we sell the house a couple years later than planned") by zooming way out,
// dragging a bar roughly into place, then zooming back in (year → quarter →
// month) to nail the exact date. Because that first pass is deliberately
// rough, drag/resize at fiveYear/decade snaps to whole years rather than
// whole months (see SNAP_MONTHS below) — below ~2px/month, month-level snap
// is both pixel-meaningless and prone to jitter. month/quarter/year keep
// exact month-level snapping unchanged, since their pixel widths (8-34px/
// month) comfortably support it and real financial dates (a mortgage
// maturing in March, a job ending in June) shouldn't be forced onto coarser
// boundaries where the pixel math doesn't require it.

import { addMonths, formatYm, monthIndex, parseYm } from './dateMath'

export type Granularity = 'month' | 'quarter' | 'year' | 'fiveYear' | 'decade'

export const GRANULARITIES: Granularity[] = ['month', 'quarter', 'year', 'fiveYear', 'decade']

export const MONTHS_PER_COLUMN: Record<Granularity, number> = {
  month: 1,
  quarter: 3,
  year: 12,
  fiveYear: 60,
  decade: 120,
}

// Column pixel widths, tuned per granularity so labels fit without crowding:
// a "Q1 2026" label needs more room than "2026", and month columns are 4x as
// numerous as quarter ones so are kept narrower but still comfortably
// clickable/draggable. fiveYear's "2026–30" range label needs a bit more
// room than a bare year, and decade's "2020s" is short but still gets a
// generous width since decade columns are so few and far between.
export const COLUMN_WIDTH_PX: Record<Granularity, number> = {
  month: 34,
  quarter: 64,
  year: 96,
  fiveYear: 108,
  decade: 116,
}

// Snap unit (in whole months) that drag/resize should round deltas to at
// each granularity — see the zoom-out rationale in the file header comment.
export const SNAP_MONTHS: Record<Granularity, number> = {
  month: 1,
  quarter: 1,
  year: 1,
  fiveYear: 12,
  decade: 12,
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
  if (granularity === 'fiveYear') return formatYm(Math.floor(y / 5) * 5, 1)
  if (granularity === 'decade') return formatYm(Math.floor(y / 10) * 10, 1)
  const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1
  return formatYm(y, qStartMonth)
}

function columnLabel(start: string, granularity: Granularity): string {
  const { y, m } = parseYm(start)
  if (granularity === 'year') return `${y}`
  if (granularity === 'fiveYear') return `${y}–${String(y + 4).slice(-2)}`
  if (granularity === 'decade') return `${y}s`
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

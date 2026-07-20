// Per-item timeline geometry: what date range (or point) to draw for each
// FinancialItem type, plus the pure edit operations the drag interactions
// apply (shift dates / resize end). Kept framework-free so it's unit-testable
// without mounting the component.

import { addMonths, clampYm } from './dateMath'
import type { FinancialItem, InvestmentItem } from '../types'

/**
 * The last recorded month in a NominalProjection's itemPositions series for
 * `name` — this IS the payoff/depletion month already, because the engine
 * (Liability.iterate / Investment.iterate in fin-model) stops recording once
 * balance/pot hits zero. If the item never hits zero within the horizon, the
 * series simply runs through `to`, which reads identically to an open-ended
 * bar drawn to the horizon — no special-casing needed here.
 *
 * Returns null when there's no projection result yet (nothing has been run),
 * or the item has no series under this name.
 */
export function inferredEndMonth(
  name: string,
  itemPositions: Record<string, Record<string, number>> | undefined | null,
): string | null {
  const series = itemPositions?.[name]
  if (!series) return null
  const months = Object.keys(series)
  if (months.length === 0) return null
  // 'YYYY-MM' zero-padded keys sort lexicographically = chronologically.
  return months.reduce((max, m) => (m > max ? m : max))
}

export type ItemSpanKind = 'bar' | 'point'

export interface ItemSpan {
  kind: ItemSpanKind
  /** Inclusive start month (bar), or the marker's date (point). */
  start: string
  /** Inclusive end month. For an open-ended bar this is clamped to `to`. */
  end: string
  /** True when the item has no concrete end and `end` was clamped to the timeline horizon. */
  openEnded: boolean
  /** True when `end` came from the inferred-payoff/depletion helper rather than a stored field. */
  endInferred: boolean
}

/**
 * Resolve what to draw for one item: a point marker (FinancialEventItem) or a
 * bar spanning [start, end], both clamped into the visible [from, to] window.
 */
export function computeItemSpan(
  item: FinancialItem,
  from: string,
  to: string,
  itemPositions: Record<string, Record<string, number>> | undefined | null,
): ItemSpan {
  if (item.type === 'event') {
    const d = clampYm(item.date, from, to)
    return { kind: 'point', start: d, end: d, openEnded: false, endInferred: false }
  }

  const start = clampYm(item.start, from, to)
  let end: string | undefined
  let endInferred = false

  switch (item.type) {
    case 'asset':
      end = item.saleDate
      break
    case 'income':
    case 'expenditure':
      end = item.end
      break
    case 'liability':
    case 'investment': {
      const inferred = inferredEndMonth(item.name, itemPositions)
      if (inferred) {
        end = inferred
        endInferred = true
      }
      break
    }
  }

  const openEnded = !end
  const resolvedEnd = end ? clampYm(end, from, to) : to

  return { kind: 'bar', start, end: resolvedEnd, openEnded, endInferred }
}

/**
 * Shift a bar item's dates by `deltaMonths`, preserving duration for the
 * types with a real editable end field (asset saleDate / income & expenditure
 * end). Investment's `drawdownStart` shifts along with `start` so the
 * accumulation/drawdown split stays proportionally the same. Liability has no
 * stored end to shift. A no-op FinancialEventItem case is included only for
 * exhaustiveness — the UI never offers horizontal drag on point markers.
 */
export function shiftItemDates(item: FinancialItem, deltaMonths: number): FinancialItem {
  if (deltaMonths === 0) return item
  switch (item.type) {
    case 'asset':
      return {
        ...item,
        start: addMonths(item.start, deltaMonths),
        saleDate: item.saleDate ? addMonths(item.saleDate, deltaMonths) : item.saleDate,
      }
    case 'income':
    case 'expenditure':
      return {
        ...item,
        start: addMonths(item.start, deltaMonths),
        end: item.end ? addMonths(item.end, deltaMonths) : item.end,
      }
    case 'liability':
      return { ...item, start: addMonths(item.start, deltaMonths) }
    case 'investment':
      return {
        ...item,
        start: addMonths(item.start, deltaMonths),
        drawdownStart: item.drawdownStart ? addMonths(item.drawdownStart, deltaMonths) : item.drawdownStart,
      }
    case 'event':
      return { ...item, date: addMonths(item.date, deltaMonths) }
  }
}

/**
 * Set a bar item's editable end field to `newEnd` (asset saleDate / income &
 * expenditure end). No-op for types without a real editable end field —
 * Investment/Liability right-edge drag isn't offered in the UI (see #946:
 * drawdown rate is authoritative for Investment, there's nothing to write to).
 */
export function resizeItemEnd(item: FinancialItem, newEnd: string): FinancialItem {
  switch (item.type) {
    case 'asset':
      return { ...item, saleDate: newEnd }
    case 'income':
    case 'expenditure':
      return { ...item, end: newEnd }
    default:
      return item
  }
}

/** Whether the UI offers a right-edge resize handle for this item type. */
export function isResizable(item: FinancialItem): boolean {
  return item.type === 'asset' || item.type === 'income' || item.type === 'expenditure'
}

/** Whether an Investment has a drawdown phase to colour (stretch goal, #946 step 7). */
export function hasDrawdownPhase(item: FinancialItem): item is InvestmentItem {
  return item.type === 'investment' && !!item.drawdownStart
}

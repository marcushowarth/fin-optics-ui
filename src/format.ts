export function money(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000_000_000) return `${sign}£${(abs / 1_000_000_000_000).toFixed(2)}tn`
  if (abs >= 1_000_000_000)     return `${sign}£${(abs / 1_000_000_000).toFixed(2)}bn`
  if (abs >= 1_000_000)         return `${sign}£${(abs / 1_000_000).toFixed(2)}m`
  if (abs >= 1_000)             return `${sign}£${(abs / 1_000).toFixed(0)}k`
  return `${sign}£${abs.toFixed(0)}`
}

// Exact (non-abbreviated) £ formatting for a single item's fields — money()
// above is deliberately lossy (k/m/bn) for chart axis labels where the scale
// varies hugely; item-level amounts are the figures the user typed into
// ItemForm.vue and should read back precisely, with thousands separators.
export function formatCurrency(v: number, maximumFractionDigits = 2): string {
  return v.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits })
}

// Exact pounds below £10k, then falls back to money()'s k/m abbreviation —
// avoids money()'s harsh cutover at £1,000 (where £999 and £2,000 look wildly
// different in precision) for the modest-scale values a monthly cash flow
// tooltip shows side by side, while still keeping a rare large flow compact.
// Math.abs() keeps the £10k band symmetric either side of zero.
export function formatFlow(v: number): string {
  return Math.abs(v) >= 10_000 ? money(v) : formatCurrency(v, 0)
}

// Whole years between a 'YYYY-MM' date of birth and a chart timestamp (ms).
export function ageAtTimestamp(ts: number, dobYearMonth: string): number {
  const [dobY, dobM] = dobYearMonth.split('-').map(Number)
  const d = new Date(ts)
  const totalMonths = (d.getUTCFullYear() - dobY) * 12 + (d.getUTCMonth() - (dobM - 1))
  return Math.floor(totalMonths / 12)
}

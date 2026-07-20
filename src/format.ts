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
export function formatCurrency(v: number): string {
  return v.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 })
}

// Whole years between a 'YYYY-MM' date of birth and a chart timestamp (ms).
export function ageAtTimestamp(ts: number, dobYearMonth: string): number {
  const [dobY, dobM] = dobYearMonth.split('-').map(Number)
  const d = new Date(ts)
  const totalMonths = (d.getUTCFullYear() - dobY) * 12 + (d.getUTCMonth() - (dobM - 1))
  return Math.floor(totalMonths / 12)
}

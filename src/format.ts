export function money(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000_000_000) return `${sign}£${(abs / 1_000_000_000_000).toFixed(2)}tn`
  if (abs >= 1_000_000_000)     return `${sign}£${(abs / 1_000_000_000).toFixed(2)}bn`
  if (abs >= 1_000_000)         return `${sign}£${(abs / 1_000_000).toFixed(2)}m`
  if (abs >= 1_000)             return `${sign}£${(abs / 1_000).toFixed(0)}k`
  return `${sign}£${abs.toFixed(0)}`
}

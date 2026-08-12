export type Series = { name: string; data: (number | null)[] }

// One nominal line plus one real-terms line per inflation scenario. Shared by
// CashPositionChart.vue and NetWorthChart.vue — both build a Series[] the
// same way from their respective nominal/real result maps.
export function buildSeries(
  months: string[],
  nominal: Record<string, number>,
  real: Record<string, Record<string, number>> | undefined,
): Series[] {
  const series: Series[] = [{ name: 'Nominal', data: months.map(m => nominal[m] ?? null) }]
  if (real) {
    for (const scenario of Object.keys(real)) {
      series.push({ name: `Real · ${scenario}`, data: months.map(m => real[scenario]?.[m] ?? null) })
    }
  }
  return series
}

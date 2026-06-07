<script setup lang="ts">
import { computed } from 'vue'
import { useProjectionStore } from '../stores/projection'
import ProjectionChart from './ProjectionChart.vue'
import { money } from '../format'

const store = useProjectionStore()

const warnings = computed(() => store.result?.nominal.warnings ?? [])
const warningMonths = computed(() => warnings.value.map(w => w.month))
const firstBreach = computed(() => warnings.value[0] ?? null)

const months = computed(() => Object.keys(store.result?.nominal.netWorth ?? {}).sort())

type Series = { name: string; data: (number | null)[] }

// One nominal line plus one real-terms line per inflation scenario.
function build(
  nominal: Record<string, number>,
  real: Record<string, Record<string, number>> | undefined,
): Series[] {
  const ms = months.value
  const series: Series[] = [{ name: 'Nominal', data: ms.map(m => nominal[m] ?? null) }]
  if (real) {
    for (const scenario of Object.keys(real)) {
      series.push({ name: `Real · ${scenario}`, data: ms.map(m => real[scenario]?.[m] ?? null) })
    }
  }
  return series
}

const netWorthSeries = computed<Series[]>(() => {
  const r = store.result
  if (!r) return []
  return build(r.nominal.netWorth, r.realTerms?.netWorth)
})

const cashSeries = computed<Series[]>(() => {
  const r = store.result
  if (!r) return []
  return build(r.nominal.cashPosition, r.realTerms?.cashPosition)
})
</script>

<template>
  <div v-if="store.result" class="charts">
    <p v-if="firstBreach" class="solvency-warning">
      ⚠ Cash goes negative in {{ warnings.length }} month{{ warnings.length === 1 ? '' : 's' }} —
      first breach {{ firstBreach.month }} ({{ money(firstBreach.cashPosition) }})
    </p>
    <section class="chart-block">
      <h3 class="chart-title">Net Worth</h3>
      <p class="chart-sub">Everything you own minus everything you owe, projected over time.</p>
      <ProjectionChart :months="months" :series="netWorthSeries" />
    </section>

    <section class="chart-block">
      <h3 class="chart-title">Cash Position</h3>
      <p class="chart-sub">Liquid cash running balance — red bands mark months it goes negative.</p>
      <ProjectionChart
        :months="months"
        :series="cashSeries"
        :warnings="warningMonths"
        :zero-line="true"
      />
    </section>
  </div>
</template>

<style scoped>
.charts {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1.25rem;
}
.solvency-warning {
  margin: 0;
  padding: 0.6rem 0.8rem;
  background: #fdecea;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #a4232f;
  font-size: 0.85rem;
}
.chart-block { display: flex; flex-direction: column; }
.chart-title { margin: 0; font-size: 1.05rem; }
.chart-sub { margin: 0.15rem 0 0.4rem; color: #777; font-size: 0.8rem; }
</style>

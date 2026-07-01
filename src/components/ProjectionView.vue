<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProjectionStore } from '../stores/projection'
import ProjectionChart from './ProjectionChart.vue'
import { money } from '../format'

const store = useProjectionStore()

const granular = ref(false)
const infoExpanded = ref(false)
const infoHidden = ref(localStorage.getItem('fin-optics-info-hidden') === '1')

function hideInfo() {
  infoHidden.value = true
  localStorage.setItem('fin-optics-info-hidden', '1')
}
function showInfo() {
  infoHidden.value = false
  localStorage.removeItem('fin-optics-info-hidden')
}

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

const netWorthItemSeries = computed<Series[]>(() => {
  const r = store.result
  if (!r) return []
  const ms = months.value
  return Object.entries(r.nominal.itemPositions).map(([name, values]) => ({
    name,
    data: ms.map(m => values[m] ?? null),
  }))
})

const cashSeries = computed<Series[]>(() => {
  const r = store.result
  if (!r) return []
  return build(r.nominal.cashPosition, r.realTerms?.cashPosition)
})
</script>

<template>
  <div v-if="store.result" class="charts">
    <section class="chart-block">
      <h3 class="chart-title">Cash Position</h3>
      <p class="chart-sub">Liquid cash running balance — red bands mark months it goes negative.</p>
      <ProjectionChart
        :months="months"
        :series="cashSeries"
        :warnings="warningMonths"
        :zero-line="true"
        :primary-only="true"
      />
    </section>

    <p v-if="firstBreach" class="solvency-warning">
      ⚠ Cash goes negative in {{ warnings.length }} month{{ warnings.length === 1 ? '' : 's' }} —
      first breach {{ firstBreach.month }} ({{ money(firstBreach.cashPosition) }})
    </p>

    <div v-if="!infoHidden" class="scenario-note">
      <span class="info-text">
        <strong>Nominal</strong> is the projected value in the pounds of each future year.
        <template v-if="infoExpanded">
          <strong>Real</strong> lines restate it in <em>today's</em> money after inflation, under three
          assumptions — <strong>low</strong>, <strong>base</strong> and <strong>high</strong> annual
          inflation — so you can see how much spending power the headline figure really holds.
          Charts open on Nominal only; click a name in the legend to add a scenario.
        </template>
      </span>
      <span class="info-controls">
        <a v-if="!infoExpanded" class="info-link" @click="infoExpanded = true">[show more]</a>
        <a v-else class="info-link" @click="infoExpanded = false">[show less]</a>
        · <a class="info-link" @click="hideInfo">[hide]</a>
      </span>
    </div>
    <p v-else class="info-restore">
      <a class="info-link" @click="showInfo">ℹ Show explanation</a>
    </p>

    <section class="chart-block">
      <div class="chart-header">
        <div>
          <h3 class="chart-title">Net Worth</h3>
          <p class="chart-sub">Everything you own minus everything you owe, projected over time.</p>
        </div>
        <button class="granular-btn" :class="{ active: granular }" @click="granular = !granular">
          {{ granular ? 'Total' : 'Breakdown' }}
        </button>
      </div>
      <ProjectionChart
        :key="granular ? 'nw-items' : 'nw-total'"
        :months="months"
        :series="granular ? netWorthItemSeries : netWorthSeries"
        :primary-only="!granular"
        :stacked="granular"
        :zero-line="granular"
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
.scenario-note {
  margin: 0;
  padding: 0.5rem 0.8rem;
  background: #f4f7fa;
  border: 1px solid #e1e8ef;
  border-radius: 4px;
  color: #555;
  font-size: 0.82rem;
  line-height: 1.45;
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  flex-wrap: wrap;
}
.info-text { flex: 1; }
.info-controls { white-space: nowrap; color: #888; font-size: 0.8rem; }
.info-link { color: #3a7bc8; cursor: pointer; text-decoration: none; }
.info-link:hover { text-decoration: underline; }
.info-restore { margin: 0; font-size: 0.8rem; }
.chart-block { display: flex; flex-direction: column; }
.chart-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
.chart-title { margin: 0; font-size: 1.05rem; }
.chart-sub { margin: 0.15rem 0 0.4rem; color: #777; font-size: 0.8rem; }
.granular-btn {
  flex-shrink: 0;
  padding: 0.25rem 0.65rem;
  font-size: 0.78rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #555;
  cursor: pointer;
  margin-top: 0.15rem;
}
.granular-btn:hover { border-color: #1a5c3a; color: #1a5c3a; }
.granular-btn.active { background: #1a5c3a; border-color: #1a5c3a; color: #fff; }
</style>

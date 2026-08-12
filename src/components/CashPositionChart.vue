<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProjectionStore } from '../stores/projection'
import ProjectionChart from './ProjectionChart.vue'
import { buildSeries } from '../lib/series'
import { money } from '../format'

const store = useProjectionStore()

const ageFrom = computed(() => (store.showAge && store.dateOfBirth ? store.dateOfBirth : null))
const months = computed(() => Object.keys(store.result?.nominal.netWorth ?? {}).sort())

const cashGranular = ref(false)
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

const cashSeries = computed(() => {
  const r = store.result
  if (!r) return []
  return buildSeries(months.value, r.nominal.cashPosition, r.realTerms?.cashPosition)
})

const cashFlowItemSeries = computed(() => {
  const r = store.result
  if (!r) return []
  return Object.entries(r.nominal.itemFlows).map(([name, values]) => ({
    name,
    data: months.value.map(m => values[m] ?? null),
  }))
})
</script>

<template>
  <div v-if="store.result" class="chart-panel">
    <div class="chart-header">
      <div>
        <h3 class="chart-title">Cash Position</h3>
        <p class="chart-sub">
          {{ cashGranular
            ? 'Monthly cash flow per item — income adds, expenditure/repayments/drawdowns subtract.'
            : 'Liquid cash running balance — shaded red below zero.' }}
        </p>
      </div>
      <button
        class="granular-btn"
        :class="{ active: cashGranular }"
        @click="cashGranular = !cashGranular"
      >
        {{ cashGranular ? 'Total' : 'Breakdown' }}
      </button>
    </div>
    <ProjectionChart
      :key="cashGranular ? 'cash-items' : 'cash-total'"
      :months="months"
      :series="cashGranular ? cashFlowItemSeries : cashSeries"
      :warnings="warningMonths"
      :zero-line="true"
      :primary-only="!cashGranular"
      :stacked="cashGranular"
      :liquidity-colors="!cashGranular"
      :value-unit="cashGranular ? '/mo' : undefined"
      :age-from="ageFrom"
    />

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
  </div>
</template>

<style scoped>
.chart-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

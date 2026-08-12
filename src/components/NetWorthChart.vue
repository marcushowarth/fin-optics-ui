<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProjectionStore } from '../stores/projection'
import ProjectionChart from './ProjectionChart.vue'
import { buildSeries } from '../lib/series'

const store = useProjectionStore()

const ageFrom = computed(() => (store.showAge && store.dateOfBirth ? store.dateOfBirth : null))
const months = computed(() => Object.keys(store.result?.nominal.netWorth ?? {}).sort())

const granular = ref(false)

const netWorthSeries = computed(() => {
  const r = store.result
  if (!r) return []
  return buildSeries(months.value, r.nominal.netWorth, r.realTerms?.netWorth)
})

const netWorthItemSeries = computed(() => {
  const r = store.result
  if (!r) return []
  return Object.entries(r.nominal.itemPositions).map(([name, values]) => ({
    name,
    data: months.value.map(m => values[m] ?? null),
  }))
})
</script>

<template>
  <div v-if="store.result" class="chart-panel">
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
      :age-from="ageFrom"
    />
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

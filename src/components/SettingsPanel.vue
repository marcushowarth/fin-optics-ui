<script setup lang="ts">
import { useProjectionStore } from '../stores/projection'
import MonthPicker from './MonthPicker.vue'
import type { ScenarioDefinition } from '../types'

const store = useProjectionStore()

// Stored rates are decimals (0.035); shown as percentages (3.5).
const toPercent = (d: number) => Math.round(d * 1e6) / 1e4

function setRate(s: ScenarioDefinition, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  s.annualRate = raw === '' ? 0 : Number(raw) / 100
}

function addScenario() {
  store.scenarios.push({ name: 'new', annualRate: 0.03 })
}

function removeScenario(i: number) {
  store.scenarios.splice(i, 1)
}
</script>

<template>
  <details class="settings">
    <summary>Settings — assumptions</summary>
    <div class="body">
      <section>
        <h3>Projection window</h3>
        <div class="rows">
          <label>From <input type="month" v-model="store.from" /></label>
          <label>To <input type="month" v-model="store.to" /></label>
          <label>Real-terms base <input type="month" v-model="store.base" /></label>
          <label>Starting cash at From (£) <input class="cash" type="number" step="0.01" v-model.number="store.startingCash" /></label>
        </div>
      </section>

      <section>
        <h3>Inflation scenarios</h3>
        <div class="scenario-row" v-for="(s, i) in store.scenarios" :key="i">
          <input class="sc-name" type="text" v-model="s.name" placeholder="name" />
          <input class="sc-rate" type="number" step="0.001" :value="toPercent(s.annualRate)" @change="setRate(s, $event)" />
          <span class="pct">%</span>
          <button class="remove" aria-label="Remove scenario" :disabled="store.scenarios.length <= 1" @click="removeScenario(i)">✕</button>
        </div>
        <button class="add" @click="addScenario">+ Add scenario</button>
      </section>

      <section>
        <h3>Age</h3>
        <div class="rows">
          <label>
            <input type="checkbox" v-model="store.showAge" />
            Show age instead of calendar date
          </label>
          <label>
            Date of birth
            <MonthPicker v-model="store.dateOfBirth" />
          </label>
        </div>
      </section>
    </div>
  </details>
</template>

<style scoped>
.settings {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}
summary { cursor: pointer; font-weight: 600; color: #555; padding: 0.3rem 0; }
.body { display: flex; flex-wrap: wrap; gap: 1.5rem; padding: 0.75rem 0 0.5rem; }
section { min-width: 14rem; }
h3 { margin: 0 0 0.5rem; font-size: 0.8rem; color: #777; text-transform: uppercase; letter-spacing: 0.03em; }
.rows { display: flex; flex-direction: column; gap: 0.4rem; }
label { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
input { font: inherit; padding: 0.2rem 0.3rem; border: 1px solid #ddd; border-radius: 3px; }
input:focus { border-color: #1a5c3a; outline: none; }
.scenario-row { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.4rem; }
.cash { width: 7rem; text-align: right; }
.sc-name { width: 6rem; }
.sc-rate { width: 5rem; text-align: right; }
.pct { color: #777; }
.remove { background: none; border: none; color: #999; cursor: pointer; }
.remove:hover:not(:disabled) { color: #c00; }
.remove:disabled { color: #ddd; cursor: not-allowed; }
.add { margin-top: 0.25rem; background: none; border: 1px solid #1a5c3a; color: #1a5c3a; border-radius: 4px; padding: 0.25rem 0.6rem; cursor: pointer; font-size: 0.85rem; }
</style>

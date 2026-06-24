<script setup lang="ts">
import { useProjectionStore } from '../stores/projection'
import type { ItemType, FinancialItem } from '../types'

const store = useProjectionStore()

const TYPE_LABELS: Record<ItemType, string> = {
  'asset':        'Asset',
  'investment':   'Investment',
  'bank-account': 'Bank Account',
  'income':       'Income',
  'expenditure':  'Expenditure',
  'liability':    'Liability',
  'event':        'One-off',
}

// Which underlying property each shared column maps to, per type. null = the
// column doesn't apply (empty cell). This is what aligns common fields
// vertically — every start date in one column, every rate in another.
const START_FIELD: Record<ItemType, string | null> = {
  'asset': 'start', 'investment': 'start', 'bank-account': null,
  'income': 'start', 'expenditure': 'start', 'liability': 'start', 'event': 'date',
}
const END_FIELD: Record<ItemType, string | null> = {
  'asset': null, 'investment': null, 'bank-account': null,
  'income': 'end', 'expenditure': 'end', 'liability': null, 'event': null,
}
const AMOUNT_FIELD: Record<ItemType, string | null> = {
  'asset': 'startValue', 'investment': 'startValue', 'bank-account': 'startBalance',
  'income': 'monthlyAmount', 'expenditure': 'monthlyAmount', 'liability': 'balance', 'event': 'amount',
}
const RATE_FIELD: Record<ItemType, string | null> = {
  'asset': 'annualGrowthRate', 'investment': 'annualGrowthRate', 'bank-account': null,
  'income': 'annualGrowthRate', 'expenditure': 'annualGrowthRate', 'liability': 'annualInterestRate', 'event': null,
}

// Stored rates are decimals (0.03); the grid shows them as percentages (3).
// Round to absorb float noise, e.g. 0.035 * 100 = 3.4999999999999996.
const toPercent = (d: number) => Math.round(d * 1e6) / 1e4

function field(item: FinancialItem, name: string | null): unknown {
  return name ? (item as Record<string, unknown>)[name] : undefined
}

// Reuse the store update path: clone, set (or clear) one field, replace.
function setField(i: number, name: string | null, value: unknown) {
  if (!name) return
  const updated = { ...store.items[i] } as Record<string, unknown>
  if (value === undefined || value === '') delete updated[name]
  else updated[name] = value
  store.updateItem(i, updated as unknown as FinancialItem)
}

function onName(i: number, e: Event) {
  setField(i, 'name', (e.target as HTMLInputElement).value)
}
function onText(i: number, name: string | null, e: Event) {
  setField(i, name, (e.target as HTMLInputElement).value)
}
function onNumber(i: number, name: string | null, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '') return
  setField(i, name, Number(raw))
}
function onRate(i: number, name: string | null, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '') return
  setField(i, name, Number(raw) / 100)
}
</script>

<template>
  <div class="plan-grid">
    <h2>Items ({{ store.items.length }})</h2>
    <p v-if="store.items.length === 0" class="empty">No items yet.</p>
    <table v-else>
      <thead>
        <tr>
          <th>Type</th>
          <th>Name</th>
          <th>Start</th>
          <th>End</th>
          <th class="num">Amount / Value (£)</th>
          <th class="num">Rate (%)</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, i) in store.items" :key="i" :class="{ editing: store.editingIndex === i }">
          <td><span class="type-badge">{{ TYPE_LABELS[item.type] }}</span></td>
          <td>
            <input class="cell name" type="text" :value="item.name" @change="onName(i, $event)" />
          </td>
          <td>
            <input
              v-if="START_FIELD[item.type]" class="cell" type="month"
              :value="field(item, START_FIELD[item.type])"
              @change="onText(i, START_FIELD[item.type], $event)"
            />
          </td>
          <td>
            <input
              v-if="END_FIELD[item.type]" class="cell" type="month"
              :value="field(item, END_FIELD[item.type]) ?? ''"
              @change="onText(i, END_FIELD[item.type], $event)"
            />
          </td>
          <td class="num">
            <input
              v-if="AMOUNT_FIELD[item.type]" class="cell num" type="number" step="0.01"
              :value="field(item, AMOUNT_FIELD[item.type])"
              @change="onNumber(i, AMOUNT_FIELD[item.type], $event)"
            />
          </td>
          <td class="num">
            <input
              v-if="RATE_FIELD[item.type]" class="cell num" type="number" step="0.001"
              :value="toPercent(field(item, RATE_FIELD[item.type]) as number)"
              @change="onRate(i, RATE_FIELD[item.type], $event)"
            />
          </td>
          <td class="actions">
            <button class="edit" aria-label="Edit full item" @click="store.startEdit(i)">✎</button>
            <button class="remove" aria-label="Remove" @click="store.removeItem(i)">✕</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.plan-grid {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1.5rem;
  overflow-x: auto;
}
h2 { margin: 0 0 1rem; font-size: 1.1rem; }
.empty { color: #999; font-size: 0.9rem; }
table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
th, td { padding: 0.3rem 0.4rem; border-bottom: 1px solid #f0f0f0; text-align: left; }
th { color: #777; font-weight: 600; font-size: 0.75rem; white-space: nowrap; }
th.num, td.num { text-align: right; }
tr.editing { background: #eef6f0; }
.type-badge {
  background: #eee;
  border-radius: 3px;
  padding: 0.1rem 0.4rem;
  font-size: 0.7rem;
  color: #555;
  white-space: nowrap;
}
.cell {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 3px;
  padding: 0.2rem 0.3rem;
  font: inherit;
  background: transparent;
}
.cell:hover { border-color: #ddd; }
.cell:focus { border-color: #1a5c3a; outline: none; background: #fff; }
.cell.num { text-align: right; }
.cell.name { min-width: 7rem; }
.actions { white-space: nowrap; text-align: right; }
.actions button {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.1rem 0.3rem;
}
.edit:hover { color: #1a5c3a; }
.remove:hover { color: #c00; }
</style>

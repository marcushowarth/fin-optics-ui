import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { fetchProjection } from '../api/projection'
import type { FinancialItem, ProjectionResponse, ScenarioDefinition } from '../types'

const STORAGE_KEY = 'fin-optics:plan'
const PLAN_VERSION = 2

// The portable shape of a plan — items + assumptions. Shared by localStorage
// auto-save and JSON file import/export, so a saved file and a refresh restore
// the same state. Transient state (results, loading, edit cursor) is excluded.
export interface Plan {
  version: number
  items: FinancialItem[]
  scenarios: ScenarioDefinition[]
  from: string
  to: string
  base: string
  startingCash: number
}

export const useProjectionStore = defineStore('projection', () => {
  const items = ref<FinancialItem[]>([])
  const scenarios = ref<ScenarioDefinition[]>([
    { name: 'low',  annualRate: 0.02 },
    { name: 'base', annualRate: 0.035 },
    { name: 'high', annualRate: 0.06 },
  ])
  const from = ref('2026-01')
  const to   = ref('2055-12')
  const base = ref('2026-05')
  const startingCash = ref(0)

  const result = ref<ProjectionResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const editingIndex = ref<number | null>(null)
  const adding = ref(false)

  const hasWarnings = computed(() => (result.value?.nominal.warnings.length ?? 0) > 0)
  const formOpen = computed(() => editingIndex.value !== null || adding.value)

  async function runProjection() {
    if (items.value.length === 0) return
    loading.value = true
    error.value = null
    try {
      result.value = await fetchProjection({
        from: from.value,
        to: to.value,
        base: base.value,
        startingCash: startingCash.value,
        items: items.value,
        scenarios: scenarios.value,
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Projection failed'
    } finally {
      loading.value = false
    }
  }

  function addItem(item: FinancialItem) {
    items.value.push(item)
  }

  function updateItem(index: number, item: FinancialItem) {
    items.value[index] = item
  }

  function removeItem(index: number) {
    items.value.splice(index, 1)
    if (editingIndex.value === index) editingIndex.value = null
    else if (editingIndex.value !== null && editingIndex.value > index) editingIndex.value--
  }

  // Reorder an item; the array order is the plan order, so it persists and
  // exports automatically. Keep the edit cursor pointed at the same item.
  function moveItem(from: number, to: number) {
    if (to < 0 || to >= items.value.length || from === to) return
    const [moved] = items.value.splice(from, 1)
    items.value.splice(to, 0, moved)
    const e = editingIndex.value
    if (e !== null) {
      if (e === from) editingIndex.value = to
      else {
        const afterRemoval = e > from ? e - 1 : e
        editingIndex.value = afterRemoval >= to ? afterRemoval + 1 : afterRemoval
      }
    }
  }

  function startEdit(index: number) {
    editingIndex.value = index
  }

  function startAdd() {
    adding.value = true
  }

  // Closes whichever form is open — edit or add.
  function cancelEdit() {
    editingIndex.value = null
    adding.value = false
  }

  // ---- Plan serialization (used by persistence + import/export) ----

  function toPlan(): Plan {
    return {
      version: PLAN_VERSION,
      items: items.value,
      scenarios: scenarios.value,
      from: from.value,
      to: to.value,
      base: base.value,
      startingCash: startingCash.value,
    }
  }

  // Apply a (possibly partial / untrusted) plan, field by field — a malformed
  // or older file replaces only the fields it validly carries.
  // v1 plans modelled liquidity as bank-account items; fold their balances
  // into startingCash and drop them (the API no longer accepts the type).
  function applyPlan(plan: Partial<Plan> | null | undefined) {
    if (Array.isArray(plan?.items)) {
      const legacy = plan.items.filter(
        (i): i is FinancialItem & { startBalance?: number } =>
          (i as { type?: string })?.type === 'bank-account',
      )
      if (legacy.length > 0) {
        items.value = plan.items.filter(i => !legacy.includes(i))
        startingCash.value = legacy.reduce((sum, b) => sum + (Number(b.startBalance) || 0), 0)
      } else {
        items.value = plan.items
      }
    }
    if (Array.isArray(plan?.scenarios)) scenarios.value = plan.scenarios
    if (typeof plan?.from === 'string') from.value = plan.from
    if (typeof plan?.to === 'string') to.value = plan.to
    if (typeof plan?.base === 'string') base.value = plan.base
    if (typeof plan?.startingCash === 'number') startingCash.value = plan.startingCash
    editingIndex.value = null
  }

  function exportPlan(): string {
    return JSON.stringify(toPlan(), null, 2)
  }

  function importPlan(json: string) {
    applyPlan(JSON.parse(json))
  }

  // ---- localStorage persistence ----
  // Restore on load, then auto-save the plan on any change so a refresh keeps it.

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) applyPlan(JSON.parse(raw))
  } catch {
    // corrupt or unavailable storage — start fresh, non-fatal
  }

  watch([items, scenarios, from, to, base, startingCash], () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPlan()))
    } catch {
      // storage full or unavailable — non-fatal
    }
  }, { deep: true })

  return { items, scenarios, from, to, base, startingCash, result, loading, error, editingIndex, adding, formOpen, hasWarnings, runProjection, addItem, updateItem, removeItem, moveItem, startEdit, startAdd, cancelEdit, toPlan, applyPlan, exportPlan, importPlan }
})

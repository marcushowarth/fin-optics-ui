import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchProjection } from '../api/projection'
import type { FinancialItem, ProjectionResponse, ScenarioDefinition } from '../types'

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

  const result = ref<ProjectionResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasWarnings = computed(() => (result.value?.nominal.warnings.length ?? 0) > 0)

  async function runProjection() {
    if (items.value.length === 0) return
    loading.value = true
    error.value = null
    try {
      result.value = await fetchProjection({
        from: from.value,
        to: to.value,
        base: base.value,
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

  function removeItem(index: number) {
    items.value.splice(index, 1)
  }

  return { items, scenarios, from, to, base, result, loading, error, hasWarnings, runProjection, addItem, removeItem }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectionStore } from '../projection'
import { fetchProjection } from '../../api/projection'

// The store touches localStorage at creation (restore) and on change (auto-save).
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
})

vi.mock('../../api/projection', () => ({
  fetchProjection: vi.fn().mockResolvedValue({
    nominal: { netWorth: {}, cashPosition: {}, itemPositions: {}, warnings: [] },
    realTerms: null,
  }),
}))

const STORAGE_KEY = 'fin-optics:plan'

const income = {
  type: 'income', name: 'Salary', description: '',
  start: '2026-01', monthlyAmount: 4000, annualGrowthRate: 0.03,
} as const

beforeEach(() => {
  storage.clear()
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

describe('startingCash', () => {
  it('defaults to 0', () => {
    const store = useProjectionStore()
    expect(store.startingCash).toBe(0)
  })

  it('round-trips through the plan at version 2', () => {
    const store = useProjectionStore()
    store.startingCash = 5000
    const plan = store.toPlan()
    expect(plan.version).toBe(2)
    expect(plan.startingCash).toBe(5000)

    setActivePinia(createPinia())
    const fresh = useProjectionStore()
    fresh.applyPlan(plan)
    expect(fresh.startingCash).toBe(5000)
  })

  it('is sent on the projection request', async () => {
    const store = useProjectionStore()
    store.items = [{ ...income }]
    store.startingCash = 5000
    await store.runProjection()
    expect(vi.mocked(fetchProjection).mock.calls[0][0]).toMatchObject({ startingCash: 5000 })
  })
})

describe('legacy bank-account migration', () => {
  const v1Plan = {
    version: 1,
    items: [
      { type: 'bank-account', name: 'Monzo', description: '', startBalance: 5000 },
      { type: 'bank-account', name: 'Savings', description: '', startBalance: 2500 },
      { ...income },
    ],
    scenarios: [{ name: 'base', annualRate: 0.035 }],
    from: '2026-01', to: '2055-12', base: '2026-05',
  }

  it('applyPlan folds bank-account startBalances into startingCash and strips the items', () => {
    const store = useProjectionStore()
    store.applyPlan(v1Plan as never)
    expect(store.startingCash).toBe(7500)
    expect(store.items).toHaveLength(1)
    expect(store.items[0].type).toBe('income')
  })

  it('migrates a persisted v1 plan on store creation', () => {
    storage.set(STORAGE_KEY, JSON.stringify(v1Plan))
    const store = useProjectionStore()
    expect(store.startingCash).toBe(7500)
    expect(store.items).toHaveLength(1)
  })

  it('does not overwrite startingCash when a v2 plan has no bank-account items', () => {
    const store = useProjectionStore()
    store.applyPlan({ version: 2, startingCash: 1000, items: [{ ...income }] })
    expect(store.startingCash).toBe(1000)
    expect(store.items).toHaveLength(1)
  })
})

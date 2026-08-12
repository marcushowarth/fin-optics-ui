import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useLayoutStore } from '../layout'

// The store touches localStorage at creation (restore) and on change (auto-save).
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
})

const STORAGE_KEY = 'fin-optics:layout'

beforeEach(() => {
  storage.clear()
  setActivePinia(createPinia())
})

describe('default layout', () => {
  it('starts with a position for every panel', () => {
    const layout = useLayoutStore()
    expect(Object.keys(layout.positions).sort()).toEqual(['cash', 'items', 'networth', 'settings'])
  })

  it('starts with no saved sizes', () => {
    const layout = useLayoutStore()
    expect(layout.sizes).toEqual({})
  })

  it('starts with a z-order containing every panel exactly once', () => {
    const layout = useLayoutStore()
    expect(layout.zOrder.slice().sort()).toEqual(['cash', 'items', 'networth', 'settings'])
  })
})

describe('movePanelTo', () => {
  it('sets a panel to an arbitrary x/y', () => {
    const layout = useLayoutStore()
    layout.movePanelTo('cash', 120, 340)
    expect(layout.positions.cash).toEqual({ x: 120, y: 340 })
  })

  it('clamps negative coordinates to zero', () => {
    const layout = useLayoutStore()
    layout.movePanelTo('cash', -50, -10)
    expect(layout.positions.cash).toEqual({ x: 0, y: 0 })
  })

  it('is a no-op for an unknown panel id', () => {
    const layout = useLayoutStore()
    const before = { ...layout.positions }
    // @ts-expect-error deliberately invalid id
    layout.movePanelTo('nope', 10, 10)
    expect(layout.positions).toEqual(before)
  })
})

describe('bringToFront', () => {
  it('moves a panel to the end of the z-order', () => {
    const layout = useLayoutStore()
    layout.bringToFront('settings')
    expect(layout.zOrder[layout.zOrder.length - 1]).toBe('settings')
  })

  it('is a no-op for an unknown panel id', () => {
    const layout = useLayoutStore()
    const before = [...layout.zOrder]
    // @ts-expect-error deliberately invalid id
    layout.bringToFront('nope')
    expect(layout.zOrder).toEqual(before)
  })
})

describe('setPanelSize', () => {
  it('records a width/height for a panel', () => {
    const layout = useLayoutStore()
    layout.setPanelSize('cash', { width: 700, height: 400 })
    expect(layout.sizes.cash).toEqual({ width: 700, height: 400 })
  })

  it('merges into an existing size rather than replacing it', () => {
    const layout = useLayoutStore()
    layout.setPanelSize('cash', { width: 700 })
    layout.setPanelSize('cash', { height: 400 })
    expect(layout.sizes.cash).toEqual({ width: 700, height: 400 })
  })
})

describe('localStorage persistence', () => {
  it('saves positions, sizes and z-order on change', async () => {
    const layout = useLayoutStore()
    layout.movePanelTo('cash', 50, 60)
    layout.setPanelSize('items', { width: 500 })
    await nextTick()
    const saved = JSON.parse(storage.get(STORAGE_KEY)!)
    expect(saved.positions.cash).toEqual({ x: 50, y: 60 })
    expect(saved.sizes.items).toEqual({ width: 500 })
    expect(saved.zOrder).toEqual(layout.zOrder)
  })

  it('restores a previously saved layout on creation', () => {
    storage.set(STORAGE_KEY, JSON.stringify({
      version: 2,
      positions: {
        settings: { x: 10, y: 20 }, items: { x: 10, y: 300 },
        cash: { x: 500, y: 20 }, networth: { x: 500, y: 400 },
      },
      sizes: { items: { width: 600 } },
      zOrder: ['items', 'cash', 'networth', 'settings'],
    }))
    const layout = useLayoutStore()
    expect(layout.positions.settings).toEqual({ x: 10, y: 20 })
    expect(layout.sizes).toEqual({ items: { width: 600 } })
    expect(layout.zOrder).toEqual(['items', 'cash', 'networth', 'settings'])
  })

  it('falls back to the default layout when the saved panel set is stale', () => {
    storage.set(STORAGE_KEY, JSON.stringify({
      version: 2,
      positions: { items: { x: 0, y: 0 }, cash: { x: 500, y: 0 } }, // missing settings/networth
      sizes: {},
      zOrder: ['items', 'cash'],
    }))
    const layout = useLayoutStore()
    expect(Object.keys(layout.positions).sort()).toEqual(['cash', 'items', 'networth', 'settings'])
  })

  it('falls back to the default layout when the saved version is stale (old column-based shape)', () => {
    storage.set(STORAGE_KEY, JSON.stringify({
      version: 1,
      columns: [['items', 'cash'], ['networth', 'settings']],
      sizes: { items: { width: 600 } },
    }))
    const layout = useLayoutStore()
    expect(Object.keys(layout.positions).sort()).toEqual(['cash', 'items', 'networth', 'settings'])
    expect(layout.sizes).toEqual({})
  })

  it('ignores corrupt JSON and starts fresh', () => {
    storage.set(STORAGE_KEY, '{not json')
    const layout = useLayoutStore()
    expect(Object.keys(layout.positions).sort()).toEqual(['cash', 'items', 'networth', 'settings'])
  })
})

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
const ALL_IDS = ['cash', 'networth', 'plan'] // sorted, matches Object.keys().sort()

beforeEach(() => {
  storage.clear()
  setActivePinia(createPinia())
})

describe('default layout', () => {
  it('starts with a position for every panel', () => {
    const layout = useLayoutStore()
    expect(Object.keys(layout.positions).sort()).toEqual(ALL_IDS)
  })

  it('starts with no saved sizes', () => {
    const layout = useLayoutStore()
    expect(layout.sizes).toEqual({})
  })

  it('starts with a z-order containing every panel exactly once', () => {
    const layout = useLayoutStore()
    expect(layout.zOrder.slice().sort()).toEqual(ALL_IDS)
  })

  it('starts not customized', () => {
    const layout = useLayoutStore()
    expect(layout.isCustomized).toBe(false)
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

  it('marks the layout as customized once a panel actually moves', () => {
    const layout = useLayoutStore()
    layout.movePanelTo('cash', 120, 340)
    expect(layout.isCustomized).toBe(true)
  })

  it('does not mark customized for a no-op move (unknown panel)', () => {
    const layout = useLayoutStore()
    // @ts-expect-error deliberately invalid id
    layout.movePanelTo('nope', 10, 10)
    expect(layout.isCustomized).toBe(false)
  })
})

describe('autoPositionNetWorth', () => {
  it('moves networth without marking the layout as customized', () => {
    const layout = useLayoutStore()
    layout.autoPositionNetWorth(555)
    expect(layout.positions.networth.y).toBe(555)
    expect(layout.isCustomized).toBe(false)
  })

  it('keeps x unchanged, only sets y', () => {
    const layout = useLayoutStore()
    const xBefore = layout.positions.networth.x
    layout.autoPositionNetWorth(555)
    expect(layout.positions.networth.x).toBe(xBefore)
  })

  it('is a no-op once the user has manually moved networth', () => {
    const layout = useLayoutStore()
    layout.movePanelTo('networth', 100, 100) // a real user drag
    layout.autoPositionNetWorth(999)
    expect(layout.positions.networth).toEqual({ x: 100, y: 100 })
  })

  it('resumes applying after resetLayout clears the manual-move flag', () => {
    const layout = useLayoutStore()
    layout.movePanelTo('networth', 100, 100)
    layout.resetLayout()
    layout.autoPositionNetWorth(555)
    expect(layout.positions.networth.y).toBe(555)
    expect(layout.isCustomized).toBe(false)
  })
})

describe('bringToFront', () => {
  it('moves a panel to the end of the z-order', () => {
    const layout = useLayoutStore()
    layout.bringToFront('plan')
    expect(layout.zOrder[layout.zOrder.length - 1]).toBe('plan')
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

  it('marks the layout as customized once a panel is resized', () => {
    const layout = useLayoutStore()
    layout.setPanelSize('cash', { width: 700 })
    expect(layout.isCustomized).toBe(true)
  })
})

describe('resetLayout', () => {
  it('restores default positions, clears sizes, and resets z-order', () => {
    const fresh = useLayoutStore()
    const defaultPositions = { ...fresh.positions }
    const defaultZOrder = [...fresh.zOrder]

    fresh.movePanelTo('cash', 999, 999)
    fresh.setPanelSize('cash', { width: 999 })
    fresh.bringToFront('plan')
    fresh.resetLayout()

    expect(fresh.positions).toEqual(defaultPositions)
    expect(fresh.sizes).toEqual({})
    expect(fresh.zOrder).toEqual(defaultZOrder)
    expect(fresh.isCustomized).toBe(false)
  })

  it('clears the customized flag', () => {
    const layout = useLayoutStore()
    layout.movePanelTo('cash', 50, 50)
    expect(layout.isCustomized).toBe(true)
    layout.resetLayout()
    expect(layout.isCustomized).toBe(false)
  })
})

describe('localStorage persistence', () => {
  it('saves positions, sizes and z-order on change', async () => {
    const layout = useLayoutStore()
    layout.movePanelTo('cash', 50, 60)
    layout.setPanelSize('plan', { width: 500 })
    await nextTick()
    const saved = JSON.parse(storage.get(STORAGE_KEY)!)
    expect(saved.positions.cash).toEqual({ x: 50, y: 60 })
    expect(saved.sizes.plan).toEqual({ width: 500 })
    expect(saved.zOrder).toEqual(layout.zOrder)
  })

  it('restores a previously saved layout on creation', () => {
    storage.set(STORAGE_KEY, JSON.stringify({
      version: 3,
      positions: { plan: { x: 10, y: 20 }, cash: { x: 500, y: 20 }, networth: { x: 500, y: 400 } },
      sizes: { plan: { width: 600 } },
      zOrder: ['cash', 'networth', 'plan'],
    }))
    const layout = useLayoutStore()
    expect(layout.positions.plan).toEqual({ x: 10, y: 20 })
    expect(layout.sizes).toEqual({ plan: { width: 600 } })
    expect(layout.zOrder).toEqual(['cash', 'networth', 'plan'])
  })

  it('falls back to the default layout when the saved panel set is stale', () => {
    storage.set(STORAGE_KEY, JSON.stringify({
      version: 3,
      positions: { plan: { x: 0, y: 0 } }, // missing cash/networth
      sizes: {},
      zOrder: ['plan'],
    }))
    const layout = useLayoutStore()
    expect(Object.keys(layout.positions).sort()).toEqual(ALL_IDS)
  })

  it('falls back to the default layout when the saved version is stale (old 4-panel shape)', () => {
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
    expect(Object.keys(layout.positions).sort()).toEqual(ALL_IDS)
    expect(layout.sizes).toEqual({})
  })

  it('ignores corrupt JSON and starts fresh', () => {
    storage.set(STORAGE_KEY, '{not json')
    const layout = useLayoutStore()
    expect(Object.keys(layout.positions).sort()).toEqual(ALL_IDS)
  })
})

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
  it('starts with settings/items on the left, cash/networth on the right', () => {
    const layout = useLayoutStore()
    expect(layout.columns).toEqual([
      ['settings', 'items'],
      ['cash', 'networth'],
    ])
  })

  it('starts with no saved sizes', () => {
    const layout = useLayoutStore()
    expect(layout.sizes).toEqual({})
  })
})

describe('movePanel', () => {
  it('reorders within the same column', () => {
    const layout = useLayoutStore()
    layout.movePanel('items', 0, 0)
    expect(layout.columns[0]).toEqual(['items', 'settings'])
  })

  it('moves a panel across columns, removing it from its old column', () => {
    const layout = useLayoutStore()
    layout.movePanel('cash', 0, 1)
    expect(layout.columns[0]).toEqual(['settings', 'cash', 'items'])
    expect(layout.columns[1]).toEqual(['networth'])
  })

  it('appends to the end of a column when the index is beyond its length', () => {
    const layout = useLayoutStore()
    layout.movePanel('settings', 1, 99)
    expect(layout.columns[1]).toEqual(['cash', 'networth', 'settings'])
  })

  it('is a no-op for an unknown panel id', () => {
    const layout = useLayoutStore()
    // @ts-expect-error deliberately invalid id
    layout.movePanel('nope', 0, 0)
    expect(layout.columns).toEqual([
      ['settings', 'items'],
      ['cash', 'networth'],
    ])
  })

  it('is a no-op for an out-of-range column', () => {
    const layout = useLayoutStore()
    layout.movePanel('cash', 5, 0)
    expect(layout.columns).toEqual([
      ['settings', 'items'],
      ['cash', 'networth'],
    ])
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
  it('saves columns and sizes on change', async () => {
    const layout = useLayoutStore()
    layout.movePanel('cash', 0, 0)
    layout.setPanelSize('items', { width: 500 })
    await nextTick()
    const saved = JSON.parse(storage.get(STORAGE_KEY)!)
    expect(saved.columns[0]).toEqual(['cash', 'settings', 'items'])
    expect(saved.sizes.items).toEqual({ width: 500 })
  })

  it('restores a previously saved layout on creation', () => {
    storage.set(STORAGE_KEY, JSON.stringify({
      version: 1,
      columns: [['items', 'cash'], ['networth', 'settings']],
      sizes: { items: { width: 600 } },
    }))
    const layout = useLayoutStore()
    expect(layout.columns).toEqual([['items', 'cash'], ['networth', 'settings']])
    expect(layout.sizes).toEqual({ items: { width: 600 } })
  })

  it('falls back to the default layout when the saved panel set is stale', () => {
    storage.set(STORAGE_KEY, JSON.stringify({
      version: 1,
      columns: [['items', 'cash'], ['networth']], // missing 'settings'
      sizes: {},
    }))
    const layout = useLayoutStore()
    expect(layout.columns).toEqual([
      ['settings', 'items'],
      ['cash', 'networth'],
    ])
  })

  it('ignores corrupt JSON and starts fresh', () => {
    storage.set(STORAGE_KEY, '{not json')
    const layout = useLayoutStore()
    expect(layout.columns).toEqual([
      ['settings', 'items'],
      ['cash', 'networth'],
    ])
  })
})

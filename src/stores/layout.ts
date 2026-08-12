import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'fin-optics:layout'
const LAYOUT_VERSION = 1

// The panel set is fixed (#948 is arrangement, not add/remove-panels) — see
// App.vue for what each id renders.
export type PanelId = 'settings' | 'items' | 'cash' | 'networth'

export interface PanelSize {
  width?: number
  height?: number
}

interface SavedLayout {
  version: number
  columns: PanelId[][]
  sizes: Partial<Record<PanelId, PanelSize>>
}

const ALL_PANEL_IDS: PanelId[] = ['settings', 'items', 'cash', 'networth']

// Two columns, matching today's fixed left/right arrangement — panels can
// move between columns and within a column via movePanel.
const DEFAULT_COLUMNS: PanelId[][] = [
  ['settings', 'items'],
  ['cash', 'networth'],
]

export const useLayoutStore = defineStore('layout', () => {
  const columns = ref<PanelId[][]>(DEFAULT_COLUMNS.map(col => [...col]))
  const sizes = ref<Partial<Record<PanelId, PanelSize>>>({})

  // Move panelId to columns[toColumn] at toIndex, removing it from wherever
  // it currently lives first (same array-splice pattern as
  // projection.ts's moveItem). A no-op for an unknown panel id or an
  // out-of-range column, so a stray drag can't corrupt the layout.
  function movePanel(panelId: PanelId, toColumn: number, toIndex: number) {
    if (toColumn < 0 || toColumn >= columns.value.length) return

    let fromColumn = -1
    let fromIndex = -1
    columns.value.forEach((col, ci) => {
      const idx = col.indexOf(panelId)
      if (idx !== -1) { fromColumn = ci; fromIndex = idx }
    })
    if (fromColumn === -1) return
    if (fromColumn === toColumn && fromIndex === toIndex) return

    columns.value[fromColumn].splice(fromIndex, 1)
    let insertIndex = toIndex
    if (fromColumn === toColumn && fromIndex < toIndex) insertIndex -= 1
    const target = columns.value[toColumn]
    insertIndex = Math.max(0, Math.min(insertIndex, target.length))
    target.splice(insertIndex, 0, panelId)
  }

  function setPanelSize(panelId: PanelId, size: PanelSize) {
    sizes.value[panelId] = { ...sizes.value[panelId], ...size }
  }

  // ---- localStorage persistence ----
  // Restore on load, then auto-save on any change so a refresh keeps it —
  // same pattern as stores/projection.ts.

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedLayout>
      if (Array.isArray(parsed.columns) && parsed.columns.length === columns.value.length) {
        // Guard against a stale saved layout whose panel set doesn't match
        // the current code (e.g. after a panel was added/removed) — fall
        // back to defaults rather than rendering a broken layout.
        const savedIds = parsed.columns.flat()
        const valid = savedIds.length === ALL_PANEL_IDS.length &&
          ALL_PANEL_IDS.every(id => savedIds.includes(id))
        if (valid) columns.value = parsed.columns as PanelId[][]
      }
      if (parsed.sizes && typeof parsed.sizes === 'object') sizes.value = parsed.sizes
    }
  } catch {
    // corrupt or unavailable storage — start fresh, non-fatal
  }

  watch([columns, sizes], () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: LAYOUT_VERSION,
        columns: columns.value,
        sizes: sizes.value,
      }))
    } catch {
      // storage full or unavailable — non-fatal
    }
  }, { deep: true })

  return { columns, sizes, movePanel, setPanelSize }
})

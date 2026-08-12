import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'fin-optics:layout'
const LAYOUT_VERSION = 2

// The panel set is fixed (#948 is arrangement, not add/remove-panels) — see
// App.vue for what each id renders.
export type PanelId = 'settings' | 'items' | 'cash' | 'networth'

export interface PanelSize {
  width?: number
  height?: number
}

export interface PanelPosition {
  x: number
  y: number
}

interface SavedLayout {
  version: number
  positions: Record<PanelId, PanelPosition>
  sizes: Partial<Record<PanelId, PanelSize>>
  zOrder: PanelId[]
}

const ALL_PANEL_IDS: PanelId[] = ['settings', 'items', 'cash', 'networth']

// Free-floating default start positions, roughly approximating the old
// fixed two-column look (settings/items stacked left, charts stacked
// right) — just a starting point, not enforced afterwards.
const DEFAULT_POSITIONS: Record<PanelId, PanelPosition> = {
  settings: { x: 0, y: 0 },
  items: { x: 0, y: 260 },
  cash: { x: 520, y: 0 },
  networth: { x: 520, y: 420 },
}

export const useLayoutStore = defineStore('layout', () => {
  const positions = ref<Record<PanelId, PanelPosition>>({ ...DEFAULT_POSITIONS })
  const sizes = ref<Partial<Record<PanelId, PanelSize>>>({})
  const zOrder = ref<PanelId[]>([...ALL_PANEL_IDS])

  // Move panelId to an arbitrary x/y (free-floating, not slotted into a
  // column/row). Clamped to non-negative so a panel can't be dragged
  // off the top/left edge and become unreachable. A no-op for an
  // unknown panel id so a stray drag can't corrupt the layout.
  function movePanelTo(panelId: PanelId, x: number, y: number) {
    if (!(panelId in positions.value)) return
    positions.value[panelId] = { x: Math.max(0, x), y: Math.max(0, y) }
  }

  // Panels can overlap when free-floating — bring the one being
  // interacted with to the front so it's not stuck underneath another.
  function bringToFront(panelId: PanelId) {
    const idx = zOrder.value.indexOf(panelId)
    if (idx === -1) return
    zOrder.value.splice(idx, 1)
    zOrder.value.push(panelId)
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
      // Guard against a stale saved layout — wrong version (e.g. the old
      // column-based v1 shape) or a panel set that doesn't match the
      // current code (after a panel was added/removed) — fall back to
      // defaults rather than rendering a broken layout.
      const validPositions = parsed.positions && typeof parsed.positions === 'object' &&
        ALL_PANEL_IDS.every(id => parsed.positions![id] && typeof parsed.positions![id].x === 'number')
      if (parsed.version === LAYOUT_VERSION && validPositions) {
        positions.value = parsed.positions as Record<PanelId, PanelPosition>
        if (parsed.sizes && typeof parsed.sizes === 'object') sizes.value = parsed.sizes
        if (Array.isArray(parsed.zOrder) && parsed.zOrder.length === ALL_PANEL_IDS.length &&
          ALL_PANEL_IDS.every(id => parsed.zOrder!.includes(id))) {
          zOrder.value = parsed.zOrder as PanelId[]
        }
      }
    }
  } catch {
    // corrupt or unavailable storage — start fresh, non-fatal
  }

  watch([positions, sizes, zOrder], () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: LAYOUT_VERSION,
        positions: positions.value,
        sizes: sizes.value,
        zOrder: zOrder.value,
      }))
    } catch {
      // storage full or unavailable — non-fatal
    }
  }, { deep: true })

  return { positions, sizes, zOrder, movePanelTo, bringToFront, setPanelSize }
})

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'fin-optics:layout'
const LAYOUT_VERSION = 3

// The panel set is fixed (#948 is arrangement, not add/remove-panels) — see
// App.vue for what each id renders. Settings and Items/Plan share a single
// 'plan' panel rather than being independently positioned — both are
// collapsible <details> content, and sharing a box means collapsing one
// naturally reflows the other via normal document flow, instead of needing
// cross-panel reflow logic in a free-floating layout (see #948 discussion).
export type PanelId = 'plan' | 'cash' | 'networth'

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

const ALL_PANEL_IDS: PanelId[] = ['plan', 'cash', 'networth']

// Free-floating default start positions, roughly approximating the old
// fixed two-column look (plan on the left, charts stacked right) — just a
// starting point, not enforced afterwards.
const DEFAULT_POSITIONS: Record<PanelId, PanelPosition> = {
  plan: { x: 0, y: 0 },
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

  // Free-floating panels are easy to accidentally mangle (drag something
  // under another panel, resize it to nothing) with no undo — this flags
  // once the layout actually differs from the default, so the UI can offer
  // a "reset layout" escape hatch. Derived from the real state rather than
  // tracked as a separate flag someone could forget to set (and which a
  // layout saved before this existed would silently restore as "false"
  // even though it's genuinely customized) — this way it's always correct,
  // including for old saved layouts.
  const isCustomized = computed(() =>
    Object.keys(sizes.value).length > 0 ||
    zOrder.value.some((id, i) => id !== ALL_PANEL_IDS[i]) ||
    ALL_PANEL_IDS.some(id => {
      const p = positions.value[id]
      const d = DEFAULT_POSITIONS[id]
      return p.x !== d.x || p.y !== d.y
    })
  )

  // Escape hatch for "I've messed up the layout" — back to the default
  // positions/sizes/stacking order in one step.
  function resetLayout() {
    positions.value = { ...DEFAULT_POSITIONS }
    sizes.value = {}
    zOrder.value = [...ALL_PANEL_IDS]
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

  return { positions, sizes, zOrder, isCustomized, movePanelTo, bringToFront, setPanelSize, resetLayout }
})

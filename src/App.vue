<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { useProjectionStore } from './stores/projection'
import { useLayoutStore, type PanelId } from './stores/layout'
import ItemForm from './components/ItemForm.vue'
import PlanGrid from './components/PlanGrid.vue'
import PlanTimeline from './components/PlanTimeline.vue'
import PlanToolbar from './components/PlanToolbar.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import CashPositionChart from './components/CashPositionChart.vue'
import NetWorthChart from './components/NetWorthChart.vue'
import AppFooter from './components/AppFooter.vue'

const store = useProjectionStore()
const layout = useLayoutStore()

// Grid and Timeline are two views onto the same store.items — same pattern as
// the Total/Breakdown toggle in the chart panels. The grid stays available
// (not replaced); this just adds a second way to look at the same plan.
const itemsView = ref<'grid' | 'timeline'>('grid')

const PANEL_IDS: PanelId[] = ['plan', 'cash', 'networth']

const PANEL_TITLES: Record<PanelId, string> = {
  plan: 'Plan',
  cash: 'Cash Position',
  networth: 'Net Worth',
}

const DEFAULT_WIDTH: Record<PanelId, number> = {
  plan: 480,
  cash: 660,
  networth: 660,
}

// Plan's height should track its own content (the Settings/Items <details>
// sections collapsing, the Items list growing/shrinking) rather than
// staying pinned to a size the user once dragged — so it only gets
// horizontal resize. Chart height doesn't self-adjust the same way (more
// data doesn't make a taller chart), so manual height resize stays useful
// there.
const HEIGHT_RESIZABLE: Record<PanelId, boolean> = {
  plan: false,
  cash: true,
  networth: true,
}

function panelStyle(id: PanelId) {
  const pos = layout.positions[id]
  const size = layout.sizes[id]
  return {
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    width: `${size?.width ?? DEFAULT_WIDTH[id]}px`,
    height: size?.height ? `${size.height}px` : undefined,
    zIndex: layout.zOrder.indexOf(id) + 1,
    resize: HEIGHT_RESIZABLE[id] ? ('both' as const) : ('horizontal' as const),
  }
}

// --- Free-floating drag-to-move — plain mouse tracking rather than native
// HTML5 DnD, so the panel follows the cursor in real time instead of only
// showing a drop-zone highlight (native DnD gave very little "feel" for
// where things would land). Position is written live so the box visibly
// follows the cursor; nothing extra needs to happen on mouseup beyond
// detaching the window listeners — the store's own watch() persists it. ---
const layoutEl = shallowRef<HTMLElement | null>(null)
const dragging = ref<{ id: PanelId; offsetX: number; offsetY: number } | null>(null)

function onHandleMouseDown(id: PanelId, e: MouseEvent) {
  const panelEl = (e.currentTarget as HTMLElement).closest('.panel') as HTMLElement | null
  const containerEl = layoutEl.value
  if (!panelEl || !containerEl) return
  const panelRect = panelEl.getBoundingClientRect()
  dragging.value = { id, offsetX: e.clientX - panelRect.left, offsetY: e.clientY - panelRect.top }
  layout.bringToFront(id)
  window.addEventListener('mousemove', onWindowMouseMove)
  window.addEventListener('mouseup', onWindowMouseUp)
  e.preventDefault()
}
function onWindowMouseMove(e: MouseEvent) {
  if (!dragging.value || !layoutEl.value) return
  const { id, offsetX, offsetY } = dragging.value
  const containerRect = layoutEl.value.getBoundingClientRect()
  layout.movePanelTo(id, e.clientX - containerRect.left - offsetX, e.clientY - containerRect.top - offsetY)
}
function onWindowMouseUp() {
  dragging.value = null
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
}
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
})

// --- Resize — native CSS `resize` on the panel box (both axes for chart
// panels, width-only for settings/items — see HEIGHT_RESIZABLE above),
// persisted on release. Compare the box size at mousedown vs mouseup: a
// plain click (e.g. a button inside the panel) leaves the size unchanged so
// nothing gets persisted; only an actual drag on the resize handle does. ---
const resizeStart = new Map<PanelId, { width: number; height: number }>()

function onPanelMouseDown(id: PanelId, e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  resizeStart.set(id, { width: el.offsetWidth, height: el.offsetHeight })
}
function onPanelMouseUp(id: PanelId, e: MouseEvent) {
  const start = resizeStart.get(id)
  resizeStart.delete(id)
  if (!start) return
  const el = e.currentTarget as HTMLElement
  const width = el.offsetWidth
  const height = el.offsetHeight
  if (width !== start.width || height !== start.height) {
    layout.setPanelSize(id, { width, height })
  }
}

// --- Container extent — absolutely-positioned children don't contribute to
// a parent's natural height/width, so track each panel's live rendered box
// via ResizeObserver and size the container to fit whichever panel extends
// furthest, otherwise the footer below would overlap free-floating panels.
const measured = ref<Partial<Record<PanelId, { width: number; height: number }>>>({})
const observers = new Map<PanelId, ResizeObserver>()

function setPanelEl(id: PanelId, el: Element | null) {
  observers.get(id)?.disconnect()
  observers.delete(id)
  if (!(el instanceof HTMLElement)) return
  const ro = new ResizeObserver(([entry]) => {
    measured.value[id] = { width: entry.contentRect.width, height: entry.contentRect.height }
  })
  ro.observe(el)
  observers.set(id, ro)
}
onBeforeUnmount(() => {
  observers.forEach(ro => ro.disconnect())
  observers.clear()
})

const containerExtent = computed(() => {
  let bottom = 0
  let right = 0
  for (const id of PANEL_IDS) {
    const pos = layout.positions[id]
    const size = measured.value[id]
    bottom = Math.max(bottom, pos.y + (size?.height ?? 200))
    right = Math.max(right, pos.x + (size?.width ?? DEFAULT_WIDTH[id]))
  }
  return { height: bottom + 32, width: right + 32 }
})
</script>

<template>
  <div class="app">
    <h1>FIN OPTICS</h1>
    <p class="tagline">Financial projection engine — items in, financial horizon out.</p>

    <div class="top-bar">
      <PlanToolbar />
      <button v-if="store.items.length > 0" class="run-btn" :disabled="store.loading" @click="store.runProjection">
        {{ store.loading ? 'Running…' : 'Run Projection' }}
      </button>
      <a v-if="layout.isCustomized" class="reset-layout-link" @click="layout.resetLayout">Reset layout</a>
      <p v-if="store.error" class="error inline-error">{{ store.error }}</p>
    </div>

    <div
      ref="layoutEl" class="layout"
      :style="{ height: `${containerExtent.height}px`, minWidth: `${containerExtent.width}px` }"
    >
      <div
        v-for="id in PANEL_IDS" :key="id" class="panel"
        :ref="el => setPanelEl(id, el as Element | null)"
        :style="panelStyle(id)"
        :class="{ dragging: dragging?.id === id }"
        @mousedown="onPanelMouseDown(id, $event)" @mouseup="onPanelMouseUp(id, $event)"
      >
        <div class="panel-header">
          <span class="handle" aria-label="Drag to move" @mousedown="onHandleMouseDown(id, $event)">⠿</span>
          <span class="panel-title">{{ PANEL_TITLES[id] }}</span>
        </div>
        <div class="panel-body">
          <template v-if="id === 'plan'">
            <SettingsPanel />
            <div class="view-toggle">
              <button class="view-toggle-btn" :class="{ active: itemsView === 'grid' }" @click="itemsView = 'grid'">Details</button>
              <button class="view-toggle-btn" :class="{ active: itemsView === 'timeline' }" @click="itemsView = 'timeline'">Timeline</button>
            </div>
            <PlanGrid v-if="itemsView === 'grid'" />
            <PlanTimeline v-else />
            <button class="add-item-btn" @click="store.startAdd">+ Add Items</button>
          </template>
          <CashPositionChart v-else-if="id === 'cash'" />
          <NetWorthChart v-else-if="id === 'networth'" />
        </div>
      </div>
    </div>

    <!-- Adding and editing both open the same form in a modal, so the
         full field set gets room without cramping the grid/left column. -->
    <Teleport v-if="store.formOpen" to="body">
      <div class="modal-backdrop" @click.self="store.cancelEdit">
        <ItemForm />
      </div>
    </Teleport>

    <AppFooter />
  </div>
</template>

<style>
body { font-family: sans-serif; margin: 0; background: #f5f5f5; }
</style>

<style scoped>
.app { max-width: 1200px; margin: 0 auto; padding: 2rem; }
h1 { margin: 0 0 0.25rem; }
.tagline { margin: 0 0 1.5rem; color: #666; font-size: 0.95rem; }
.top-bar { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem; }
.inline-error { margin: 0; flex: 1; }
.run-btn {
  padding: 0.5rem 1.5rem;
  background: #1a5c3a;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
}
.run-btn:disabled { background: #999; cursor: not-allowed; }
.error { color: #c00; font-size: 0.9rem; }
.reset-layout-link { color: #3a7bc8; cursor: pointer; text-decoration: none; font-size: 0.85rem; }
.reset-layout-link:hover { text-decoration: underline; }

.layout { position: relative; }

.panel {
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow: auto;
  min-width: 16rem;
  min-height: 4rem;
  background: transparent;
}
.panel.dragging { opacity: 0.6; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); }
.panel-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.1rem 0.2rem 0.4rem;
}
.panel-header .handle { cursor: grab; color: #ccc; user-select: none; font-size: 0.9rem; }
.panel-header .handle:hover { color: #888; }
.panel-header .handle:active { cursor: grabbing; }
.panel-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #999;
}
.panel-body { display: flex; flex-direction: column; gap: 1rem; flex: 1; }

.add-item-btn {
  align-self: flex-start;
  padding: 0.4rem 1rem;
  background: #fff;
  color: #1a5c3a;
  border: 1px solid #1a5c3a;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}
.add-item-btn:hover { background: #eef6f0; }
.view-toggle { display: flex; gap: 0.4rem; align-self: flex-start; }
.view-toggle-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #555;
  cursor: pointer;
}
.view-toggle-btn:hover { border-color: #1a5c3a; color: #1a5c3a; }
.view-toggle-btn.active { background: #1a5c3a; border-color: #1a5c3a; color: #fff; }
</style>

<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 100;
}
</style>

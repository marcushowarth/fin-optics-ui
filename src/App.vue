<script setup lang="ts">
import { ref } from 'vue'
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

const PANEL_TITLES: Record<PanelId, string> = {
  settings: 'Settings',
  items: 'Plan',
  cash: 'Cash Position',
  networth: 'Net Worth',
}

// Applied until the user resizes a panel (layout.sizes then takes over) —
// approximates today's fixed 480px-left / remaining-right two-column split.
const DEFAULT_WIDTH: Record<PanelId, number> = {
  settings: 480,
  items: 480,
  cash: 660,
  networth: 660,
}

function panelStyle(id: PanelId) {
  const size = layout.sizes[id]
  return {
    width: `${size?.width ?? DEFAULT_WIDTH[id]}px`,
    height: size?.height ? `${size.height}px` : undefined,
  }
}

// --- Drag-reorder across the two columns — same native HTML5 DnD pattern as
// PlanGrid.vue's row handle, extended with a column index alongside the
// in-column index since panels can move between the two columns. ---
const dragPanel = ref<PanelId | null>(null)
const dragOverTarget = ref<{ column: number; index: number } | null>(null)

function onDragStart(id: PanelId, e: DragEvent) {
  dragPanel.value = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
}
function onDragOverPanel(column: number, index: number, e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverTarget.value = { column, index }
}
function onDragOverColumn(column: number, e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverTarget.value = { column, index: layout.columns[column].length }
}
function onDrop() {
  if (dragPanel.value && dragOverTarget.value) {
    layout.movePanel(dragPanel.value, dragOverTarget.value.column, dragOverTarget.value.index)
  }
  dragPanel.value = null
  dragOverTarget.value = null
}
function onDragEnd() {
  dragPanel.value = null
  dragOverTarget.value = null
}

// --- Resize — native CSS `resize: both` on the panel box, persisted on
// release. Compare the box size at mousedown vs mouseup: a plain click
// (e.g. a button inside the panel) leaves the size unchanged so nothing gets
// persisted; only an actual drag on the resize handle changes it.
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
</script>

<template>
  <div class="app">
    <h1>FIN OPTICS</h1>
    <p class="tagline">Financial projection engine — items in, 30-year view out.</p>

    <div class="top-bar">
      <PlanToolbar />
      <button v-if="store.items.length > 0" class="run-btn" :disabled="store.loading" @click="store.runProjection">
        {{ store.loading ? 'Running…' : 'Run Projection' }}
      </button>
      <p v-if="store.error" class="error inline-error">{{ store.error }}</p>
    </div>

    <div class="layout">
      <div
        v-for="(colIds, ci) in layout.columns" :key="ci" class="panel-column"
        @dragover="onDragOverColumn(ci, $event)" @drop="onDrop"
      >
        <p v-if="colIds.length === 0" class="empty-column">Drop a panel here</p>
        <div
          v-for="(id, pi) in colIds" :key="id" class="panel"
          :style="panelStyle(id)"
          :class="{ dragging: dragPanel === id, 'drag-over': dragOverTarget?.column === ci && dragOverTarget?.index === pi && dragPanel !== id }"
          @dragover.stop="onDragOverPanel(ci, pi, $event)" @drop.stop="onDrop" @dragend="onDragEnd"
          @mousedown="onPanelMouseDown(id, $event)" @mouseup="onPanelMouseUp(id, $event)"
        >
          <div class="panel-header">
            <span class="handle" draggable="true" @dragstart="onDragStart(id, $event)" aria-label="Drag to reorder">⠿</span>
            <span class="panel-title">{{ PANEL_TITLES[id] }}</span>
          </div>
          <div class="panel-body">
            <template v-if="id === 'settings'">
              <SettingsPanel />
            </template>
            <template v-else-if="id === 'items'">
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

.layout { display: flex; gap: 1.5rem; align-items: flex-start; flex-wrap: wrap; }
.panel-column { display: flex; flex-direction: column; gap: 1rem; min-width: 12rem; }
.empty-column {
  margin: 0;
  padding: 1rem;
  border: 1px dashed #ccc;
  border-radius: 6px;
  color: #999;
  font-size: 0.85rem;
  text-align: center;
}

.panel {
  display: flex;
  flex-direction: column;
  resize: both;
  overflow: auto;
  min-width: 16rem;
  min-height: 4rem;
}
.panel.dragging { opacity: 0.4; }
.panel.drag-over { outline: 2px dashed #1a5c3a; outline-offset: 3px; }
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

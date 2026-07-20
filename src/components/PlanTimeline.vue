<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useProjectionStore } from '../stores/projection'
import type { FinancialItem, ItemType } from '../types'
import { addMonths, clampYm, monthIndex, monthSpan, pxDeltaToMonths, shortMonthLabel } from '../timeline/dateMath'
import { buildColumns, COLUMN_WIDTH_PX, GRANULARITIES, pxPerMonth, SNAP_MONTHS, type Granularity } from '../timeline/columnScale'
import { computeItemSpan, hasDrawdownPhase, isResizable, resizeItemEnd, shiftItemDates, type ItemSpan } from '../timeline/itemSpan'

const store = useProjectionStore()

const TYPE_LABELS: Record<ItemType, string> = {
  'asset':        'Asset',
  'investment':   'Investment',
  'income':       'Income',
  'expenditure':  'Expenditure',
  'liability':    'Liability',
  'event':        'One-off',
}

const GRANULARITY_LABELS: Record<Granularity, string> = {
  month: 'Month', quarter: 'Quarter', year: 'Year', fiveYear: '5yr', decade: 'Decade',
}

// Default: quarter granularity + horizontal scroll (see timeline/columnScale.ts
// for the full reasoning) — a 30-year plan renders as ~120 quarter columns,
// a readable middle ground between 360 literal months and 30 coarse years.
const granularity = ref<Granularity>('quarter')

const pxPerMonthValue = computed(() => pxPerMonth(granularity.value))
const columns = computed(() => buildColumns(store.from, store.to, granularity.value))
const totalWidth = computed(() => monthSpan(store.from, store.to) * pxPerMonthValue.value)

const itemPositions = computed(() => store.result?.nominal.itemPositions)
const spans = computed<ItemSpan[]>(() =>
  store.items.map(item => computeItemSpan(item, store.from, store.to, itemPositions.value)),
)

function monthsFromStart(ym: string): number {
  return monthIndex(ym, store.from)
}

function barLeftPx(i: number): number {
  return monthsFromStart(spans.value[i].start) * pxPerMonthValue.value
}
function barWidthPx(i: number): number {
  const s = spans.value[i]
  return (monthsFromStart(s.end) - monthsFromStart(s.start) + 1) * pxPerMonthValue.value
}

// Investment drawdown-phase colouring (stretch goal, #946 step 7): split the
// bar into an accumulation sub-div and a drawdown sub-div at drawdownStart.
// Drawdown rate is authoritative and the end is inferred (computeItemSpan
// already resolved that); there's no drawdownEnd field to solve backward from.
interface PhaseSplit { accumPct: number }
const phaseSplits = computed<(PhaseSplit | null)[]>(() =>
  store.items.map((item, i) => {
    if (!hasDrawdownPhase(item) || !item.drawdownStart) return null
    const span = spans.value[i]
    const totalMonths = monthsFromStart(span.end) - monthsFromStart(span.start) + 1
    if (totalMonths <= 0) return null
    const accumMonths = monthIndex(item.drawdownStart, store.from) - monthsFromStart(span.start)
    const pct = Math.min(100, Math.max(0, (accumMonths / totalMonths) * 100))
    return { accumPct: pct }
  }),
)

// --- Vertical drag reorder — identical pattern to PlanGrid.vue's native HTML5 DnD ---
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(i: number, e: DragEvent) {
  dragIndex.value = i
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i))
  }
}
function onDragOver(i: number, e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = i
}
function onDrop(i: number) {
  if (dragIndex.value !== null && dragIndex.value !== i) store.moveItem(dragIndex.value, i)
  dragIndex.value = null
  dragOverIndex.value = null
}
function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

// --- Horizontal drag: move the whole bar (shift start/end) or resize the
// right edge (extend/shorten end only). Both use plain mouse events rather
// than HTML5 DnD, since we need continuous pixel deltas rather than
// drop-target semantics. A click (no meaningful movement) opens the edit
// modal via the same store.startEdit the grid's edit button already uses.
interface BarDragState {
  index: number
  kind: 'move' | 'resize'
  startClientX: number
  previewDeltaPx: number
  didDrag: boolean
}
const barDrag = ref<BarDragState | null>(null)
const resizeTooltip = ref<{ x: number; y: number; text: string } | null>(null)

const CLICK_THRESHOLD_PX = 3

function beginBarDrag(i: number, kind: 'move' | 'resize', e: MouseEvent) {
  if (e.button !== 0) return
  e.preventDefault()
  barDrag.value = { index: i, kind, startClientX: e.clientX, previewDeltaPx: 0, didDrag: false }
  window.addEventListener('mousemove', onBarDragMove)
  window.addEventListener('mouseup', onBarDragUp)
}
function onBarPointerDown(i: number, e: MouseEvent) { beginBarDrag(i, 'move', e) }
function onResizePointerDown(i: number, e: MouseEvent) { beginBarDrag(i, 'resize', e) }

// The end date a resize-in-progress would commit to, given the live pixel
// delta — used both for the floating label and the eventual store update.
function previewEndMonth(state: BarDragState): string {
  const span = spans.value[state.index]
  const deltaMonths = pxDeltaToMonths(state.previewDeltaPx, pxPerMonthValue.value, SNAP_MONTHS[granularity.value])
  const minEnd = addMonths(span.start, 1)
  return clampYm(addMonths(span.end, deltaMonths), minEnd, store.to)
}

function onBarDragMove(e: MouseEvent) {
  const state = barDrag.value
  if (!state) return
  state.previewDeltaPx = e.clientX - state.startClientX
  if (Math.abs(state.previewDeltaPx) > CLICK_THRESHOLD_PX) state.didDrag = true
  if (state.kind === 'resize') {
    resizeTooltip.value = { x: e.clientX, y: e.clientY, text: shortMonthLabel(previewEndMonth(state)) }
  }
}

function endBarDragListeners() {
  window.removeEventListener('mousemove', onBarDragMove)
  window.removeEventListener('mouseup', onBarDragUp)
}

function onBarDragUp() {
  endBarDragListeners()
  const state = barDrag.value
  barDrag.value = null
  resizeTooltip.value = null
  if (!state) return

  // Negligible movement = a click, not a drag: open the edit modal.
  if (!state.didDrag) {
    store.startEdit(state.index)
    return
  }
  const deltaMonths = pxDeltaToMonths(state.previewDeltaPx, pxPerMonthValue.value, SNAP_MONTHS[granularity.value])
  if (deltaMonths === 0) return // dragged, but not far enough to cross a month boundary

  const item = store.items[state.index]
  if (state.kind === 'move') {
    store.updateItem(state.index, shiftItemDates(item, deltaMonths))
  } else {
    store.updateItem(state.index, resizeItemEnd(item, previewEndMonth(state)))
  }
}

onUnmounted(endBarDragListeners)

// While dragging, follow the raw cursor (no rounding) for responsive feedback;
// the underlying dates only snap to whole months on drop (see onBarDragUp),
// at which point the CSS transition (see <style>) animates the bar into its
// snapped position/width.
function barStyle(i: number) {
  let left = barLeftPx(i)
  let width = barWidthPx(i)
  const state = barDrag.value
  if (state && state.index === i) {
    if (state.kind === 'move') left += state.previewDeltaPx
    else width = Math.max(pxPerMonthValue.value, width + state.previewDeltaPx)
  }
  return { left: `${left}px`, width: `${width}px` }
}

function markerStyle(i: number) {
  const s = spans.value[i]
  return { left: `${monthsFromStart(s.start) * pxPerMonthValue.value + pxPerMonthValue.value / 2}px` }
}

function onMarkerClick(i: number) {
  store.startEdit(i)
}

function itemTitle(item: FinancialItem): string {
  return item.description ? `${item.name} — ${item.description}` : item.name
}
</script>

<template>
  <details class="plan-timeline" open>
    <summary>
      <div class="summary-row">
        <span>Items ({{ store.items.length }})</span>
        <span class="granularity-toggle">
          <button
            v-for="g in GRANULARITIES" :key="g" type="button"
            :class="{ active: granularity === g }"
            @click.prevent="granularity = g"
          >{{ GRANULARITY_LABELS[g] }}</button>
        </span>
      </div>
    </summary>

    <p v-if="store.items.length === 0" class="empty">No items yet.</p>

    <div v-else class="timeline-grid">
      <div class="labels-col">
        <div class="corner-cell"></div>
        <div
          v-for="(item, i) in store.items" :key="i"
          class="label-row"
          :class="{ editing: store.editingIndex === i, dragging: dragIndex === i, 'drag-over': dragOverIndex === i && dragIndex !== i }"
          @dragover="onDragOver(i, $event)" @drop="onDrop(i)" @dragend="onDragEnd"
        >
          <span class="handle" draggable="true" @dragstart="onDragStart(i, $event)" aria-label="Drag to reorder">⠿</span>
          <span class="type-badge">{{ TYPE_LABELS[item.type] }}</span>
          <span class="item-name">{{ item.name }}</span>
        </div>
      </div>

      <div class="scroll-area">
        <div class="timeline-inner" :style="{ width: totalWidth + 'px' }">
          <div class="header-row">
            <div
              v-for="(col, ci) in columns" :key="ci" class="col-header"
              :style="{ width: col.months * pxPerMonthValue + 'px' }"
            >{{ col.label }}</div>
          </div>

          <div class="bars-area" :style="{ '--col-width': `${COLUMN_WIDTH_PX[granularity]}px` }">
            <div
              v-for="(item, i) in store.items" :key="i"
              class="timeline-row"
              :class="{ 'drag-over': dragOverIndex === i && dragIndex !== i }"
              @dragover="onDragOver(i, $event)" @drop="onDrop(i)" @dragend="onDragEnd"
            >
              <div
                v-if="spans[i].kind === 'point'"
                class="marker" :style="markerStyle(i)" :title="itemTitle(item)"
                @click="onMarkerClick(i)"
              ></div>
              <div
                v-else
                class="bar"
                :class="[item.type, { 'open-ended': spans[i].openEnded, dragging: barDrag?.index === i, 'has-phases': !!phaseSplits[i], editing: store.editingIndex === i }]"
                :style="barStyle(i)"
                :title="itemTitle(item)"
                @mousedown="onBarPointerDown(i, $event)"
              >
                <template v-if="phaseSplits[i]">
                  <div class="phase accumulation" :style="{ width: phaseSplits[i]!.accumPct + '%' }"></div>
                  <div class="phase drawdown" :style="{ left: phaseSplits[i]!.accumPct + '%' }"></div>
                </template>
                <span class="bar-label">{{ item.name }}</span>
                <div
                  v-if="isResizable(item)" class="resize-handle" aria-label="Drag to change end date"
                  @mousedown.stop="onResizePointerDown(i, $event)"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="resizeTooltip" class="resize-tooltip" :style="{ left: `${resizeTooltip.x + 12}px`, top: `${resizeTooltip.y - 28}px` }">
      {{ resizeTooltip.text }}
    </div>
  </details>
</template>

<style scoped>
.plan-timeline {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}
summary {
  cursor: pointer;
  font-weight: 600;
  color: #555;
  padding: 0.3rem 0;
  list-style: revert;
}
.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.granularity-toggle { display: flex; gap: 0.25rem; }
.granularity-toggle button {
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 500;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #555;
  cursor: pointer;
}
.granularity-toggle button:hover { border-color: #1a5c3a; color: #1a5c3a; }
.granularity-toggle button.active { background: #1a5c3a; border-color: #1a5c3a; color: #fff; }
.empty { color: #999; font-size: 0.9rem; }

.timeline-grid { display: grid; grid-template-columns: 180px 1fr; align-items: start; }

.labels-col { display: flex; flex-direction: column; border-right: 1px solid #eee; }
.corner-cell { height: 28px; border-bottom: 1px solid #ddd; background: #fafafa; }
.label-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  height: 32px;
  padding: 0 0.4rem;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.78rem;
  overflow: hidden;
}
.label-row.editing { background: #eef6f0; }
.label-row.dragging { opacity: 0.4; }
.label-row.drag-over { border-top: 2px solid #1a5c3a; }
.handle { cursor: grab; color: #ccc; user-select: none; font-size: 0.85rem; flex-shrink: 0; }
.handle:hover { color: #888; }
.handle:active { cursor: grabbing; }
.type-badge {
  background: #eee;
  border-radius: 3px;
  padding: 0.05rem 0.35rem;
  font-size: 0.65rem;
  color: #555;
  white-space: nowrap;
  flex-shrink: 0;
}
.item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.scroll-area { overflow-x: auto; }
.timeline-inner { position: relative; }
.header-row {
  display: flex;
  height: 28px;
  border-bottom: 1px solid #ddd;
  position: sticky;
  top: 0;
  background: #fafafa;
  z-index: 2;
}
.col-header {
  flex-shrink: 0;
  border-right: 1px solid #eee;
  font-size: 0.68rem;
  color: #777;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  box-sizing: border-box;
}
.bars-area {
  position: relative;
  background-image: repeating-linear-gradient(
    to right, transparent, transparent calc(var(--col-width) - 1px),
    #f2f2f2 calc(var(--col-width) - 1px), #f2f2f2 var(--col-width)
  );
}
.timeline-row { position: relative; height: 32px; border-bottom: 1px solid #f0f0f0; }
.timeline-row.drag-over { border-top: 2px solid #1a5c3a; }

.bar {
  position: absolute;
  top: 5px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  overflow: hidden;
  cursor: grab;
  color: #fff;
  font-size: 0.7rem;
  padding: 0 0.35rem;
  box-sizing: border-box;
  user-select: none;
  transition: left 150ms ease, width 150ms ease;
}
.bar:active { cursor: grabbing; }
.bar.dragging { transition: none; opacity: 0.85; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); z-index: 3; }
.bar.editing { outline: 2px solid #1a5c3a; outline-offset: 1px; }
.bar.open-ended { border-right: 2px dashed rgba(255, 255, 255, 0.65); }
.bar-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; position: relative; z-index: 1; }

.bar.asset { background: #2f6fb2; }
.bar.income { background: #1a5c3a; }
.bar.expenditure { background: #a4232f; }
.bar.liability { background: #7a5c1e; }
.bar.investment { background: #5b3a91; }
.bar.has-phases { background: transparent; }

.phase { position: absolute; top: 0; bottom: 0; }
.phase.accumulation { left: 0; background: #5b3a91; }
.phase.drawdown { right: 0; background: #c9861a; }

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  background: rgba(255, 255, 255, 0.15);
  z-index: 2;
}
.bar:hover .resize-handle { background: rgba(255, 255, 255, 0.55); }

.marker {
  position: absolute;
  top: 50%;
  width: 13px;
  height: 13px;
  transform: translate(-50%, -50%) rotate(45deg);
  background: #c9861a;
  box-shadow: 0 0 0 2px #fff;
  cursor: pointer;
}
.marker:hover { background: #a4232f; }

.resize-tooltip {
  position: fixed;
  pointer-events: none;
  background: #222;
  color: #fff;
  padding: 2px 7px;
  border-radius: 3px;
  font-size: 0.75rem;
  z-index: 200;
  white-space: nowrap;
}
</style>

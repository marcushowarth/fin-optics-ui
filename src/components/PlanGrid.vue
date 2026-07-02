<script setup lang="ts">
import { ref } from 'vue'
import { useProjectionStore } from '../stores/projection'
import type { ItemType, FinancialItem } from '../types'

const store = useProjectionStore()

const TYPE_LABELS: Record<ItemType, string> = {
  'asset':        'Asset',
  'investment':   'Investment',
  'income':       'Income',
  'expenditure':  'Expenditure',
  'liability':    'Liability',
  'event':        'One-off',
}

// Which underlying property the shared Amount/Value column maps to, per type.
// Start, End and Rate are edited in the full item modal, not this grid.
const AMOUNT_FIELD: Record<ItemType, string | null> = {
  'asset': 'startValue', 'investment': 'startValue',
  'income': 'monthlyAmount', 'expenditure': 'monthlyAmount', 'liability': 'balance', 'event': 'amount',
}

function field(item: FinancialItem, name: string | null): unknown {
  return name ? (item as unknown as Record<string, unknown>)[name] : undefined
}

// Reuse the store update path: clone, set (or clear) one field, replace.
function setField(i: number, name: string | null, value: unknown) {
  if (!name) return
  const updated = { ...store.items[i] } as Record<string, unknown>
  if (value === undefined || value === '') delete updated[name]
  else updated[name] = value
  store.updateItem(i, updated as unknown as FinancialItem)
}

function onName(i: number, e: Event) {
  setField(i, 'name', (e.target as HTMLInputElement).value)
}
function onNumber(i: number, name: string | null, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '') return
  setField(i, name, Number(raw))
}

// Remove requires a second click on the same row within 3s, else it lapses.
const confirmingIndex = ref<number | null>(null)
let confirmTimeout: ReturnType<typeof setTimeout> | undefined

function onRemoveClick(i: number) {
  if (confirmingIndex.value === i) {
    clearTimeout(confirmTimeout)
    confirmingIndex.value = null
    store.removeItem(i)
    return
  }
  clearTimeout(confirmTimeout)
  confirmingIndex.value = i
  confirmTimeout = setTimeout(() => { confirmingIndex.value = null }, 3000)
}

// --- Drag-and-drop reordering (native HTML5, via the row handle) ---
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(i: number, e: DragEvent) {
  dragIndex.value = i
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i))
    // drag the whole row, not just the handle
    const row = (e.target as HTMLElement).closest('tr')
    if (row) e.dataTransfer.setDragImage(row, 0, 0)
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
</script>

<template>
  <details class="plan-grid" open>
    <summary>Items ({{ store.items.length }})</summary>
    <p v-if="store.items.length === 0" class="empty">No items yet.</p>
    <table v-else>
      <thead>
        <tr>
          <th></th>
          <th>Type</th>
          <th>Name</th>
          <th class="num">Amount / Value (£)</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, i) in store.items" :key="i"
          :class="{ editing: store.editingIndex === i, dragging: dragIndex === i, 'drag-over': dragOverIndex === i && dragIndex !== i }"
          @dragover="onDragOver(i, $event)" @drop="onDrop(i)" @dragend="onDragEnd"
        >
          <td class="handle-cell">
            <span class="handle" draggable="true" @dragstart="onDragStart(i, $event)" aria-label="Drag to reorder">⠿</span>
          </td>
          <td><span class="type-badge">{{ TYPE_LABELS[item.type] }}</span></td>
          <td>
            <input class="cell name" type="text" :value="item.name" @change="onName(i, $event)" />
          </td>
          <td class="num">
            <input
              v-if="AMOUNT_FIELD[item.type]" class="cell num" type="number" step="0.01"
              :value="field(item, AMOUNT_FIELD[item.type])"
              @change="onNumber(i, AMOUNT_FIELD[item.type], $event)"
            />
          </td>
          <td class="actions">
            <template v-if="confirmingIndex === i">
              <span class="confirm-text">Remove?</span>
              <button class="confirm-yes" aria-label="Confirm remove" @click="onRemoveClick(i)">✓</button>
              <button class="confirm-no" aria-label="Cancel remove" @click="confirmingIndex = null">✕</button>
            </template>
            <template v-else>
              <button class="edit" aria-label="Edit full item" @click="store.startEdit(i)">✎</button>
              <button class="remove" aria-label="Remove" @click="onRemoveClick(i)">✕</button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </details>
</template>

<style scoped>
.plan-grid {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  overflow-x: auto;
}
summary { cursor: pointer; font-weight: 600; color: #555; padding: 0.3rem 0; list-style: revert; }
.empty { color: #999; font-size: 0.9rem; }
table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
th, td { padding: 0.3rem 0.4rem; border-bottom: 1px solid #f0f0f0; text-align: left; }
th { color: #777; font-weight: 600; font-size: 0.75rem; white-space: nowrap; }
th.num, td.num { text-align: right; }
tr.editing { background: #eef6f0; }
tr.dragging { opacity: 0.4; }
tr.drag-over td { border-top: 2px solid #1a5c3a; }
.handle-cell { width: 1.1rem; text-align: center; padding-right: 0; }
.handle { cursor: grab; color: #ccc; user-select: none; font-size: 0.9rem; }
.handle:hover { color: #888; }
.handle:active { cursor: grabbing; }
.type-badge {
  background: #eee;
  border-radius: 3px;
  padding: 0.1rem 0.4rem;
  font-size: 0.7rem;
  color: #555;
  white-space: nowrap;
}
.cell {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 3px;
  padding: 0.2rem 0.3rem;
  font: inherit;
  background: transparent;
}
.cell:hover { border-color: #ddd; }
.cell:focus { border-color: #1a5c3a; outline: none; background: #fff; }
/* auto-size numeric cells to their content (longer digits fit) */
.cell.num { width: auto; field-sizing: content; min-width: 4.5rem; max-width: 10rem; text-align: right; }
.cell.name { min-width: 7rem; }
.actions { white-space: nowrap; text-align: right; }
.actions button {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.1rem 0.3rem;
}
.edit:hover { color: #1a5c3a; }
.remove:hover { color: #c00; }
.confirm-text { color: #c00; font-size: 0.75rem; margin-right: 0.2rem; }
.confirm-yes:hover { color: #1a5c3a; }
.confirm-no:hover { color: #c00; }
</style>

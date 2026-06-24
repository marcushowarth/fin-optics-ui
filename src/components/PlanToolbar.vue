<script setup lang="ts">
import { ref } from 'vue'
import { useProjectionStore } from '../stores/projection'

const store = useProjectionStore()
const fileInput = ref<HTMLInputElement | null>(null)
const importError = ref<string | null>(null)

function exportPlan() {
  const blob = new Blob([store.exportPlan()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `fin-optics-plan-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  importError.value = null
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    store.importPlan(await file.text())
  } catch {
    importError.value = 'Could not read that file — expected a FIN OPTICS plan JSON.'
  } finally {
    input.value = '' // reset so the same file can be re-imported
  }
}
</script>

<template>
  <div class="plan-toolbar">
    <button class="plan-btn" :disabled="store.items.length === 0" @click="exportPlan">Export Plan</button>
    <button class="plan-btn" @click="triggerImport">Import Plan</button>
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="hidden-input"
      @change="onFileChange"
    />
    <span v-if="importError" class="import-error">{{ importError }}</span>
  </div>
</template>

<style scoped>
.plan-toolbar { display: flex; gap: 0.5rem; align-items: center; }
.plan-btn {
  padding: 0.4rem 1rem;
  background: #fff;
  color: #1a5c3a;
  border: 1px solid #1a5c3a;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}
.plan-btn:disabled { color: #999; border-color: #ccc; cursor: not-allowed; }
.hidden-input { display: none; }
.import-error { color: #c00; font-size: 0.85rem; }
</style>

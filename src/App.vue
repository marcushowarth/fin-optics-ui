<script setup lang="ts">
import { ref } from 'vue'
import { useProjectionStore } from './stores/projection'
import ItemForm from './components/ItemForm.vue'
import PlanGrid from './components/PlanGrid.vue'
import PlanTimeline from './components/PlanTimeline.vue'
import PlanToolbar from './components/PlanToolbar.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ProjectionView from './components/ProjectionView.vue'
import AppFooter from './components/AppFooter.vue'

const store = useProjectionStore()

// Grid and Timeline are two views onto the same store.items — same pattern as
// the Total/Breakdown toggle in ProjectionView.vue. The grid stays available
// (not replaced); this just adds a second way to look at the same plan.
const itemsView = ref<'grid' | 'timeline'>('grid')
</script>

<template>
  <div class="app">
    <h1>FIN OPTICS</h1>
    <p class="tagline">Financial projection engine — items in, 30-year view out.</p>

    <div class="layout">
      <div class="left">
        <div class="top-bar">
          <PlanToolbar />
          <button v-if="store.items.length > 0" class="run-btn" :disabled="store.loading" @click="store.runProjection">
            {{ store.loading ? 'Running…' : 'Run Projection' }}
          </button>
          <p v-if="store.error" class="error inline-error">{{ store.error }}</p>
        </div>
        <SettingsPanel />

        <div class="view-toggle">
          <button class="view-toggle-btn" :class="{ active: itemsView === 'grid' }" @click="itemsView = 'grid'">Details</button>
          <button class="view-toggle-btn" :class="{ active: itemsView === 'timeline' }" @click="itemsView = 'timeline'">Timeline</button>
        </div>
        <PlanGrid v-if="itemsView === 'grid'" />
        <PlanTimeline v-else />

        <button class="add-item-btn" @click="store.startAdd">+ Add Items</button>

        <!-- Adding and editing both open the same form in a modal, so the
             full field set gets room without cramping the grid/left column. -->
        <Teleport v-if="store.formOpen" to="body">
          <div class="modal-backdrop" @click.self="store.cancelEdit">
            <ItemForm />
          </div>
        </Teleport>
      </div>
      <div class="right">
        <ProjectionView />
      </div>
    </div>

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
.layout { display: grid; grid-template-columns: 480px 1fr; gap: 1.5rem; align-items: start; }
.left  { display: flex; flex-direction: column; gap: 1rem; }
.right { display: flex; flex-direction: column; gap: 1rem; }
.top-bar { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
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

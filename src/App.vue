<script setup lang="ts">
import { useProjectionStore } from './stores/projection'
import ItemForm from './components/ItemForm.vue'
import ItemList from './components/ItemList.vue'
import PlanToolbar from './components/PlanToolbar.vue'
import ProjectionView from './components/ProjectionView.vue'
import AppFooter from './components/AppFooter.vue'

const store = useProjectionStore()
</script>

<template>
  <div class="app">
    <h1>FIN OPTICS</h1>
    <p class="tagline">Financial projection engine — items in, 30-year view out.</p>

    <div class="layout">
      <ItemForm />
      <div class="right">
        <PlanToolbar />
        <ItemList />
        <div v-if="store.items.length > 0" class="run-row">
          <button class="run-btn" :disabled="store.loading" @click="store.runProjection">
            {{ store.loading ? 'Running…' : 'Run Projection' }}
          </button>
        </div>
        <p v-if="store.error" class="error">{{ store.error }}</p>
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
.right { display: flex; flex-direction: column; gap: 1rem; }
.run-row { text-align: right; }
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
</style>

<script setup lang="ts">
import { useProjectionStore } from './stores/projection'

const store = useProjectionStore()
</script>

<template>
  <div class="app">
    <h1>FIN OPTICS</h1>
    <p>Financial projection engine — items in, 30-year view out.</p>
    <pre v-if="store.result">{{ JSON.stringify(store.result.nominal.netWorth, null, 2) }}</pre>
    <p v-if="store.error" style="color: red">{{ store.error }}</p>
  </div>
</template>

<style>
body { font-family: sans-serif; margin: 0; background: #f5f5f5; }
.app { max-width: 1200px; margin: 0 auto; padding: 2rem; }
</style>

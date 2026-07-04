<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchVersion, type VersionInfo } from '../api/version'

const uiVersion = __UI_VERSION__
const uiBuiltAt = __UI_BUILT_AT__
const api = ref<VersionInfo | null>(null)

onMounted(async () => {
  try {
    api.value = await fetchVersion()
  } catch {
    api.value = null // API unreachable — show a dash rather than failing
  }
})

const short = (s: string) => (s === 'dev' ? 'dev' : s.slice(0, 7))

function tooltip(): string {
  const apiLine = api.value
    ? `API ${api.value.version} (${api.value.gitSha}) built ${api.value.builtAt}`
    : 'API unreachable'
  return `UI ${uiVersion} built ${uiBuiltAt}\n${apiLine}`
}
</script>

<template>
  <footer class="app-footer">
    <div class="version-row" :title="tooltip()">
      <span>FIN OPTICS</span>
      <span class="sep">·</span>
      <span>UI {{ short(uiVersion) }}</span>
      <span class="sep">·</span>
      <span>API {{ api ? short(api.gitSha) : '—' }}</span>
    </div>
    <p class="privacy">
      Nothing you enter is stored on our servers — any plan you save lives in your
      browser only. Inputs are sent over HTTPS solely to compute your projection,
      not persisted or logged. Illustrative only — not financial advice.
    </p>
  </footer>
</template>

<style scoped>
.app-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e2e2;
  color: #999;
  font-size: 0.75rem;
  text-align: center;
}
.version-row {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
}
.sep { color: #ccc; }
.privacy {
  margin: 0.4rem auto 0;
  max-width: 32rem;
  color: #aaa;
  line-height: 1.4;
}
</style>

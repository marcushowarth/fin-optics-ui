<script setup lang="ts">
import { useProjectionStore } from '../stores/projection'

const store = useProjectionStore()

const TYPE_LABELS: Record<string, string> = {
  'asset':        'Asset',
  'investment':   'Investment',
  'bank-account': 'Bank Account',
  'income':       'Income',
  'expenditure':  'Expenditure',
  'liability':    'Liability',
  'event':        'One-off',
}
</script>

<template>
  <div class="item-list">
    <h2>Items ({{ store.items.length }})</h2>
    <p v-if="store.items.length === 0" class="empty">No items yet.</p>
    <ul v-else>
      <li v-for="(item, i) in store.items" :key="i" :class="{ editing: store.editingIndex === i }">
        <span class="type-badge">{{ TYPE_LABELS[item.type] }}</span>
        <span class="name">{{ item.name }}</span>
        <span v-if="item.description" class="desc">— {{ item.description }}</span>
        <button class="edit" @click="store.startEdit(i)" aria-label="Edit">✎</button>
        <button class="remove" @click="store.removeItem(i)" aria-label="Remove">✕</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.item-list {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1.5rem;
}
h2 { margin: 0 0 1rem; font-size: 1.1rem; }
.empty { color: #999; font-size: 0.9rem; }
ul { list-style: none; margin: 0; padding: 0; }
li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.9rem;
}
li:last-child { border-bottom: none; }
li.editing { background: #eef6f0; }
.type-badge {
  background: #eee;
  border-radius: 3px;
  padding: 0.1rem 0.4rem;
  font-size: 0.75rem;
  color: #555;
  white-space: nowrap;
}
.name { font-weight: 500; }
.desc { color: #777; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
button {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.1rem 0.3rem;
  flex-shrink: 0;
}
.edit { margin-left: auto; }
.edit:hover { color: #1a5c3a; }
.remove:hover { color: #c00; }
</style>

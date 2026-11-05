<script setup>
defineProps({
  sources: { type: Array, required: true },
})

const numberFormatter = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })
const formatMm = (value) => `${numberFormatter.format(value)} mm`
</script>

<template>
  <ul class="source-list">
    <li v-for="source in sources" :key="source.id" class="source-list__row">
      <span class="source-list__name">{{ source.name }}</span>
      <bdi class="source-list__value">{{ source.label }} · {{ formatMm(source.precip) }}</bdi>
    </li>
  </ul>
</template>

<style scoped>
.source-list { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.source-list__row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 5px 10px; font-size: 0.8rem; border-radius: 10px; background: rgba(127, 127, 127, 0.12); }
.source-list__name { color: var(--text-muted, #737373); flex: none; }
.source-list__value { font-weight: 600; text-align: end; }
</style>

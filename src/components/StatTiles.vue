<script setup>
defineProps({ items: { type: Array, required: true } }) // [{ label, value, sub, tone }]
</script>

<template>
  <dl class="stats__grid">
    <div v-for="it in items" :key="it.label" class="stats__item" :class="it.tone ? `is-${it.tone}` : ''">
      <dt>{{ it.label }}</dt>
      <dd>
        <bdi>{{ it.value }}</bdi>
        <span v-if="it.arrow != null" class="stats__arrow" :style="{ transform: `rotate(${it.arrow}deg)` }">↑</span>
      </dd>
      <small v-if="it.sub">{{ it.sub }}</small>
    </div>
  </dl>
</template>

<style scoped>
.stats__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin: 0; }
.stats__item { padding: 12px 14px; border: 1px solid var(--border); border-radius: 14px; background: var(--card); min-width: 0; }
.stats__item dt { font-size: 0.74rem; color: var(--text-muted); }
.stats__item dd { margin: 4px 0 2px; font-size: 1.05rem; font-weight: 800; text-align: start; overflow-wrap: anywhere; display: flex; align-items: center; gap: 6px; }
.stats__item small { display: block; font-size: 0.68rem; line-height: 1.6; color: var(--text-muted); }
.stats__item.is-up dd { color: var(--up); }
.stats__item.is-down dd { color: var(--down); }
.stats__arrow { display: inline-block; font-size: 1rem; color: var(--accent); transition: transform 0.2s ease; }
@media (max-width: 480px) {
  .stats__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .stats__item { padding: 10px 12px; }
}
</style>

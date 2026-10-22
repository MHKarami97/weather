<script setup>
defineProps({ reports: { type: Array, required: true } })
const LEVEL_LABEL = { danger: 'هشدار', warn: 'توجه', good: 'مناسب', info: 'اطلاعات' }
</script>

<template>
  <div class="reports">
    <article v-for="r in reports" :key="r.title" class="reports__item card" :class="`is-${r.level}`">
      <span class="reports__icon" aria-hidden="true">{{ r.icon }}</span>
      <div class="reports__body">
        <header>
          <strong>{{ r.title }}</strong>
          <em>{{ LEVEL_LABEL[r.level] }}</em>
        </header>
        <p>{{ r.text }}</p>
      </div>
    </article>
  </div>
</template>

<style scoped>
.reports { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
.reports__item { --tone: var(--text-muted); display: flex; gap: 12px; padding: 12px 14px; border-inline-start: 4px solid var(--tone); }
.reports__item.is-danger { --tone: var(--down); }
.reports__item.is-warn { --tone: #f59e0b; }
.reports__item.is-good { --tone: var(--up); }
.reports__item.is-info { --tone: var(--accent); }
.reports__icon { font-size: 1.5rem; line-height: 1.3; }
.reports__body { min-width: 0; }
.reports__body header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.reports__body strong { font-size: 0.9rem; }
.reports__body em { font-style: normal; font-size: 0.64rem; font-weight: 700; padding: 1px 8px; border-radius: 999px; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
.reports__body p { margin: 4px 0 0; font-size: 0.8rem; line-height: 1.9; color: var(--text-muted); }
</style>

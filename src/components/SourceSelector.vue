<script setup>
import { computed } from 'vue'
import { useWeatherStore } from '../stores/weather.js'
import { relativeFa } from '../utils/format.js'

const props = defineProps({ now: { type: Number, required: true } })

const OUTDATED_AFTER_INTERVALS = 3
const store = useWeatherStore()

const options = computed(() =>
  store.availableSources.map((source) => ({
    id: source.id,
    label: source.label,
    ago: relativeFa(source.fetchedAtMs, props.now),
    isActive: source.id === store.sourceId,
    isOutdated: props.now - source.fetchedAtMs > OUTDATED_AFTER_INTERVALS * source.intervalMinutes * 60_000,
  })),
)
</script>

<template>
  <nav v-if="options.length > 1" class="sources" aria-label="منبع داده">
    <span class="sources__title">منبع داده</span>
    <div class="sources__list scroll-row" role="radiogroup">
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        role="radio"
        class="sources__chip"
        :class="{ 'is-active': option.isActive, 'is-outdated': option.isOutdated }"
        :aria-checked="option.isActive"
        @click="store.selectSource(option.id)"
      >
        <strong>{{ option.label }}</strong>
        <small>{{ option.ago }}</small>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.sources { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.sources__title { flex-shrink: 0; font-size: 0.75rem; color: var(--text-muted); }
.sources__list { flex: 1; min-width: 0; padding-bottom: 4px; }
.sources__chip {
  display: inline-flex; flex-direction: column; align-items: flex-start; gap: 2px; flex-shrink: 0;
  min-height: 44px; padding: 6px 14px; border: 1px solid var(--border); border-radius: 12px;
  background: var(--bg-elevated); color: var(--text); font: inherit; cursor: pointer; white-space: nowrap;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.sources__chip strong { font-size: 0.82rem; }
.sources__chip small { font-size: 0.66rem; color: var(--text-muted); }
.sources__chip:hover { border-color: color-mix(in srgb, var(--accent) 50%, var(--border)); }
.sources__chip.is-active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, var(--bg-elevated)); }
.sources__chip.is-outdated small { color: #f59e0b; }
.sources__chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (max-width: 480px) {
  .sources { flex-direction: column; align-items: stretch; gap: 4px; }
}
</style>

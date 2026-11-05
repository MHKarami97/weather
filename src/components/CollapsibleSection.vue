<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  storageKey: { type: String, required: true },
  title: { type: String, required: true },
})

const KEY_PREFIX = 'weather-section-open:'

function readOpen(key) {
  try {
    return localStorage.getItem(KEY_PREFIX + key) !== '0'
  } catch {
    return true
  }
}

const open = ref(readOpen(props.storageKey))

watch(open, (value) => {
  try {
    localStorage.setItem(KEY_PREFIX + props.storageKey, value ? '1' : '0')
  } catch {
    // private mode
  }
})
</script>

<template>
  <section class="collapsible">
    <h2 class="section-title collapsible__title">
      <button
        type="button"
        class="collapsible__toggle"
        :aria-expanded="open"
        :aria-controls="`section-${storageKey}`"
        @click="open = !open"
      >
        <span>{{ title }}</span>
        <svg class="collapsible__chevron" :class="{ 'is-open': open }" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </h2>
    <div v-if="open" :id="`section-${storageKey}`" class="collapsible__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.collapsible { margin-top: 24px; }
.collapsible__title { margin: 0 0 12px; }
.collapsible__toggle {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; padding: 4px 0; background: none; border: 0; color: inherit;
  font: inherit; cursor: pointer; text-align: start;
}
.collapsible__toggle:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; border-radius: 6px; }
.collapsible__chevron { transition: transform 0.2s ease; flex: none; }
.collapsible__chevron.is-open { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) { .collapsible__chevron { transition: none; } }
</style>

<script setup>
defineProps({
  modelValue: { type: [Number, String], required: true },
  options: { type: Array, required: true }, // [{ value, label }]
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="range-tabs" role="tablist">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="tab"
      class="range-tabs__btn"
      :class="{ 'is-active': o.value === modelValue }"
      :aria-selected="o.value === modelValue"
      @click="emit('update:modelValue', o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>

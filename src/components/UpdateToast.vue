<script setup>
import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

const updating = ref(false)

const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS)
  },
})

async function reload() {
  updating.value = true
  try {
    await updateServiceWorker(true)
  } finally {
    updating.value = false
  }
}

function dismiss() {
  needRefresh.value = false
}
</script>

<template>
  <Transition name="toast">
    <aside v-if="needRefresh" class="update-toast" role="status" aria-live="polite">
      <span class="update-toast__icon" aria-hidden="true">✨</span>
      <div class="update-toast__text">
        <strong>نسخه‌ی جدید آماده است</strong>
        <span>برای دیدن آخرین تغییرات، برنامه را به‌روزرسانی کنید.</span>
      </div>
      <div class="update-toast__actions">
        <button type="button" class="update-toast__btn update-toast__btn--primary" :disabled="updating" @click="reload">
          {{ updating ? 'در حال به‌روزرسانی…' : 'به‌روزرسانی' }}
        </button>
        <button type="button" class="update-toast__btn" :disabled="updating" @click="dismiss">بعداً</button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.update-toast {
  position: fixed;
  z-index: 60;
  inset-inline: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  margin-inline: auto;
  max-width: 520px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px 12px;
  align-items: center;
  padding: 12px 14px;
  background: var(--bg-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-inline-start: 4px solid var(--accent);
  border-radius: var(--radius, 16px);
  box-shadow: var(--shadow-hover, 0 14px 32px rgba(0, 0, 0, 0.32));
}
.update-toast__icon { font-size: 1.4rem; line-height: 1; }
.update-toast__text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.update-toast__text strong { font-size: 0.92rem; }
.update-toast__text span { font-size: 0.78rem; line-height: 1.7; color: var(--text-muted); }
.update-toast__actions { grid-column: 1 / -1; display: grid; grid-template-columns: 2fr 1fr; gap: 8px; }
.update-toast__btn {
  min-height: 44px;
  padding: 0 14px;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
}
.update-toast__btn--primary { color: #fff; background: var(--accent); border-color: transparent; }
.update-toast__btn:disabled { opacity: 0.6; cursor: progress; }
.update-toast__btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

@media (min-width: 640px) {
  .update-toast { grid-template-columns: auto 1fr auto; padding: 12px 16px; }
  .update-toast__actions { grid-column: auto; display: flex; }
  .update-toast__btn { min-height: 38px; }
}

.toast-enter-active, .toast-leave-active { transition: transform 0.25s ease, opacity 0.25s ease; }
.toast-enter-from, .toast-leave-to { transform: translateY(24px); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .toast-enter-active, .toast-leave-active { transition: none; } }
</style>

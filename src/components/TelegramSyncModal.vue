<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useReminderStore } from '../stores/reminder.js'
import { PROVINCE_BY_ID } from '../lib/provinces.js'

const store = useReminderStore()
let pollTimer = null

const pendingProvince = computed(() =>
  store.pendingProvinceId ? PROVINCE_BY_ID[store.pendingProvinceId] : null,
)

function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (store.modalOpen && !store.linked) {
      await store.checkStatus()
    }
  }, 2500)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(
  () => store.modalOpen,
  (open) => {
    if (open) {
      store.checkStatus()
      startPolling()
    } else {
      stopPolling()
    }
  },
)

watch(
  () => store.linked,
  (linked) => {
    if (linked && store.modalOpen) {
      stopPolling()
      setTimeout(() => {
        if (store.modalOpen) store.closeSyncModal()
      }, 2000)
    }
  },
)

onMounted(() => {
  if (store.modalOpen) startPolling()
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="store.modalOpen" class="modal-backdrop" @click.self="store.closeSyncModal">
        <div class="modal-dialog" role="dialog" aria-modal="true">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-icon" aria-hidden="true">🌦️</span>
              <h3 class="modal-title">یادآور باران و برف در تلگرام</h3>
            </div>
            <button
              type="button"
              class="modal-close"
              aria-label="بستن"
              @click="store.closeSyncModal"
            >
              ✕
            </button>
          </div>

          <div class="modal-body">
            <template v-if="store.linked">
              <div class="status-box is-connected">
                <span class="status-icon">✅</span>
                <div>
                  <strong>اتصال با موفقیت برقرار است</strong>
                  <p v-if="store.username">شناسه کاربری: @{{ store.username }}</p>
                  <p v-if="pendingProvince">
                    یادآور استان <b>{{ pendingProvince.name }}</b> فعال شد.
                  </p>
                </div>
              </div>

              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn--primary"
                  @click="store.closeSyncModal"
                >
                  متوجه شدم
                </button>
                <button
                  type="button"
                  class="btn btn--danger-outline"
                  @click="store.unlink"
                >
                  قطع اتصال از بات
                </button>
              </div>
            </template>

            <template v-else>
              <p class="modal-desc">
                برای اعلام هشدارهای باران و برف
                <span v-if="pendingProvince">
                  استان <b>{{ pendingProvince.name }}</b>
                </span>
                (یک روز قبل و صبح همان روز)، ابتدا لازم است بات تلگرام را یک‌بار استارت کنید:
              </p>

              <div class="modal-step">
                <div class="step-num">۱</div>
                <div class="step-content">
                  <p>روی دکمه‌ی زیر بزنید و در تلگرام گزینه‌ی <b>Start</b> را لمس کنید:</p>
                  <a
                    v-if="store.telegramBotUrl"
                    :href="store.telegramBotUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn--tg"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                    <span>اتصال در تلگرام</span>
                  </a>
                </div>
              </div>

              <div class="modal-step">
                <div class="step-num">۲</div>
                <div class="step-content">
                  <p>پس از ارسال استارت در بات، اتصال به صورت خودکار شناسایی می‌شود.</p>
                  <button
                    type="button"
                    class="btn btn--outline"
                    :disabled="store.isCheckingStatus"
                    @click="store.checkStatus"
                  >
                    <span v-if="store.isCheckingStatus" class="spinner"></span>
                    <span>{{ store.isCheckingStatus ? 'در حال بررسی...' : 'بررسی مجدد اتصال' }}</span>
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 9999;
}
.modal-dialog {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-hover);
  width: 100%;
  max-width: 480px;
  padding: 20px 24px 24px;
  color: var(--text);
  direction: rtl;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.modal-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.modal-icon {
  font-size: 1.4rem;
}
.modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.modal-close {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.15s ease;
}
.modal-close:hover {
  background: var(--card-hover);
  color: var(--text);
}
.modal-desc {
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--text-muted);
  margin-top: 0;
  margin-bottom: 18px;
}
.modal-step {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
  align-items: flex-start;
}
.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.9rem;
}
.step-content {
  flex: 1;
}
.step-content p {
  margin: 0 0 10px;
  font-size: 0.88rem;
  line-height: 1.7;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
  transition: all 0.18s ease;
}
.btn--tg {
  background: #229ed9;
  color: #fff;
  width: 100%;
}
.btn--tg:hover {
  background: #1b87ba;
}
.btn--primary {
  background: var(--accent);
  color: #fff;
}
.btn--outline {
  border-color: var(--border);
  background: var(--card);
  color: var(--text);
}
.btn--outline:hover {
  background: var(--card-hover);
}
.btn--danger-outline {
  border-color: rgba(239, 68, 68, 0.4);
  background: transparent;
  color: #ef4444;
  font-size: 0.82rem;
  padding: 6px 12px;
}
.btn--danger-outline:hover {
  background: rgba(239, 68, 68, 0.1);
}
.status-box {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}
.status-box.is-connected {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.status-icon {
  font-size: 1.8rem;
}
.status-box strong {
  display: block;
  font-size: 0.95rem;
  color: var(--text);
  margin-bottom: 4px;
}
.status-box p {
  margin: 0;
  font-size: 0.84rem;
  color: var(--text-muted);
}
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

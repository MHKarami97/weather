import { defineStore } from 'pinia'
import { REMINDER_API_BASE } from '../config.js'

const LINK_CODE_KEY = 'weather-telegram-link-code'
const SUBSCRIPTIONS_KEY = 'weather-subscriptions'
const LINKED_USER_KEY = 'weather-telegram-username'

function generateRandomCode() {
  const bytes = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `wth_${hex}`
}

function getStoredLinkCode() {
  let code = localStorage.getItem(LINK_CODE_KEY)
  if (!code || !code.startsWith('wth_')) {
    code = generateRandomCode()
    localStorage.setItem(LINK_CODE_KEY, code)
  }
  return code
}

function readJson(key, fallback = []) {
  try {
    const val = JSON.parse(localStorage.getItem(key))
    return Array.isArray(val) ? val : fallback
  } catch {
    return fallback
  }
}

export const useReminderStore = defineStore('reminder', {
  state: () => ({
    linkCode: getStoredLinkCode(),
    linked: false,
    username: localStorage.getItem(LINKED_USER_KEY) || null,
    botUsername: 'f1_reminder_bot',
    subscriptions: readJson(SUBSCRIPTIONS_KEY),
    modalOpen: false,
    pendingProvinceId: null,
    loading: false,
    isCheckingStatus: false,
    initialized: false,
  }),

  getters: {
    isSubscribed: (state) => (provinceId) => state.subscriptions.includes(provinceId),
    telegramBotUrl: (state) =>
      state.botUsername ? `https://t.me/${state.botUsername}?start=${state.linkCode}` : null,
  },

  actions: {
    async init() {
      if (this.initialized) return
      this.initialized = true

      try {
        const res = await fetch(`${REMINDER_API_BASE}/api/weather/config`)
        if (res.ok) {
          const cfg = await res.json()
          if (cfg.botUsername) this.botUsername = cfg.botUsername
        }
      } catch {
        // fallback
      }

      await this.checkStatus()
    },

    async checkStatus() {
      if (this.isCheckingStatus) return this.linked
      this.isCheckingStatus = true
      try {
        const res = await fetch(`${REMINDER_API_BASE}/api/weather/link/status?code=${this.linkCode}`)
        if (res.ok) {
          const data = await res.json()
          this.linked = Boolean(data.linked)
          this.username = data.username ?? null
          if (data.botUsername) this.botUsername = data.botUsername

          if (this.linked) {
            localStorage.setItem(LINKED_USER_KEY, this.username || '')
            if (Array.isArray(data.subscriptions)) {
              this.subscriptions = data.subscriptions
              localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(this.subscriptions))
            }

            if (this.pendingProvinceId) {
              const pid = this.pendingProvinceId
              this.pendingProvinceId = null
              await this.subscribe(pid)
            }
          } else {
            localStorage.removeItem(LINKED_USER_KEY)
          }
        }
      } catch {
        // offline or worker unreachable
      } finally {
        this.isCheckingStatus = false
      }
      return this.linked
    },

    openSyncModal(provinceId = null) {
      this.pendingProvinceId = provinceId
      this.modalOpen = true
      this.checkStatus()
    },

    closeSyncModal() {
      this.modalOpen = false
      this.pendingProvinceId = null
    },

    async subscribe(provinceId) {
      if (!this.linked) {
        this.openSyncModal(provinceId)
        return false
      }

      this.loading = true
      try {
        const res = await fetch(`${REMINDER_API_BASE}/api/weather/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkCode: this.linkCode, provinceId }),
        })
        const data = await res.json()
        if (data.success && Array.isArray(data.subscriptions)) {
          this.subscriptions = data.subscriptions
          localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(this.subscriptions))
          return true
        }
      } catch (e) {
        console.error('Failed to subscribe to weather reminder:', e)
      } finally {
        this.loading = false
      }
      return false
    },

    async unsubscribe(provinceId) {
      if (!this.linked) return false

      this.loading = true
      try {
        const res = await fetch(`${REMINDER_API_BASE}/api/weather/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkCode: this.linkCode, provinceId }),
        })
        const data = await res.json()
        if (data.success && Array.isArray(data.subscriptions)) {
          this.subscriptions = data.subscriptions
          localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(this.subscriptions))
          return true
        }
      } catch (e) {
        console.error('Failed to unsubscribe from weather reminder:', e)
      } finally {
        this.loading = false
      }
      return false
    },

    async toggleSubscription(provinceId) {
      if (!this.linked) {
        this.openSyncModal(provinceId)
        return
      }

      if (this.isSubscribed(provinceId)) {
        await this.unsubscribe(provinceId)
      } else {
        await this.subscribe(provinceId)
      }
    },

    async unlink() {
      try {
        await fetch(`${REMINDER_API_BASE}/api/weather/unlink`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkCode: this.linkCode }),
        })
      } catch {
        // ignore
      }
      this.linked = false
      this.username = null
      this.subscriptions = []
      localStorage.removeItem(LINKED_USER_KEY)
      localStorage.removeItem(SUBSCRIPTIONS_KEY)
      this.linkCode = generateRandomCode()
      localStorage.setItem(LINK_CODE_KEY, this.linkCode)
    },
  },
})

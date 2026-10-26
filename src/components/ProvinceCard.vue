<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWeatherStore } from '../stores/weather.js'
import { useReminderStore } from '../stores/reminder.js'
import { CONDITION_COLORS, windDirLabel } from '../lib/weather.js'
import { fa, faTemp } from '../utils/format.js'

const props = defineProps({
  province: { type: Object, required: true },
  isFavorite: { type: Boolean, default: false },
})
const store = useWeatherStore()
const reminderStore = useReminderStore()
const router = useRouter()

const isSubscribed = computed(() => reminderStore.isSubscribed(props.province.id))

const s = computed(() => props.province.summary)
const accent = computed(() => {
  if (!s.value) return CONDITION_COLORS.cloudy
  if (s.value.temp >= 38) return CONDITION_COLORS.hot
  return CONDITION_COLORS[s.value.condition.code] || CONDITION_COLORS.cloudy
})

function openDetail() {
  store.setSearch('')
  router.push({ name: 'province', params: { id: props.province.id } })
}
</script>

<template>
  <article
    class="asset-card"
    role="link"
    tabindex="0"
    :style="{ '--accent': accent }"
    @click="openDetail"
    @keydown.enter="openDetail"
  >
    <div class="asset-card__head">
      <span class="asset-card__icon" aria-hidden="true">{{ s ? s.condition.icon : '⏳' }}</span>
      <div class="asset-card__title">
        <strong class="asset-card__label">{{ province.name }}</strong>
        <span class="asset-card__sub">مرکز: {{ province.capital }}</span>
      </div>
      <button
        type="button"
        class="asset-card__fav asset-card__bell"
        :class="{ 'is-active': isSubscribed }"
        :aria-pressed="isSubscribed"
        :title="isSubscribed ? 'لغو هشدار باران و برف' : 'اعلام یادآوری باران و برف در تلگرام'"
        @click.stop="reminderStore.toggleSubscription(province.id)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" :fill="isSubscribed ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>
      <button
        type="button"
        class="asset-card__fav"
        :class="{ 'is-active': isFavorite }"
        :aria-pressed="isFavorite"
        :title="isFavorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'"
        @click.stop="store.toggleFavorite(province.id)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8">
          <path d="m12 20-1.45-1.32C5.4 14 2 10.9 2 7.25A5.25 5.25 0 0 1 7.25 2 5.8 5.8 0 0 1 12 4.65 5.8 5.8 0 0 1 16.75 2 5.25 5.25 0 0 1 22 7.25c0 3.65-3.4 6.75-8.55 11.43L12 20Z" />
        </svg>
      </button>
    </div>

    <template v-if="s">
      <div class="asset-card__price-row">
        <bdi class="asset-card__temp">{{ faTemp(s.temp) }}</bdi>
        <span class="asset-card__cond">{{ s.condition.label }}</span>
      </div>

      <span class="asset-card__badge is-neutral">
        <span>دمای محسوس</span>
        <bdi>{{ faTemp(s.feels) }}</bdi>
      </span>

      <dl class="asset-card__range">
        <div>
          <dt>باد</dt>
          <dd><bdi>{{ fa(s.wind) }}</bdi> km/h</dd>
        </div>
        <div>
          <dt>رطوبت</dt>
          <dd><bdi>{{ fa(s.rh) }}٪</bdi></dd>
        </div>
        <div>
          <dt>فشار</dt>
          <dd><bdi>{{ fa(s.pressure) }}</bdi> hPa</dd>
        </div>
      </dl>

      <div class="asset-card__meta">
        <span>امروز: <bdi>{{ faTemp(s.min) }}</bdi> تا <bdi>{{ faTemp(s.max) }}</bdi></span>
        <span>باد از {{ windDirLabel(s.dir) }}</span>
      </div>
      <div class="asset-card__meta">
        <span>بارش ۲۴ ساعت: <bdi>{{ fa(s.precip24, 1) }}</bdi> mm</span>
        <span>ابر: <bdi>{{ fa(s.cloud) }}٪</bdi></span>
      </div>
      <div v-if="province.stale" class="asset-card__meta">
        <span class="asset-card__stale">این استان در آخرین دریافت بروز نشد</span>
      </div>
    </template>
    <div v-else class="asset-card__meta"><span>داده‌ای موجود نیست</span></div>
  </article>
</template>

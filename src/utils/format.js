const TZ = 'Asia/Tehran'

export const fa = (n, d = 0) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : Number(n).toLocaleString('fa-IR', { maximumFractionDigits: d })

export const faTemp = (n) => (n === null || n === undefined ? '—' : `${fa(Math.round(n))}°`)

const dtFull = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: TZ, year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const dtTime = new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const dtWeekdayShort = new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, weekday: 'short' })
const dtWeekday = new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, weekday: 'long' })
const dtDayMonth = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: TZ, month: 'long', day: 'numeric' })
const dtTooltip = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: TZ, weekday: 'short', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export const fmtDateTime = (ms) => (ms ? dtFull.format(ms) : '—')
export const fmtTime = (ms) => dtTime.format(ms)
export const fmtWeekdayShort = (ms) => dtWeekdayShort.format(ms)
export const fmtWeekday = (ms) => dtWeekday.format(ms)
export const fmtDayMonth = (ms) => dtDayMonth.format(ms)
export const fmtTooltip = (ms) => dtTooltip.format(ms)

export function relativeFa(ms, now = Date.now()) {
  if (!ms) return '—'
  const sec = Math.max(0, Math.round((now - ms) / 1000))
  if (sec < 60) return 'چند لحظه پیش'
  const min = Math.round(sec / 60)
  if (min < 60) return `${fa(min)} دقیقه پیش`
  const h = Math.round(min / 60)
  if (h < 24) return `${fa(h)} ساعت پیش`
  return `${fa(Math.round(h / 24))} روز پیش`
}

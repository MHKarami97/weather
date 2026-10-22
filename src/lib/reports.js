/**
 * گزارش‌های کاربردی: از داده‌ی ساعتی/روزانه/کیفیت هوا، توصیه‌های عملی تولید می‌کند.
 * سطح هر گزارش: good | info | warn | danger
 */
import { pickCurrent, stepHours, sunTimes, windDirLabel } from './weather.js'

export const AQI_LEVELS = [
  { max: 50, label: 'پاک', color: '#22c55e', advice: 'هوا پاک است؛ فعالیت در فضای باز بدون محدودیت.' },
  { max: 100, label: 'قابل قبول', color: '#eab308', advice: 'افراد بسیار حساس فعالیت سنگین بیرون را کاهش دهند.' },
  { max: 150, label: 'ناسالم برای گروه‌های حساس', color: '#f97316', advice: 'کودکان، سالمندان و بیماران قلبی/تنفسی از فعالیت طولانی بیرون پرهیز کنند.' },
  { max: 200, label: 'ناسالم', color: '#ef4444', advice: 'همه از فعالیت سنگین در فضای باز بپرهیزند؛ استفاده از ماسک N95 توصیه می‌شود.' },
  { max: 300, label: 'بسیار ناسالم', color: '#a855f7', advice: 'تا حد امکان در محیط بسته بمانید و پنجره‌ها را ببندید.' },
  { max: 1000, label: 'خطرناک', color: '#7f1d1d', advice: 'شرایط اضطراری؛ از خروج غیرضروری خودداری کنید.' },
]
export const aqiLevel = (v) => (v == null ? null : AQI_LEVELS.find((l) => v <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1])

const fa = (n, d = 0) => Number(n).toLocaleString('fa-IR', { maximumFractionDigits: d })
const hourLabel = (ms) =>
  new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms)
const dayLabel = (ms) => new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', weekday: 'long' }).format(ms)

export function buildReports({ rows, daily, air, lat, lon }, now = Date.now()) {
  const reports = []
  if (!rows || !rows.length) return reports
  const stepH = stepHours(rows)
  const cur = pickCurrent(rows, now)
  const next24 = rows.filter((r) => r.t >= now - 1.5 * 3600000 && r.t <= now + 24 * 3600000)
  const next48 = rows.filter((r) => r.t >= now - 1.5 * 3600000 && r.t <= now + 48 * 3600000)
  if (!next24.length) return reports
  const add = (level, icon, title, text) => reports.push({ level, icon, title, text })

  const min24 = Math.min(...next24.map((r) => r.temp))
  const feels = cur.feels ?? cur.temp

  let cloth
  if (feels <= 0) cloth = 'لباس گرم و چندلایه، کلاه و دستکش لازم است.'
  else if (feels <= 10) cloth = 'کاپشن یا پالتوی گرم بپوشید.'
  else if (feels <= 18) cloth = 'ژاکت یا لباس لایه‌ای مناسب است.'
  else if (feels <= 27) cloth = 'لباس سبک و راحت مناسب است.'
  else if (feels <= 35) cloth = 'لباس نخی و روشن بپوشید و مایعات کافی بنوشید.'
  else cloth = 'لباس بسیار سبک و روشن، کلاه آفتابی و مصرف فراوان آب ضروری است.'
  add('info', '👕', 'پیشنهاد پوشش', `دمای محسوس اکنون ${fa(feels)}° است. ${cloth}`)

  const wet = next24.filter((r) => (r.precip ?? 0) / stepH >= 0.1)
  const total24 = next24.reduce((a, r) => a + (r.precip ?? 0), 0)
  if (wet.length) {
    const heavy = total24 >= 20
    const snowy = wet.some((r) => (r.snow ?? 0) > 0.5 * (r.precip || 1) || r.temp <= 0.5)
    add(
      heavy ? 'danger' : 'warn',
      snowy ? '🌨️' : '☔',
      snowy ? 'احتمال بارش برف' : heavy ? 'بارش قابل‌توجه در راه است' : 'همراه داشتن چتر',
      `بارش حدود ساعت ${hourLabel(wet[0].t)} آغاز می‌شود؛ مجموع ۲۴ ساعت آینده حدود ${fa(total24, 1)} میلی‌متر.` +
        (heavy ? ' احتمال آبگرفتگی معابر و لغزندگی جاده وجود دارد.' : ''),
    )
  } else {
    add('good', '🌂', 'بدون بارش مهم', 'در ۲۴ ساعت آینده بارش قابل‌توجهی پیش‌بینی نشده است.')
  }

  if (next48.some((r) => (r.cape ?? 0) > 1000 && (r.precip ?? 0) > 0.3)) {
    add('warn', '⛈️', 'احتمال رعد و برق', 'ناپایداری جوی بالاست؛ از حضور در ارتفاعات و زیر درختان منفرد خودداری کنید.')
  }

  const gustMax = Math.max(...next24.map((r) => r.gust ?? 0))
  const windiest = next24.reduce((b, r) => ((r.wind ?? 0) > (b.wind ?? 0) ? r : b), next24[0])
  if (gustMax >= 70) add('danger', '🌪️', 'هشدار باد شدید', `تندباد تا ${fa(gustMax)} کیلومتر بر ساعت؛ از پرواز پهپاد، استقرار سازه‌های سبک و حرکت در جاده‌های باز بپرهیزید.`)
  else if (gustMax >= 45) add('warn', '💨', 'وزش باد نسبتاً شدید', `بیشینه‌ی تندباد ${fa(gustMax)} کیلومتر بر ساعت از سمت ${windDirLabel(windiest.dir)}؛ اشیای سبک را ایمن کنید.`)
  else add('good', '🍃', 'باد آرام', `بیشینه‌ی تندباد در ۲۴ ساعت آینده ${fa(gustMax)} کیلومتر بر ساعت است.`)

  const heatIdx = Math.max(...next24.map((r) => r.feels ?? r.temp))
  if (heatIdx >= 40) add('danger', '🥵', 'هشدار گرمای شدید', `دمای محسوس تا ${fa(heatIdx)}°؛ از فعالیت بیرون در ساعات ظهر بپرهیزید و مراقب سالمندان و کودکان باشید.`)
  else if (heatIdx >= 34) add('warn', '☀️', 'گرمای زیاد', `دمای محسوس تا ${fa(heatIdx)}° می‌رسد؛ آب کافی بنوشید و ساعات ۱۲ تا ۱۶ را در سایه بمانید.`)
  if (min24 <= -10) add('danger', '🥶', 'سرمای شدید', `کمینه‌ی دما ${fa(min24)}° است؛ خطر سرمازدگی و ترکیدن لوله‌های آب.`)
  else if (min24 <= 0) add('warn', '🧊', 'احتمال یخبندان', `دما تا ${fa(min24)}° افت می‌کند؛ لوله‌های بیرونی و گیاهان حساس را محافظت کنید و در جاده مراقب لغزندگی باشید.`)

  const fogRisk = next24.filter((r) => (r.rh ?? 0) >= 94 && r.dew != null && r.temp - r.dew <= 1.5 && (r.wind ?? 0) < 10 && (r.precip ?? 0) < 0.1)
  if (fogRisk.length) add('warn', '🌫️', 'احتمال مه‌گرفتگی', `حدود ساعت ${hourLabel(fogRisk[0].t)} شرایط تشکیل مه فراهم است؛ در رانندگی از چراغ مه‌شکن و فاصله‌ی ایمن استفاده کنید.`)

  const goodHours = next24.filter((r) => r.t > now - 1800000 && (r.feels ?? r.temp) >= 14 && (r.feels ?? r.temp) <= 29 && (r.precip ?? 0) / stepH < 0.1 && (r.wind ?? 0) < 25)
  if (goodHours.length) {
    add('good', '🚶', 'بهترین زمان برای فعالیت بیرون', `${hourLabel(goodHours[0].t)} تا ${hourLabel(goodHours[goodHours.length - 1].t)} - دمای مطبوع، بدون بارش و باد ملایم.`)
  } else {
    add('info', '🏠', 'شرایط بیرون', 'در ۲۴ ساعت آینده بازه‌ی کاملاً مطبوعی برای فعالیت در فضای باز دیده نمی‌شود.')
  }

  const dryScore =
    next24.reduce((a, r) => a + ((100 - (r.rh ?? 50)) / 100) * (1 + (r.wind ?? 0) / 20) * ((r.precip ?? 0) > 0.1 ? 0 : 1), 0) / next24.length
  add(dryScore > 0.55 ? 'good' : 'info', '👚', 'خشک‌شدن لباس', dryScore > 0.55 ? 'هوا خشک و مناسب برای آویختن لباس در فضای باز است.' : 'رطوبت یا بارش خشک‌شدن لباس را کند می‌کند.')

  const p0 = rows.find((r) => r.t >= now - 1.5 * 3600000)?.pressure
  const p12 = rows.find((r) => r.t >= now + 11 * 3600000)?.pressure
  if (p0 && p12) {
    const dp = p12 - p0
    if (dp <= -4) add('warn', '📉', 'افت سریع فشار هوا', `فشار در ۱۲ ساعت آینده حدود ${fa(Math.abs(dp))} هکتوپاسکال کاهش می‌یابد؛ نشانه‌ی ورود سامانه‌ی بارشی یا ناپایداری.`)
    else if (dp >= 4) add('info', '📈', 'افزایش فشار هوا', `فشار حدود ${fa(dp)} هکتوپاسکال بالا می‌رود؛ معمولاً نشانه‌ی بهبود و آسمان صاف‌تر است.`)
  }

  const sun = sunTimes(lat, lon, now)
  if (sun.sunrise && sun.sunset) add('info', '🌅', 'طلوع و غروب امروز', `طلوع ${hourLabel(sun.sunrise)} - غروب ${hourLabel(sun.sunset)} (به وقت ایران)`)

  const hdd = next24.reduce((a, r) => a + Math.max(0, 18 - r.temp) * stepH, 0) / 24
  const cdd = next24.reduce((a, r) => a + Math.max(0, r.temp - 24) * stepH, 0) / 24
  if (hdd > 6) add('info', '🔥', 'نیاز گرمایشی', `نیاز به گرمایش بالاست (شاخص روز-درجه‌ی گرمایشی ${fa(hdd, 1)}).`)
  else if (cdd > 6) add('info', '❄️', 'نیاز سرمایشی', `نیاز به سرمایش بالاست (شاخص روز-درجه‌ی سرمایشی ${fa(cdd, 1)}).`)

  if (air && air.length) {
    const nowAir = pickCurrent(air, now)
    const peak = Math.max(0, ...air.filter((a) => a.t >= now && a.t <= now + 24 * 3600000).map((a) => a.aqi ?? 0))
    const lvl = aqiLevel(nowAir?.aqi)
    if (lvl) {
      const level = nowAir.aqi <= 50 ? 'good' : nowAir.aqi <= 100 ? 'info' : nowAir.aqi <= 200 ? 'warn' : 'danger'
      add(level, '😷', `کیفیت هوا: ${lvl.label}`, `شاخص AQI حدود ${fa(nowAir.aqi)}؛ اوج ۲۴ ساعت آینده ${fa(peak)}. ${lvl.advice}`)
    }
    const dustPeak = Math.max(0, ...air.filter((a) => a.t >= now && a.t <= now + 48 * 3600000).map((a) => a.dust ?? 0))
    if (dustPeak >= 150) add('warn', '🏜️', 'احتمال گردوخاک', `غلظت گردوخاک تا ${fa(dustPeak)} میکروگرم بر مترمکعب می‌رسد؛ برای بیماران تنفسی و آلرژیک خطرناک است.`)
  }

  if (daily && daily.length > 1) {
    const upcoming = daily.filter((d) => d.t > now - 12 * 3600000).slice(0, 7)
    if (upcoming.length > 1) {
      const rainy = upcoming.filter((d) => d.precip >= 1)
      if (rainy.length) add('info', '🗓️', 'روزهای بارانی هفته', rainy.map((d) => `${dayLabel(d.t)} (${fa(d.precip, 1)} میلی‌متر)`).join('، '))
      const hottest = upcoming.reduce((b, d) => (d.max > b.max ? d : b), upcoming[0])
      const coldest = upcoming.reduce((b, d) => (d.min < b.min ? d : b), upcoming[0])
      add('info', '🌡️', 'گرم‌ترین و سردترین روز', `گرم‌ترین: ${dayLabel(hottest.t)} با ${fa(hottest.max)}° - سردترین: ${dayLabel(coldest.t)} با ${fa(coldest.min)}°`)
    }
  }

  const order = { danger: 0, warn: 1, good: 2, info: 3 }
  return reports.sort((a, b) => order[a.level] - order[b.level])
}

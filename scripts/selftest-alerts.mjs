import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  AlertsReport,
  isValidAlertEntry,
  MIN_ALERT_PRECIP_MM,
  MIN_ALERT_SNOW_PRECIP_MM,
  SIGNIFICANT_ALERT_PRECIP_MM,
} from '../src/lib/alerts.js'
import { AlertsBuilder } from './build-alerts.mjs'

// ۱. بررسی تابع اعتبارسنجی ورودی هشدار
assert.equal(isValidAlertEntry(null), false, 'null is invalid')
assert.equal(isValidAlertEntry({ precip: 0.1, code: 'drizzle' }), false, '0.1mm drizzle is invalid')
assert.equal(isValidAlertEntry({ precip: 0.2, code: 'rain' }), false, '0.2mm rain is invalid')
assert.equal(isValidAlertEntry({ precip: 1.4, code: 'rain' }), false, '1.4mm rain is below threshold')
assert.equal(isValidAlertEntry({ precip: 1.5, code: 'rain' }), true, '1.5mm rain is valid')
assert.equal(isValidAlertEntry({ precip: 0.5, code: 'snow' }), false, '0.5mm snow is below snow threshold')
assert.equal(isValidAlertEntry({ precip: 1.0, code: 'snow' }), true, '1.0mm snow is valid')

// ۲. بررسی منطق فیلترینگ و گروه‌بندی AlertsReport
const testNow = new Date('2026-11-18T10:00:00Z')
const mockPayload = {
  sources: {
    'open-meteo': 'Open Meteo',
    'met-no': 'MET Norway',
    openweather: 'Open Weather',
    weatherapi: 'Weather Api',
  },
  provinces: {
    // استان اول: دارای پیش‌بینی ضعیف و نویز (زیر آستانه) -> نباید هشداری تولید کند
    qom: {
      '2026-11-18': [
        { source: 'open-meteo', code: 'drizzle', label: 'نم‌نم باران', precip: 0.2 },
        { source: 'weatherapi', code: 'rain', label: 'باران خفیف', precip: 0.4 },
      ],
    },
    // استان دوم: فقط ۱ منبع با بارش ضعیف مرزی (زیر ۲٫۵ میلی‌متر در حضور ۴ منبع) -> باید فیلتر شود
    isfahan: {
      '2026-11-18': [
        { source: 'open-meteo', code: 'rain', label: 'باران خفیف', precip: 1.6 },
      ],
    },
    // استان سوم: ۱ منبع با بارش قابل توجه و شدید (۳٫۵ میلی‌متر) -> باید حفظ شود
    shiraz: {
      '2026-11-18': [
        { source: 'open-meteo', code: 'heavy-rain', label: 'باران شدید', precip: 3.5, startT: 1795000000000 },
      ],
    },
    // استان چهارم: اجماع دو منبع با بارش مؤثر -> باید حفظ شود
    tehran: {
      '2026-11-18': [
        { source: 'open-meteo', code: 'rain', label: 'باران', precip: 2.2, startT: 1795000000000 },
        { source: 'met-no', code: 'rain', label: 'باران', precip: 5.5, startT: 1795003600000 },
      ],
      '2026-11-19': [
        { source: 'openweather', code: 'snow', label: 'برف', precip: 3.2, startT: 1795080000000 },
        { source: 'met-no', code: 'snow', label: 'برف', precip: 4.0, startT: 1795083600000 },
      ],
    },
  },
}

const report = new AlertsReport(mockPayload, testNow).build(['tehran'])

// استان قم و اصفهان باید کاملاً حذف شده باشند
assert.equal(report.some((item) => item.provinceId === 'qom'), false, 'Qom weak noise must be pruned')
assert.equal(report.some((item) => item.provinceId === 'isfahan'), false, 'Isfahan single weak source must be pruned')

// شیراز باید به دلیل بارش قابل توجه حفظ شده باشد
const shiraz = report.find((item) => item.provinceId === 'shiraz')
assert.ok(shiraz, 'Shiraz should be present')
assert.equal(shiraz.today?.maxPrecip, 3.5, 'Shiraz maxPrecip')

// تهران باید اولین آیتم باشد (چون favorite است)
assert.equal(report[0].provinceId, 'tehran', 'Tehran should be first (favorite)')
assert.ok(report[0].today, 'Tehran should have today alert')
assert.equal(report[0].today.kind, 'rain', 'Tehran today kind is rain')
assert.equal(report[0].today.intensity, 'moderate', 'Tehran today intensity is moderate (5.5mm)')
assert.equal(report[0].today.maxPrecip, 5.5, 'Tehran today maxPrecip is 5.5')
assert.equal(report[0].today.sourceCount, 2, 'Tehran today has 2 sources')

// روز دوم تهران (برف)
assert.equal(report[0].otherDays.length, 1, 'Tehran should have 1 other day')
assert.equal(report[0].otherDays[0].kind, 'snow', 'Tehran tomorrow is snow')
assert.equal(report[0].otherDays[0].intensityLabel, 'برف متوسط', 'Tehran tomorrow intensityLabel is برف متوسط')

// ۳. تست AlertsBuilder روی فایل‌های شبیه‌سازی‌شده
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'weather-alerts-test-'))
try {
  const windyProvDir = path.join(tempDir, 'provinces')
  const openMeteoProvDir = path.join(tempDir, 'sources', 'open-meteo', 'provinces')
  await mkdir(windyProvDir, { recursive: true })
  await mkdir(openMeteoProvDir, { recursive: true })

  // سند اول: تهران در ویندی با بارش ناچیز ۰٫۲ میلی‌متر نم‌نم
  await writeFile(
    path.join(windyProvDir, 'tehran.json'),
    JSON.stringify({
      id: 'tehran',
      fetchedAtMs: testNow.getTime(),
      daily: [{ key: '2026-11-18', condition: { code: 'drizzle', label: 'نم‌نم باران' }, precip: 0.2 }],
      hourly: [{ t: testNow.getTime(), precip: 0.05 }],
    }),
  )

  // سند دوم: تهران در اوپن‌متیو با بارش ۲٫۸ میلی‌متر
  await writeFile(
    path.join(openMeteoProvDir, 'tehran.json'),
    JSON.stringify({
      id: 'tehran',
      fetchedAtMs: testNow.getTime(),
      daily: [{ key: '2026-11-18', condition: { code: 'rain', label: 'باران' }, precip: 2.8 }],
      hourly: [
        { t: testNow.getTime() + 3600000, precip: 0.8 },
        { t: testNow.getTime() + 7200000, precip: 2.0 },
      ],
    }),
  )

  const builder = new AlertsBuilder(tempDir, testNow.getTime())
  const built = await builder.build()

  assert.ok(built.provinces.tehran, 'Tehran should exist in built alerts')
  const tehranDay = built.provinces.tehran['2026-11-18']
  assert.ok(Array.isArray(tehranDay), 'Tehran alert day should exist')
  // ورودی ۰٫۲ میلی‌متری ویندی باید حذف شده و فقط ورودی ۲٫۸ میلی‌متری اوپن‌متیو باقی مانده باشد
  assert.equal(tehranDay.length, 1, 'Only open-meteo should qualify (windy 0.2mm must be skipped)')
  assert.equal(tehranDay[0].source, 'open-meteo')
  assert.equal(tehranDay[0].precip, 2.8)
} finally {
  await rm(tempDir, { recursive: true, force: true })
}

console.log('OK alerts test passed successfully!')

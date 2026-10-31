# منابع داده

| منبع | کلید | Secret در GitHub | بازه‌ی اجرا | سهمیه‌ی رایگان (طبق منابع ثانویه، قبل از استفاده راستی‌آزمایی کنید) |
|---|---|---|---|---|
| Windy (GFS) | دارد | `WINDY_API_KEY` | ۱ ساعت | طبق پلن Windy |
| Open-Meteo | ندارد | - | ۱ ساعت (یک درخواست برای هر ۳۱ استان) | غیرتجاری، بدون کلید |
| MET Norway | ندارد | `MET_USER_AGENT` اختیاری (در workflow مقدار پیش‌فرض دارد) | ۱ ساعت | User-Agent یکتا اجباری است |
| OpenWeather | دارد | `OPENWEATHER_API_KEY` | ۱ ساعت | endpoint ‏`/data/2.5/forecast` |
| WeatherAPI | دارد | `WEATHERAPI_KEY` | ۱ ساعت | پلن رایگان: پیش‌بینی ۳ روزه؛ مقدار `WEATHERAPI_DAYS` را با پلن خود تنظیم کنید |
| Pirate Weather | دارد | `PIRATE_WEATHER_API_KEY` | ۲ ساعت | ۲۰٬۰۰۰ درخواست در ماه |
| Tomorrow.io | دارد | `TOMORROW_API_KEY` | ۱ ساعت، ۲۰ استان در هر اجرا (چرخشی، چرخه‌ی کامل ۲ ساعت) | ۵۰۰ درخواست در روز و ۲۵ در ساعت |

## دریافت کلید
1. OpenWeather: openweathermap.org → API keys
2. WeatherAPI: weatherapi.com → Dashboard
3. Pirate Weather: pirateweather.net → ثبت‌نام و دریافت کلید
4. Tomorrow.io: tomorrow.io → Development → API Keys

هر کلید را در GitHub: Settings → Secrets and variables → Actions → New repository secret با نام جدول بالا بسازید.

## آزمایش محلی
```bash
npm run test:sources                                  # بدون اینترنت، با پاسخ‌های ساختگی
OUT_DIR=public/data FORCE=1 SOURCES=open-meteo npm run fetch-sources
OUT_DIR=public/data npm run build-manifest
```

## ساختار خروجی (شاخه‌ی data)
```
latest.json, provinces/<id>.json        ← Windy (بدون تغییر)
sources.json                            ← فهرست منابعِ دارای داده + زمان بروزرسانی
sources/<sourceId>/latest.json
sources/<sourceId>/provinces/<id>.json
```

/**
 * پیکربندی منبع داده.
 * داده‌ها هر ساعت توسط GitHub Action در شاخه‌ی `data` همین ریپازیتوری ذخیره می‌شوند و مرورگر
 * آن‌ها را از raw.githubusercontent.com می‌خواند (بدون نیاز به build مجدد سایت).
 *
 * مقدار GITHUB_REPO را به «نام‌کاربری/نام‌ریپو» تغییر دهید (در GitHub Actions به‌صورت خودکار
 * از VITE_GITHUB_REPO پر می‌شود).
 */
export const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || 'YOUR_GITHUB_USERNAME/weather'
export const DATA_BRANCH = import.meta.env.VITE_DATA_BRANCH || 'data'

const isPlaceholder = GITHUB_REPO.startsWith('YOUR_GITHUB_USERNAME')

export const DATA_SOURCES = [
  import.meta.env.VITE_DATA_BASE || null,
  isPlaceholder ? null : `https://raw.githubusercontent.com/${GITHUB_REPO}/${DATA_BRANCH}/`,
  `${import.meta.env.BASE_URL}data/`, // پشتیبان هم‌دامنه (برای توسعه‌ی محلی: public/data)
].filter(Boolean)

// داده هر ۱ ساعت ساخته می‌شود؛ مرورگر هر ۵ دقیقه وجود نسخه‌ی جدید را بررسی می‌کند.
export const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export const REMINDER_API_BASE =
  import.meta.env.VITE_REMINDER_API_BASE || 'https://task-reminders.mhkarami97.workers.dev'

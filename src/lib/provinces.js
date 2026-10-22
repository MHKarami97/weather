/** فهرست ۳۱ استان ایران با مختصات مرکز استان (استفاده در اسکریپت Node و فرانت‌اند). */
export const PROVINCES = [
  { id: 'alborz', name: 'البرز', capital: 'کرج', lat: 35.84, lon: 50.94 },
  { id: 'ardabil', name: 'اردبیل', capital: 'اردبیل', lat: 38.25, lon: 48.3 },
  { id: 'east-azerbaijan', name: 'آذربایجان شرقی', capital: 'تبریز', lat: 38.08, lon: 46.29 },
  { id: 'west-azerbaijan', name: 'آذربایجان غربی', capital: 'ارومیه', lat: 37.55, lon: 45.08 },
  { id: 'bushehr', name: 'بوشهر', capital: 'بوشهر', lat: 28.92, lon: 50.84 },
  { id: 'chaharmahal', name: 'چهارمحال و بختیاری', capital: 'شهرکرد', lat: 32.33, lon: 50.86 },
  { id: 'fars', name: 'فارس', capital: 'شیراز', lat: 29.59, lon: 52.58 },
  { id: 'gilan', name: 'گیلان', capital: 'رشت', lat: 37.28, lon: 49.58 },
  { id: 'golestan', name: 'گلستان', capital: 'گرگان', lat: 36.84, lon: 54.43 },
  { id: 'hamadan', name: 'همدان', capital: 'همدان', lat: 34.8, lon: 48.51 },
  { id: 'hormozgan', name: 'هرمزگان', capital: 'بندرعباس', lat: 27.18, lon: 56.27 },
  { id: 'ilam', name: 'ایلام', capital: 'ایلام', lat: 33.64, lon: 46.42 },
  { id: 'isfahan', name: 'اصفهان', capital: 'اصفهان', lat: 32.65, lon: 51.67 },
  { id: 'kerman', name: 'کرمان', capital: 'کرمان', lat: 30.28, lon: 57.08 },
  { id: 'kermanshah', name: 'کرمانشاه', capital: 'کرمانشاه', lat: 34.31, lon: 47.07 },
  { id: 'north-khorasan', name: 'خراسان شمالی', capital: 'بجنورد', lat: 37.47, lon: 57.33 },
  { id: 'razavi-khorasan', name: 'خراسان رضوی', capital: 'مشهد', lat: 36.3, lon: 59.61 },
  { id: 'south-khorasan', name: 'خراسان جنوبی', capital: 'بیرجند', lat: 32.87, lon: 59.22 },
  { id: 'khuzestan', name: 'خوزستان', capital: 'اهواز', lat: 31.32, lon: 48.67 },
  { id: 'kohgiluyeh', name: 'کهگیلویه و بویراحمد', capital: 'یاسوج', lat: 30.67, lon: 51.59 },
  { id: 'kurdistan', name: 'کردستان', capital: 'سنندج', lat: 35.31, lon: 46.99 },
  { id: 'lorestan', name: 'لرستان', capital: 'خرم‌آباد', lat: 33.49, lon: 48.35 },
  { id: 'markazi', name: 'مرکزی', capital: 'اراک', lat: 34.09, lon: 49.69 },
  { id: 'mazandaran', name: 'مازندران', capital: 'ساری', lat: 36.56, lon: 53.06 },
  { id: 'qazvin', name: 'قزوین', capital: 'قزوین', lat: 36.27, lon: 50.0 },
  { id: 'qom', name: 'قم', capital: 'قم', lat: 34.64, lon: 50.88 },
  { id: 'semnan', name: 'سمنان', capital: 'سمنان', lat: 35.58, lon: 53.39 },
  { id: 'sistan-baluchestan', name: 'سیستان و بلوچستان', capital: 'زاهدان', lat: 29.5, lon: 60.86 },
  { id: 'tehran', name: 'تهران', capital: 'تهران', lat: 35.69, lon: 51.39 },
  { id: 'yazd', name: 'یزد', capital: 'یزد', lat: 31.9, lon: 54.37 },
  { id: 'zanjan', name: 'زنجان', capital: 'زنجان', lat: 36.68, lon: 48.48 },
]

/** علاقه‌مندی‌های پیش‌فرض: تهران، کرج (البرز)، مشهد (خراسان رضوی)، اصفهان */
export const DEFAULT_FAVORITES = ['tehran', 'alborz', 'razavi-khorasan', 'isfahan']

export const PROVINCE_BY_ID = Object.fromEntries(PROVINCES.map((p) => [p.id, p]))

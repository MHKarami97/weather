/** فهرست ۳۱ استان ایران با مختصات مرکز استان (استفاده در اسکریپت Node و فرانت‌اند). */
export const PROVINCES = [
  { id: 'east-azerbaijan', name: 'آذربایجان شرقی', capital: 'تبریز', lat: 38.0524675, lon: 46.2849927 },
  { id: 'west-azerbaijan', name: 'آذربایجان غربی', capital: 'ارومیه', lat: 37.5296071, lon: 45.0465487 },
  { id: 'ardabil', name: 'اردبیل', capital: 'اردبیل', lat: 38.246471, lon: 48.295052 },
  { id: 'isfahan', name: 'اصفهان', capital: 'اصفهان', lat: 32.65139, lon: 51.679192 },
  { id: 'alborz', name: 'البرز', capital: 'کرج', lat: 35.821433, lon: 50.962486 },
  { id: 'ilam', name: 'ایلام', capital: 'ایلام', lat: 33.638531, lon: 46.422649 },
  { id: 'bushehr', name: 'بوشهر', capital: 'بوشهر', lat: 28.922041, lon: 50.833092 },
  { id: 'tehran', name: 'تهران', capital: 'تهران', lat: 35.699731, lon: 51.33805 },
  { id: 'chaharmahal', name: 'چهارمحال و بختیاری', capital: 'شهرکرد', lat: 32.3555942, lon: 50.8274267 },
  { id: 'khuzestan', name: 'خوزستان', capital: 'اهواز', lat: 31.5317162, lon: 49.8803281 },
  { id: 'south-khorasan', name: 'خراسان جنوبی', capital: 'بیرجند', lat: 32.8462159, lon: 59.2911422 },
  { id: 'razavi-khorasan', name: 'خراسان رضوی', capital: 'مشهد', lat: 36.3, lon: 59.6 },
  { id: 'north-khorasan', name: 'خراسان شمالی', capital: 'بجنورد', lat: 37.4524383, lon: 57.3235177 },
  { id: 'zanjan', name: 'زنجان', capital: 'زنجان', lat: 36.67094, lon: 48.485111 },
  { id: 'semnan', name: 'سمنان', capital: 'سمنان', lat: 35.572269, lon: 53.396049 },
  { id: 'sistan-baluchestan', name: 'سیستان و بلوچستان', capital: 'زاهدان', lat: 29.4545786, lon: 60.853647 },
  { id: 'fars', name: 'فارس', capital: 'شیراز', lat: 29.6496884, lon: 52.5088696 },
  { id: 'qazvin', name: 'قزوین', capital: 'قزوین', lat: 36.266819, lon: 50.003811 },
  { id: 'qom', name: 'قم', capital: 'قم', lat: 34.643711, lon: 50.89064 },
  { id: 'kurdistan', name: 'کردستان', capital: 'سنندج', lat: 35.3029422, lon: 47.0026312 },
  { id: 'kerman', name: 'کرمان', capital: 'کرمان', lat: 30.28027, lon: 57.06702 },
  { id: 'kermanshah', name: 'کرمانشاه', capital: 'کرمانشاه', lat: 34.346481, lon: 46.420559 },
  { id: 'kohgiluyeh', name: 'کهگیلویه و بویراحمد', capital: 'یاسوج', lat: 30.657075, lon: 51.600294 },
  { id: 'golestan', name: 'گلستان', capital: 'گرگان', lat: 36.8633914, lon: 54.4485782 },
  { id: 'gilan', name: 'گیلان', capital: 'رشت', lat: 37.223431, lon: 49.6355091 },
  { id: 'lorestan', name: 'لرستان', capital: 'خرم‌آباد', lat: 33.4666667, lon: 48.35 },
  { id: 'mazandaran', name: 'مازندران', capital: 'ساری', lat: 36.5658333, lon: 53.0597222 },
  { id: 'markazi', name: 'مرکزی', capital: 'اراک', lat: 34.0800112, lon: 49.6772334 },
  { id: 'hormozgan', name: 'هرمزگان', capital: 'بندرعباس', lat: 27.1833333, lon: 56.2666667 },
  { id: 'hamadan', name: 'همدان', capital: 'همدان', lat: 34.8065, lon: 48.5162472 },
  { id: 'yazd', name: 'یزد', capital: 'یزد', lat: 31.89661, lon: 54.36068 },
]

export const DEFAULT_FAVORITES = ['tehran', 'alborz', 'east-azerbaijan', 'isfahan']

export const PROVINCE_BY_ID = Object.fromEntries(PROVINCES.map((p) => [p.id, p]))

/* TIDHAR — Direction 2 · icônes, textes, et le SENS de chaque fenêtre.
 * Une seule famille d'icônes, un seul trait (1.7). Le Temple est la seule icône pleine. */
(function (root) {
  'use strict';
  var IC = {
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', list: '<path d="M8.5 7H19M8.5 12H19M8.5 17H19M5 7h.01M5 12h.01M5 17h.01"/>',
    cal: '<rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>', bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14zM10 20.5a2 2 0 0 0 4 0"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1-3.5 4-5 7-5s6 1.5 7 5"/>', compass: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2l-1.6 4-4 1.6 1.6-4z"/>',
    pin: '<path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>', plus: '<path d="M12 5v14M5 12h14"/>', gift: '<path d="M4.5 11.5h15V20h-15zM3.5 7.5h17v4h-17zM12 7.5V20M12 7.5c-1.200-3.300-5.200-3.600-5.200-1.500 0 1.500 2.600 1.500 5.200 1.500zm0 0c1.200-3.300 5.200-3.600 5.200-1.500 0 1.500-2.600 1.500-5.200 1.500z"/>', flame: '<path d="M12 3.200c1.300 1.700 2.100 2.700 2.100 3.900a2.100 2.100 0 01-4.200 0c0-1.200.8-2.200 2.100-3.900zM9.500 11.500h5V20.500h-5zM7 20.500h10"/>', chev: '<path d="M9 5l7 7-7 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18"/>',
    sunrise: '<path d="M3.5 18h17M7 18a5 5 0 0 1 10 0M12 9.5v-5M9.5 7L12 4.5 14.5 7M4.8 13.2l1.5 1M19.2 13.2l-1.5 1"/>',
    sunset: '<path d="M3.5 18h17M7 18a5 5 0 0 1 10 0M12 4.5v5M9.5 7L12 9.5 14.5 7M4.8 13.2l1.5 1M19.2 13.2l-1.5 1"/>',
    dawn: '<path d="M3.5 17h17M6.5 20.5h11M8 17a4 4 0 0 1 8 0M12 8v2M6 10.8l1.4 1.4M18 10.8l-1.4 1.4"/>',
    sunlow: '<path d="M3.5 15.5h17M8 15.5a4 4 0 0 1 8 0M7 19h10M10 22h4M12 6.5v2M6 9.3l1.4 1.4M18 9.3l-1.4 1.4"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
    night: '<path d="M17.5 15.5A7 7 0 0 1 8.5 6.5a7 7 0 1 0 9 9z"/><path d="M17 3.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/>',
    scroll: '<path d="M7.5 5.5h10a2 2 0 0 1 0 4H17v7a2.5 2.5 0 0 1-2.5 2.5H6.5a2 2 0 0 1 0-4h1zM10.5 9.5h4M10.5 12.5h4"/>',
    book: '<path d="M12 6.5c-2-1.3-4.5-1.5-7.5-1v12c3-.5 5.5-.3 7.5 1 2-1.3 4.5-1.5 7.5-1v-12c-3-.5-5.5-.3-7.5 1zM12 6.5v12"/>',
    candles: '<path d="M8 11.5v8M16 11.5v8M5 19.5h14M8 4.5c1.2 1.4 1.7 2.4 1.7 3.2a1.7 1.7 0 0 1-3.4 0c0-.8.5-1.8 1.7-3.2zM16 4.5c1.2 1.4 1.7 2.4 1.7 3.2a1.7 1.7 0 0 1-3.4 0c0-.8.5-1.8 1.7-3.2z"/>',
    havdala: '<path d="M12 10v9.5M9 19.5h6M10.2 12.5l3.6 2M10.2 15.5l3.6 2M12 3c1.6 1.8 2.2 3 2.2 4a2.2 2.2 0 0 1-4.4 0c0-1 .6-2.2 2.2-4z"/>',
    bolt: '<path d="M13 3.5L6.5 13H11l-1 7.5L17.5 11H13z"/>', cup: '<path d="M5.5 9h10v4.5a5 5 0 0 1-10 0zM15.5 10.5H17a2 2 0 0 1 0 4h-1.7M8 4.5v2M11.5 4.5v2M5 20h11"/>',
    bed: '<path d="M4 18.5V7M4 15.5h16v3M4 12.5h9.5a3 3 0 0 1 3 3"/><circle cx="7.6" cy="9.8" r="1.4"/>', wind: '<path d="M4 9h9.5a2.5 2.5 0 1 0-2.4-3.2M4 13h13.5a2.5 2.5 0 1 1-2.4 3.2M4 17h6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  /* Le Temple (Beit HaMikdash) : façade haute couronnée d'or, grande porte, deux ailes, degrés. */
  var TEMPLE = '<path fill="currentColor" stroke="none" d="M2.5 21.5h19v-1.6h-19zM4 19.5h16v-1.4H4zM4.8 17.7V10.6h3.4v7.1zM15.8 17.7V10.6h3.4v7.1zM8.6 17.7V5.6l.85-1.9.85 1.9.85-1.9.85 1.9.85-1.9.85 1.9.85-1.9.85 1.9v12.1h-2V11.4a1.4 1.4 0 0 0-2.8 0v6.3z"/>';
  function ic(n, cls) {
    if (n === 'temple') return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + TEMPLE + '</svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + IC[n] + '</svg>';
  }

  /* Le sens de chaque fenêtre : son icône, « il reste X … quoi », et l'action qu'elle appelle. */
  var WIN = {
    // הַתָּדִיר
    shema: { ic: 'scroll', what: 'לקריאת שמע', act: 'shema' }, tefila: { ic: 'book', what: 'לתפילת שחרית', act: 'shacharit' }, boker: { ic: 'sun', what: 'עד חצות היום', act: 'shacharit' },
    chatzot: { ic: 'sun', what: 'עד מנחה גדולה' }, minchaG: { ic: 'sunlow', what: 'למנחה גדולה', act: 'mincha' }, minchaK: { ic: 'sunlow', what: 'למנחה קטנה', act: 'mincha' },
    plag: { ic: 'sunset', what: 'למנחה, עד השקיעה', act: 'mincha' }, erev: { ic: 'candles', what: 'עד הדלקת נרות', act: 'nerot' }, kabalat: { ic: 'candles', what: 'עד כניסת השבת', act: 'kabalat' },
    bein: { ic: 'sunset', what: 'עד צאת הכוכבים', act: 'arvit' }, arvit: { ic: 'night', what: 'לערבית', act: 'arvit' }, chatzotL: { ic: 'moon', what: 'עד עלות השחר' }, alot: { ic: 'dawn', what: 'עד הנץ החמה', act: 'shacharit' },
    // الأوقات
    fajr: { ic: 'dawn', what: 'لصلاة الفجر', act: 'prayed' }, duha: { ic: 'sun', what: 'حتى الظهر' }, dhuhr: { ic: 'sun', what: 'لصلاة الظهر', act: 'prayed' }, asr: { ic: 'sunlow', what: 'لصلاة العصر', act: 'prayed' },
    dhuhrAsr: { ic: 'sun', what: 'للظهر والعصر', act: 'prayed' }, ghurub: { ic: 'sunset', what: 'حتى المغرب' }, maghrib: { ic: 'sunset', what: 'لصلاة المغرب', act: 'prayed' }, isha: { ic: 'night', what: 'لصلاة العشاء', act: 'prayed' },
    maghribIsha: { ic: 'night', what: 'للمغرب والعشاء', act: 'prayed' }, layl: { ic: 'moon', what: 'حتى الفجر' },
    // Kairos
    eveil: { ic: 'sunrise', what: 'de mise en route' }, pic: { ic: 'bolt', what: 'de concentration' }, plateau: { ic: 'sun', what: 'de plateau' }, creux: { ic: 'cup', what: 'de creux' },
    souffle: { ic: 'wind', what: 'de second souffle' }, decel: { ic: 'sunset', what: 'pour ralentir' }, porte: { ic: 'moon', what: 'pour vous coucher' }, sommeil: { ic: 'bed', what: 'de sommeil' }
  };
  /* Icône d'un instant de la liste du jour, par son libellé. */
  var ROW = { 'עלות השחר': 'dawn', 'הנץ החמה': 'sunrise', 'סוף זמן קריאת שמע': 'scroll', 'סוף זמן תפילה': 'book', 'חצות היום': 'sun', 'מנחה גדולה': 'sunlow', 'מנחה קטנה': 'sunlow', 'פלג המנחה': 'sunset',
    'הדלקת נרות': 'candles', 'שקיעה': 'sunset', 'צאת הכוכבים': 'night', 'צאת השבת': 'havdala', 'חצות הלילה': 'moon',
    'الفجر': 'dawn', 'الشروق': 'sunrise', 'الظهر': 'sun', 'الجمعة': 'sun', 'العصر': 'sunlow', 'المغرب': 'sunset', 'العشاء': 'night', 'منتصف الليل': 'moon' };

  /* Le tfilon contextuel : ce que l'app ouvre quand on touche l'action du moment.
   * Seuls des textes courts et certains sont écrits ici ; le reste est un plan.
   * Le texte intégral viendra d'une source validée, selon le rite choisi. */
  var PRAY = {
    shema: { t: 'קריאת שמע', ic: 'scroll', text: 'שְׁמַע יִשְׂרָאֵל, ה׳ אֱלֹקֵינוּ, ה׳ אֶחָד.', rows: ['שמע ישראל', 'ואהבת', 'והיה אם שמוע', 'ויאמר'] },
    shacharit: { t: 'תפילת שחרית', ic: 'book', rows: ['ברכות השחר', 'פסוקי דזמרה', 'קריאת שמע וברכותיה', 'עמידה', 'תחנון', 'אשרי ובא לציון', 'עלינו לשבח'] },
    mincha: { t: 'תפילת מנחה', ic: 'sunlow', rows: ['אשרי', 'חצי קדיש', 'עמידה', 'תחנון', 'עלינו לשבח'] },
    arvit: { t: 'תפילת ערבית', ic: 'night', rows: ['והוא רחום', 'ברכו', 'קריאת שמע וברכותיה', 'עמידה', 'עלינו לשבח'] },
    nerot: { t: 'הדלקת נרות', ic: 'candles', text: 'בָּרוּךְ אַתָּה ה׳ אֱלֹקֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לְהַדְלִיק נֵר שֶׁל שַׁבָּת.', rows: [], shabbat: true },
    kabalat: { t: 'קבלת שבת', ic: 'candles', rows: ['לכו נרננה', 'לכה דודי', 'מזמור שיר ליום השבת', 'ערבית של שבת'] },
    levana: { t: 'ברכת הלבנה', ic: 'night', rows: ['הללויה, הללו את ה׳ מן השמים', 'ברכת הלבנה', 'סימן טוב', 'שלום עליכם'] }
  };
  var ACT = { shema: 'קריאת שמע', shacharit: 'תפילת שחרית', mincha: 'תפילת מנחה', arvit: 'תפילת ערבית', nerot: 'הדלקת נרות', kabalat: 'קבלת שבת', prayed: 'صلّيت' };

  var STR = {
    he: { left: 'נותרו', until: 'עד', next: 'בהמשך', tabs: ['שעון', 'זמנים', 'לוח', 'התראות', 'אני'], min: 'דק׳', dir: 'כיוון התפילה', card: ['צ', 'מז', 'ד', 'מע'], city: 'עיר', week: 'השבוע', alerts: 'התראות', me: 'אני',
          note: 'אין לסמוך על הזמנים עד הרגע האחרון.', wl: ['שעון', 'זמנים', 'היום'], here: 'אתם כאן', aligned: 'מכוונים', sunAlt: 'גובה השמש', km: 'ק״מ', shabbat: 'שבת שלום', shabbatMode: 'מצב שבת · ללא צליל, ללא רטט', moon: 'הלבנה', open: 'פתיחה' },
    ar: { left: 'الباقي', until: 'حتى', next: 'التالي', tabs: ['الساعة', 'المواقيت', 'التقويم', 'التنبيهات', 'حسابي'], min: 'د', dir: 'القبلة', card: ['ش', 'ق', 'ج', 'غ'], city: 'المدينة', week: 'هذا الأسبوع', alerts: 'التنبيهات', me: 'حسابي',
          note: 'المواقيت تقريبية بفارق دقيقة أو دقيقتين. راجع مسجدك عند الشك.', wl: ['الساعة', 'المواقيت', 'تسبيح'], here: 'أنت هنا', aligned: 'باتجاه القبلة', sunAlt: 'ارتفاع الشمس', km: 'كم', moon: 'القمر', open: 'فتح' },
    fr: { left: 'Encore', until: 'jusqu’à', next: 'Ensuite', tabs: ['Cycle', 'Journée', '', 'Repères', 'Moi'], min: 'min', dir: '', card: ['N', 'E', 'S', 'O'], city: 'Ville', week: '', alerts: 'Repères du jour', me: 'Moi',
          note: 'Repères indicatifs. Kairos n’est pas un dispositif médical.', wl: ['Cycle', 'Journée', 'Lumière'], here: 'Vous êtes ici', aligned: '', sunAlt: 'Hauteur du soleil', km: 'km', moon: 'Lune', open: 'Ouvrir' }
  };
  root.D2I = { raw: function (n) { return n === 'temple' ? TEMPLE : IC[n]; }, ic: ic, WIN: WIN, ROW: ROW, PRAY: PRAY, ACT: ACT, STR: STR };
})(window);

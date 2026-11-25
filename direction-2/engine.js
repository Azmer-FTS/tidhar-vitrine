/* TIDHAR — Direction 2 · moteur de calcul des maquettes.
 *
 * Rien n'est simulé : la position du soleil est calculée (algorithme de type NOAA /
 * SunCalc), et les fenêtres de chaque produit en découlent. Ce fichier ne dessine rien.
 *
 * Grammaire du brevet WO 2010/013230, identique pour les trois produits :
 *   un tour = un cycle · l'encoche du haut = l'ancre · l'anneau = le cycle qui se consomme,
 *   coloré par la lumière réelle · l'arc intérieur = UNIQUEMENT la fenêtre en cours, sa
 *   partie colorée = le temps RESTANT.
 * Ce qui change d'un produit à l'autre, c'est le cycle :
 *   hatadhar, awqat : deux cycles par jour, ancrés sur l'horizon (lever→coucher, coucher→lever)
 *   kairos          : un cycle, du réveil au réveil
 *
 * ⚠️ Maquette de design : les valeurs servent à juger l'interface, pas à prier à la minute.
 */
(function (root) {
  'use strict';
  var rad = Math.PI / 180, DAY = 864e5, MIN = 6e4, J1970 = 2440588, J2000 = 2451545, OBL = rad * 23.4397, J0 = 0.0009;
  function toDays(d) { return d / DAY - 0.5 + J1970 - J2000; }
  function fromJ(j) { return new Date((j + 0.5 - J1970) * DAY); }
  function anomaly(d) { return rad * (357.5291 + 0.98560028 * d); }
  function eclLon(m) { return m + rad * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m)) + rad * 102.9372 + Math.PI; }
  function decl(l) { return Math.asin(Math.sin(OBL) * Math.sin(l)); }
  function rasc(l) { return Math.atan2(Math.sin(l) * Math.cos(OBL), Math.cos(l)); }

  /** Hauteur du soleil en degrés, à un instant et un lieu. */
  function sunAlt(date, lat, lng) {
    var d = toDays(+date), l = eclLon(anomaly(d)), de = decl(l), phi = rad * lat;
    var H = rad * (280.16 + 360.9856235 * d) + rad * lng - rasc(l);
    return Math.asin(Math.sin(phi) * Math.sin(de) + Math.cos(phi) * Math.cos(de) * Math.cos(H)) / rad;
  }

  /** Midi solaire et passages à une hauteur donnée, pour le jour solaire contenant `date`. */
  function solar(date, lat, lng) {
    var lw = rad * -lng, phi = rad * lat, d = toDays(+date);
    var n = Math.round(d - J0 - lw / (2 * Math.PI)), ds = J0 + lw / (2 * Math.PI) + n;
    var m = anomaly(ds), l = eclLon(m), de = decl(l);
    var transit = function (x) { return J2000 + x + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * l); };
    var jn = transit(ds);
    function at(alt) {
      var c = (Math.sin(alt * rad) - Math.sin(phi) * Math.sin(de)) / (Math.cos(phi) * Math.cos(de));
      if (c < -1 || c > 1) return null; // le soleil n'atteint pas cette hauteur ce jour-là
      var js = transit(J0 + (Math.acos(c) + lw) / (2 * Math.PI) + n);
      return { rise: fromJ(jn - (js - jn)), set: fromJ(js) };
    }
    return { noon: fromJ(jn), at: at, dec: de, phi: phi };
  }

  /** Phase de la lune, 0 = nouvelle, 0.5 = pleine (approximation synodique, suffisante pour un pictogramme). */
  function moonPhase(date) { var p = ((+date / DAY - 10.3166) / 29.530588853) % 1; return p < 0 ? p + 1 : p; }

  /* ---------- fuseaux : toujours des identifiants IANA, jamais un décalage figé ---------- */
  function tzOffsetMs(date, tz) {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    var p = {}; f.formatToParts(date).forEach(function (x) { p[x.type] = +x.value; });
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(+date / 1000) * 1000;
  }
  function wall(date, tz) { var w = new Date(+date + tzOffsetMs(date, tz)); return { y: w.getUTCFullYear(), m: w.getUTCMonth(), d: w.getUTCDate(), h: w.getUTCHours(), min: w.getUTCMinutes(), dow: w.getUTCDay() }; }
  /** Instant correspondant à une heure murale (jour civil + heures décimales) dans un fuseau. */
  function fromWall(y, m, d, hours, tz) { var g = Date.UTC(y, m, d) + hours * 36e5; var t = new Date(g - tzOffsetMs(new Date(g), tz)); return new Date(g - tzOffsetMs(t, tz)); }
  function civilNoon(date, tz, addDays) { var w = wall(date, tz); return fromWall(w.y, w.m, w.d + (addDays || 0), 12, tz); }

  /* ---------- la lumière réelle : une couleur par hauteur du soleil ---------- */
  /* La nuit est un indigo franc, pas un noir : sur fond sombre, la part consommée de l'anneau doit rester lisible. */
  var SKY = [[-90, [38, 44, 108]], [-18, [42, 48, 116]], [-12, [64, 62, 148]], [-6, [114, 86, 170]], [-2.5, [198, 98, 138]], [0, [244, 146, 98]],
             [4, [248, 198, 122]], [10, [176, 216, 246]], [30, [112, 188, 244]], [90, [92, 178, 242]]];
  function skyRGB(alt) {
    for (var i = 1; i < SKY.length; i++) if (alt <= SKY[i][0]) {
      var a = SKY[i - 1], b = SKY[i], t = (alt - a[0]) / (b[0] - a[0]);
      return [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * t); });
    }
    return SKY[SKY.length - 1][1];
  }
  function skyCSS(alt, alpha) { var c = skyRGB(alt); return alpha == null ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + alpha + ')'; }

  /* ---------- direction (orthodromie) ---------- */
  function bearing(lat, lng, lat2, lng2) {
    var p1 = lat * rad, p2 = lat2 * rad, dl = (lng2 - lng) * rad;
    var b = Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / rad;
    return (b + 360) % 360;
  }

  /* ---------- données ---------- */
  var CITIES = {
    jerusalem: { he: 'ירושלים', ar: 'القدس', fr: 'Jérusalem', lat: 31.7683, lng: 35.2137, tz: 'Asia/Jerusalem', candles: 40 },
    paris: { he: 'פריז', ar: 'باريس', fr: 'Paris', lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris', candles: 18 },
    newyork: { he: 'ניו יורק', ar: 'نيويورك', fr: 'New York', lat: 40.7128, lng: -74.006, tz: 'America/New_York', candles: 18 },
    makkah: { he: 'מכה', ar: 'مكة المكرمة', fr: 'La Mecque', lat: 21.3891, lng: 39.8579, tz: 'Asia/Riyadh' },
    casablanca: { he: 'קזבלנקה', ar: 'الدار البيضاء', fr: 'Casablanca', lat: 33.5731, lng: -7.5898, tz: 'Africa/Casablanca' },
    istanbul: { he: 'איסטנבול', ar: 'إسطنبول', fr: 'Istanbul', lat: 41.0082, lng: 28.9784, tz: 'Europe/Istanbul' },
    tehran: { he: 'טהרן', ar: 'طهران', fr: 'Téhéran', lat: 35.6892, lng: 51.389, tz: 'Asia/Tehran' }
  };
  /* Méthodes de calcul des prières : angles sous l'horizon. maghrib>0 = angle (tradition jaʿfarite). */
  var METHODS = {
    mwl: { ar: 'رابطة العالم الإسلامي', fr: 'Ligue islamique mondiale', fajr: 18, isha: 17 },
    makkah: { ar: 'أم القرى', fr: 'Umm al-Qura', fajr: 18.5, ishaMin: 90 },
    egypt: { ar: 'الهيئة المصرية العامة للمساحة', fr: 'Égypte', fajr: 19.5, isha: 17.5 },
    isna: { ar: 'أمريكا الشمالية (ISNA)', fr: 'Amérique du Nord (ISNA)', fajr: 15, isha: 15 },
    france: { ar: 'فرنسا (12°)', fr: 'France (12°)', fajr: 12, isha: 12 },
    jafari: { ar: 'الجعفري (ليفا، قم)', fr: 'Jaʿfari (Leva, Qom)', fajr: 16, isha: 14, maghrib: 4, jafari: true },
    tehran: { ar: 'طهران (معهد الجيوفيزياء)', fr: 'Téhéran (Institut de géophysique)', fajr: 17.7, isha: 14, maghrib: 4.5, jafari: true }
  };
  var HORIZON = -0.833;

  function W(id, name, endLabel, start, end, extra) { var w = { id: id, name: name, endLabel: endLabel, start: start, end: end }; if (extra) for (var k in extra) w[k] = extra[k]; return w; }
  function mid(a, b) { return new Date((+a + +b) / 2); }
  function plus(a, ms) { return new Date(+a + ms); }

  /* ---------- הַתָּדִיר : zmanim ---------- */
  function hatadharDay(noon, city, cfg) {
    var s = solar(noon, city.lat, city.lng), h = s.at(HORIZON), dawn = s.at(-16.1), stars = s.at(-8.5);
    var netz = h.rise, shkia = h.set, alot = dawn ? dawn.rise : plus(netz, -72 * MIN), tzet = stars ? stars.set : plus(shkia, 40 * MIN);
    // GRA : le jour va du lever au coucher. Magen Avraham : de l'aube (72 min) à la nuit (72 min).
    var mga = cfg.opinion === 'mga', d0 = mga ? plus(netz, -72 * MIN) : netz, d1 = mga ? plus(shkia, 72 * MIN) : shkia, sh = (d1 - d0) / 12;
    var g = (shkia - netz) / 12;
    return { netz: netz, shkia: shkia, alot: alot, tzet: tzet, sofShema: plus(d0, 3 * sh), sofTefila: plus(d0, 4 * sh), chatzot: plus(netz, 6 * g),
             minchaG: plus(netz, 6.5 * g), minchaK: plus(netz, 9.5 * g), plag: plus(netz, 10.75 * g), candles: plus(shkia, -(city.candles || 18) * MIN), shaa: g, dow: wall(noon, city.tz).dow };
  }
  function hatadhar(now, city, cfg) {
    var A = hatadharDay(civilNoon(now, city.tz, -1), city, cfg), B = hatadharDay(civilNoon(now, city.tz, 0), city, cfg), C = hatadharDay(civilNoon(now, city.tz, 1), city, cfg);
    function night(a, b) { // du coucher de a au lever de b
      var cl = mid(a.shkia, b.netz), motsae = a.dow === 6, erev = a.dow === 5;
      return { night: true, start: a.shkia, end: b.netz, shabbat: erev, windows: [
        W('bein', 'בין השמשות', motsae ? 'צאת השבת' : 'צאת הכוכבים', a.shkia, a.tzet),
        W('arvit', 'זמן ערבית', 'חצות הלילה', a.tzet, cl),
        W('chatzotL', 'אחרי חצות', 'עלות השחר', cl, b.alot),
        W('alot', 'עלות השחר', 'הנץ החמה', b.alot, b.netz)] };
    }
    function day(b) {
      var erev = b.dow === 5, ws = [
        W('shema', 'זמן קריאת שמע', 'סוף זמן קריאת שמע', b.netz, b.sofShema),
        W('tefila', 'זמן תפילה', 'סוף זמן תפילה', b.sofShema, b.sofTefila),
        W('boker', 'עד חצות', 'חצות היום', b.sofTefila, b.chatzot),
        W('chatzot', 'חצות היום', 'מנחה גדולה', b.chatzot, b.minchaG),
        W('minchaG', 'מנחה גדולה', 'מנחה קטנה', b.minchaG, b.minchaK),
        W('minchaK', 'מנחה קטנה', 'פלג המנחה', b.minchaK, b.plag)];
      if (erev) { ws.push(W('erev', 'ערב שבת', 'הדלקת נרות', b.plag, b.candles), W('kabalat', 'קבלת שבת', 'שקיעה', b.candles, b.shkia, { shabbat: true })); }
      else ws.push(W('plag', 'פלג המנחה', 'שקיעה', b.plag, b.shkia));
      return { night: false, start: b.netz, end: b.shkia, shabbat: b.dow === 6, windows: ws };
    }
    var cycles = [night(A, B), day(B), night(B, C)];
    var list = [['עלות השחר', B.alot], ['הנץ החמה', B.netz], ['סוף זמן קריאת שמע', B.sofShema], ['סוף זמן תפילה', B.sofTefila], ['חצות היום', B.chatzot],
                ['מנחה גדולה', B.minchaG], ['מנחה קטנה', B.minchaK], ['פלג המנחה', B.plag]];
    if (B.dow === 5) list.push(['הדלקת נרות', B.candles]);
    list.push(['שקיעה', B.shkia], [B.dow === 6 ? 'צאת השבת' : 'צאת הכוכבים', B.tzet], ['חצות הלילה', mid(B.shkia, C.netz)]);
    return { cycles: cycles, list: list, today: B, target: { lat: 31.778, lng: 35.2354, label: 'ירושלים' } };
  }

  /* ---------- الأوقات : les cinq prières ---------- */
  function awqatDay(noon, city, cfg) {
    var M = METHODS[cfg.method] || METHODS.mwl, s = solar(noon, city.lat, city.lng), h = s.at(HORIZON);
    var f = s.at(-M.fajr), sunrise = h.rise, sunset = h.set, dhuhr = plus(s.noon, 1 * MIN);
    var asrAlt = Math.atan(1 / ((cfg.asr === 'hanafi' ? 2 : 1) + Math.tan(Math.abs(s.phi - s.dec)))) / rad, a = s.at(asrAlt);
    var mg = M.maghrib ? s.at(-M.maghrib) : null, maghrib = mg ? mg.set : sunset;
    var ishaA = M.isha ? s.at(-M.isha) : null, isha = M.ishaMin ? plus(maghrib, M.ishaMin * MIN) : (ishaA ? ishaA.set : plus(maghrib, 90 * MIN));
    return { fajr: f ? f.rise : plus(sunrise, -90 * MIN), sunrise: sunrise, dhuhr: dhuhr, asr: a ? a.set : plus(dhuhr, 3 * 36e5), sunset: sunset, maghrib: maghrib, isha: isha, jafari: !!M.jafari, dow: wall(noon, city.tz).dow };
  }
  function awqat(now, city, cfg) {
    var A = awqatDay(civilNoon(now, city.tz, -1), city, cfg), B = awqatDay(civilNoon(now, city.tz, 0), city, cfg), C = awqatDay(civilNoon(now, city.tz, 1), city, cfg);
    function night(a, b) {
      var midn = mid(a.sunset, b.fajr), ws = [];
      if (+a.maghrib > +a.sunset) ws.push(W('ghurub', 'بعد الغروب', 'المغرب', a.sunset, a.maghrib));
      // Tradition jaʿfarite : Maghrib et Isha partagent une seule fenêtre, jusqu'au milieu de la nuit.
      if (a.jafari) ws.push(W('maghribIsha', 'المغرب والعشاء', 'منتصف الليل', a.maghrib, midn));
      else ws.push(W('maghrib', 'المغرب', 'العشاء', a.maghrib, a.isha), W('isha', 'العشاء', 'منتصف الليل', a.isha, midn));
      ws.push(W('layl', 'آخر الليل', 'الفجر', midn, b.fajr), W('fajr', 'الفجر', 'الشروق', b.fajr, b.sunrise));
      return { night: true, start: a.sunset, end: b.sunrise, windows: ws };
    }
    function day(b) {
      var fri = b.dow === 5;
      // Tradition jaʿfarite : Dhuhr et Asr partagent une seule fenêtre, du zénith au coucher.
      var ws = [W('duha', 'الضحى', fri && !b.jafari ? 'الجمعة' : 'الظهر', b.sunrise, b.dhuhr)];
      if (b.jafari) ws.push(W('dhuhrAsr', 'الظهر والعصر', 'الغروب', b.dhuhr, b.sunset));
      else ws.push(W('dhuhr', fri ? 'الجمعة' : 'الظهر', 'العصر', b.dhuhr, b.asr), W('asr', 'العصر', 'المغرب', b.asr, b.sunset));
      return { night: false, start: b.sunrise, end: b.sunset, windows: ws };
    }
    var list = [['الفجر', B.fajr], ['الشروق', B.sunrise], [B.dow === 5 ? 'الجمعة' : 'الظهر', B.dhuhr], ['العصر', B.asr], ['المغرب', B.maghrib], ['العشاء', B.isha], ['منتصف الليل', mid(B.sunset, C.fajr)]];
    return { cycles: [night(A, B), day(B), night(B, C)], list: list, today: B, target: { lat: 21.4225, lng: 39.8262, label: 'مكة المكرمة' } };
  }

  /* ---------- Kairos : la journée circadienne, du réveil au réveil ----------
   * Les bornes sont des repères d'exemple pour juger l'interface, décalés par le chronotype.
   * Kairos n'est pas un dispositif médical. */
  var PHASES = [['eveil', 'Mise en route', 0, 1.5], ['pic', 'Pic de concentration', 1.5, 5], ['plateau', 'Plateau', 5, 7], ['creux', 'Creux de l’après-midi', 7, 9],
                ['souffle', 'Second souffle', 9, 12], ['decel', 'Décélération', 12, 14.5], ['porte', 'Fenêtre de sommeil', 14.5, 16], ['sommeil', 'Sommeil', 16, 24]];
  function kairos(now, city, cfg) {
    var wake = cfg.wake == null ? 7 : cfg.wake, w = wall(now, city.tz);
    function cyc(add) {
      var s = fromWall(w.y, w.m, w.d + add, wake, city.tz), e = fromWall(w.y, w.m, w.d + add + 1, wake, city.tz), len = (e - s) / 24;
      var ws = PHASES.map(function (p, i) { return W(p[0], p[1], i + 1 < PHASES.length ? PHASES[i + 1][1] : 'Réveil', plus(s, p[2] * len), plus(s, p[3] * len)); });
      return { night: false, start: s, end: e, windows: ws };
    }
    var cycles = [cyc(-1), cyc(0), cyc(1)], cur = cycles[+now < +cycles[1].start ? 0 : 1];
    var list = cur.windows.map(function (x) { return [x.name, x.start]; });
    var bed = cur.windows[7].start;
    return { cycles: cycles, list: list, target: null, marks: { cafeine: plus(bed, -9 * 36e5), lumiere: plus(cur.start, 36e5), ecrans: plus(bed, -1.5 * 36e5), coucher: bed } };
  }

  var PRODUCTS = {
    hatadhar: { id: 'hatadhar', name: 'הַתָּדִיר', latin: 'HaTidhar', lang: 'he', dir: 'rtl', accent: '#4FC5F1', city: 'jerusalem', cities: ['jerusalem', 'paris', 'newyork'], fn: hatadhar },
    awqat: { id: 'awqat', name: 'الأوقات', latin: 'Al-Awqat', lang: 'ar', dir: 'rtl', accent: '#2FBF9B', city: 'makkah', cities: ['makkah', 'casablanca', 'istanbul', 'paris', 'tehran'], fn: awqat },
    kairos: { id: 'kairos', name: 'Kairos', latin: 'Kairos', lang: 'fr', dir: 'ltr', accent: '#FF8A5B', city: 'paris', cities: ['paris', 'newyork', 'jerusalem'], fn: kairos }
  };

  /** Tout ce que l'interface a besoin de savoir à un instant donné. */
  function compute(productId, now, cfg) {
    var P = PRODUCTS[productId], city = CITIES[cfg.city || P.city], r = P.fn(now, city, cfg || {}), t = +now, cycle = null, i;
    for (i = 0; i < r.cycles.length; i++) if (t >= +r.cycles[i].start && t < +r.cycles[i].end) { cycle = r.cycles[i]; break; }
    if (!cycle) cycle = r.cycles[1];
    var len = cycle.end - cycle.start, widx = 0;
    cycle.windows.forEach(function (w, k) { if (t >= +w.start && t < +w.end) widx = k; });
    var win = cycle.windows[widx];
    var next = cycle.windows[widx + 1] || (r.cycles[r.cycles.indexOf(cycle) + 1] || { windows: [null] }).windows[0];
    var alt = sunAlt(now, city.lat, city.lng);
    return {
      product: P, city: city, now: now, cycle: cycle, cycles: r.cycles, list: r.list, marks: r.marks || null, today: r.today || null,
      frac: (t - cycle.start) / len, window: win, windowIndex: widx, next: next,
      remaining: win.end - t, windowFrac: (t - win.start) / (win.end - win.start),
      angle: function (d) { return ((+d - cycle.start) / len) * 360; },
      alt: alt, isNight: alt < HORIZON, moon: moonPhase(now),
      bearing: r.target ? bearing(city.lat, city.lng, r.target.lat, r.target.lng) : null, target: r.target
    };
  }

  root.TIDHAR = { compute: compute, PRODUCTS: PRODUCTS, CITIES: CITIES, METHODS: METHODS, sunAlt: sunAlt, skyCSS: skyCSS, skyRGB: skyRGB, wall: wall, fromWall: fromWall, moonPhase: moonPhase, solar: solar, MIN: MIN };
})(typeof window !== 'undefined' ? window : globalThis);

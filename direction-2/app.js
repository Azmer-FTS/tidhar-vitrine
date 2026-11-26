/* TIDHAR — Direction 2 · l'interface des maquettes (téléphone, montre, autres surfaces).
 * Un seul moteur de dessin pour toutes les surfaces : TIDHAR.compute() dit quoi, ce fichier dit comment.
 * Pas de thème clair / sombre à choisir : l'écran suit la lumière réelle du ciel et la météo. */
(function () {
  'use strict';
  var T = window.TIDHAR, I = window.D2I, ic = I.ic;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  /* ---------- état ---------- */
  var S = { p: 'hatadhar', now: new Date(), screen: 0, wscreen: 0, side: 'front', wside: 'front', playing: false, tasbih: 0, intro: 1, onb: null, calView: 'month', calSel: null, calMon: null, draft: { type: 'bday', remind: 'eve', name: '' },
            events: [{ type: 'azkara', name: 'סבא יצחק ז״ל', m: 'Kislev', d: 19, remind: 'eve', demo: 1 }, { type: 'bday', name: 'נועם', m: 'Kislev', d: 22, remind: 'eve', demo: 1 }],
            wx: 0, face: 'sky', sheet: null, flash: false, heading: 0, shabbatOn: false, prayed: {}, off: {},
            cfg: { hatadhar: { city: 'jerusalem', opinion: 'gra', rite: 'edot' }, awqat: { city: 'casablanca', method: 'mwl', asr: 'shafii' }, kairos: { city: 'paris', wake: 7 } } };
  var M = null;
  function cfg() { return S.cfg[S.p]; }
  function P() { return T.PRODUCTS[S.p]; }
  function L() { return I.STR[P().lang]; }
  function tz() { return T.CITIES[cfg().city].tz; }
  function win(w) { var x = I.WIN[w.id] || { ic: 'clock', what: '' };
    // À la sortie de Chabbat, la fenêtre du crépuscule mène à la sortie de Chabbat, pas « aux étoiles ».
    if (w.id === 'bein' && w.endLabel === 'צאת השבת') return { ic: 'havdala', what: 'עד צאת השבת', act: x.act };
    return x; }

  /* ---------- formats ---------- */
  var fc = {};
  function hm(d, z) { z = z || tz(); var f = fc[z] || (fc[z] = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: z, hourCycle: 'h23' })); return f.format(d); }
  function rem(ms) { var t = Math.max(0, Math.floor(ms / 6e4)); return { h: Math.floor(t / 60), m: t % 60 }; }
  function remBig(ms) { var r = rem(ms); if (r.h) return r.h + ':' + (r.m < 10 ? '0' : '') + r.m; var u = '<sup>' + L().min + '</sup>'; return P().dir === 'rtl' ? u + '<bdi>' + r.m + '</bdi>' : r.m + u; }
  function remPlain(ms) { var r = rem(ms); return r.h ? r.h + ':' + (r.m < 10 ? '0' : '') + r.m : r.m + ' ' + L().min; }
  function remText(ms) {
    var r = rem(ms), l = P().lang;
    if (l === 'he') return r.h ? (r.h === 1 ? 'שעה' : r.h + ' שעות') + (r.m ? ' ו־' + r.m + ' דק׳' : '') : r.m + ' דקות';
    if (l === 'ar') return r.h ? r.h + ' س ' + (r.m ? r.m + ' د' : '') : r.m + ' دقيقة';
    return r.h ? r.h + ' h ' + (r.m < 10 ? '0' : '') + r.m : r.m + ' min';
  }
  /** L'instant qui porte la date du produit : le jour hébraïque et le jour hégirien commencent au coucher. */
  function dayInstant(m) { if (m.today) { var eve = m.today.shkia || m.today.maghrib; if (+m.now >= +eve) return new Date(+m.now + 432e5); } return m.now; }
  function dateText(m, d) {
    var l = m.product.lang, z = m.city.tz, x = d || dayInstant(m);
    if (l === 'he') return hebDate(x, z);
    if (l === 'ar') return new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', timeZone: z }).format(x);
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: z }).format(x);
  }
  function weekday(m, d, style) { return new Intl.DateTimeFormat(m.product.lang, { weekday: style || 'long', timeZone: m.city.tz }).format(d || m.now); }
  function lunarDay(m) { var cal = m.product.lang === 'ar' ? 'islamic-umalqura' : 'hebrew'; return +new Intl.DateTimeFormat('en-u-ca-' + cal, { day: 'numeric', timeZone: m.city.tz }).format(dayInstant(m)); }

  /* ---------- le calendrier hébraïque : tout en lettres ---------- */
  var hfmt = {}, HMON = { Tishri: 'תשרי', Heshvan: 'חשוון', Kislev: 'כסלו', Tevet: 'טבת', Shevat: 'שבט', 'Adar I': 'אדר א׳', 'Adar II': 'אדר ב׳', Adar: 'אדר', Nisan: 'ניסן', Iyar: 'אייר', Sivan: 'סיוון', Tamuz: 'תמוז', Av: 'אב', Elul: 'אלול' };
  function hparts(d, z) { var f = hfmt[z] || (hfmt[z] = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: z })), o = {}; f.formatToParts(d).forEach(function (x) { o[x.type] = x.value; }); return { d: +o.day, m: o.month, y: +o.year }; }
  /** Un nombre en lettres hébraïques : 16 → ט״ז, 787 → תשפ״ז. */
  function gem(n) { var H = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'], D = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], U = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], x = n % 100,
      s = H[Math.floor(n / 100) % 10] + (x === 15 ? 'טו' : x === 16 ? 'טז' : D[Math.floor(x / 10)] + U[x % 10]); return s.length > 1 ? s.slice(0, -1) + '״' + s.slice(-1) : s + '׳'; }
  function hebDate(d, z, year) { var q = hparts(d, z); return gem(q.d) + ' ב' + HMON[q.m] + (year ? ' ' + gem(q.y % 1000) : ''); }
  /** Le jour de la semaine du calendrier du produit : après le coucher du soleil, c'est déjà la nuit du lendemain. */
  function wdText(m, d) { var l = m.product.lang, x = d || dayInstant(m), dow = T.wall(x, m.city.tz).dow, night = !d && m.isNight;
    if (l === 'he') return dow === 6 ? (night ? 'ליל שבת' : 'שבת') : (night ? 'ליל ' : 'יום ') + 'אבגדהו'.charAt(dow) + '׳';
    if (l === 'ar') return (night ? 'ليلة ' : '') + weekday(m, x);
    return weekday(m, d || m.now); }
  /** La date grégorienne suit son propre calendrier : elle change à minuit. Entre le coucher du soleil et minuit,
   *  une pastille annonce la date qui arrive, pour que les deux calendriers se lisent ensemble sans se contredire. */
  function gregHTML(m) { if (S.p === 'kairos') return ''; var z = m.city.tz, lg = m.product.lang + '-u-ca-gregory-nu-latn', di = dayInstant(m),
      g = new Intl.DateTimeFormat(lg, { day: 'numeric', month: 'long', year: 'numeric', timeZone: z }).format(m.now); if (di === m.now) return esc(g);
    return esc(g) + '<span class="gnext">' + ic('clock') + (m.product.lang === 'he' ? 'מ־00:00 · ' : 'من 00:00 · ') + esc(new Intl.DateTimeFormat(lg, { day: 'numeric', month: 'long', timeZone: z }).format(di)) + '</span>'; }
  function calNoon(d) { var z = tz(), w = T.wall(d, z); return T.fromWall(w.y, w.m, w.d, 12, z); }
  function hmonth(anchor, z) { var q = hparts(anchor, z), first = +anchor - (q.d - 1) * 864e5, days = [], i, d, h; for (i = 0; i < 31; i++) { d = calNoon(new Date(first + i * 864e5)); h = hparts(d, z); if (h.m !== q.m) break; days.push({ date: d, h: h, w: T.wall(d, z) }); } return { m: q.m, y: q.y, days: days }; }
  /** Les fêtes à date fixe (coutume d'Israël). Les jeûnes déplacés, les parachiot et la diaspora demandent une source validée. */
  function holiday(h, date, z) { var m = h.m, d = h.d, o = [], F = { Tishri: { 1: 'ראש השנה', 2: 'ראש השנה', 10: 'יום כיפור', 15: 'סוכות', 21: 'הושענא רבה', 22: 'שמיני עצרת ושמחת תורה' }, Shevat: { 15: 'ט״ו בשבט' }, Nisan: { 15: 'פסח', 21: 'שביעי של פסח' }, Iyar: { 18: 'ל״ג בעומר' }, Sivan: { 6: 'שבועות' }, Tevet: { 10: 'צום עשרה בטבת' }, Av: { 15: 'ט״ו באב' } };
    if ((d === 1 && m !== 'Tishri') || d === 30) o.push('ראש חודש'); if (F[m] && F[m][d]) o.push(F[m][d]);
    if (m === 'Tishri' && d >= 16 && d <= 20) o.push('חול המועד סוכות'); if (m === 'Nisan' && d >= 16 && d <= 20) o.push('חול המועד פסח');
    if ((m === 'Adar' || m === 'Adar II') && d === 14) o.push('פורים');
    if (m === 'Kislev' && d >= 25) o.push('חנוכה · נר ' + gem(d - 24));
    if (m === 'Tevet' && d <= 3) { var n = hparts(new Date(+date - d * 864e5), z).d - 24 + d; if (n <= 8) o.push('חנוכה · נר ' + gem(n)); }
    return o; }
  function dayEvents(day, z) { return { hol: holiday(day.h, day.date, z), mine: S.events.filter(function (e) { return e.m === day.h.m && e.d === day.h.d; }) }; }
  var EVT = { bday: 'יום הולדת', azkara: 'אזכרה', event: 'אירוע' }, REMS = [['eve', 'בערב, עם כניסת התאריך העברי'], ['morning', 'בבוקר'], ['week', 'שבוע לפני']];

  /* ---------- ce que le moment veut dire ---------- */
  function isShabbat(m) { if (S.p !== 'hatadhar') return false; var t = m.today; return (t.dow === 5 && (+m.now >= +t.candles || S.shabbatOn)) || (t.dow === 6 && +m.now < +t.tzet); }
  /** Bénédiction de la lune : du 3ᵉ jour (rite ashkénaze) ou du 7ᵉ (séfarade, orientaux) jusqu'à la nuit du 14. À valider par le Rav. */
  function levana(m) {
    var d = lunarDay(m), start = cfg().rite === 'ashkenaz' ? 3 : 7;
    if (d < start) return { open: false, text: 'ברכת הלבנה החל מ־' + start + ' בחודש' };
    if (d <= 14) return { open: true, text: 'אפשר לברך ברכת הלבנה, עד ליל ט״ו' };
    return { open: false, text: 'זמן ברכת הלבנה עבר לחודש זה' };
  }
  function phaseName(m) { var p = m.moon, l = m.product.lang, n = p < 0.04 || p > 0.96 ? 0 : p < 0.22 ? 1 : p < 0.28 ? 2 : p < 0.46 ? 3 : p < 0.54 ? 4 : p < 0.72 ? 5 : p < 0.78 ? 6 : 7;
    return { he: ['מולד', 'ירח עולה', 'חצי ירח', 'ירח מתמלא', 'ירח מלא', 'ירח מתמעט', 'חצי ירח', 'ירח יורד'], ar: ['محاق', 'هلال', 'تربيع أول', 'أحدب متزايد', 'بدر', 'أحدب متناقص', 'تربيع أخير', 'هلال آخر الشهر'],
             fr: ['Nouvelle lune', 'Premier croissant', 'Premier quartier', 'Lune gibbeuse', 'Pleine lune', 'Lune gibbeuse', 'Dernier quartier', 'Dernier croissant'] }[l][n]; }

  /* ---------- le ciel : la lumière réelle, puis la météo ---------- */
  var KF = [[-18, [7, 11, 31], [13, 20, 51], [19, 27, 64]], [-6, [20, 27, 68], [59, 47, 107], [122, 74, 120]], [-1.5, [58, 72, 130], [150, 100, 140], [226, 140, 120]],
            [3, [110, 160, 216], [236, 196, 160], [250, 228, 206]], [12, [111, 182, 242], [178, 217, 248], [240, 245, 248]], [90, [96, 172, 240], [170, 212, 247], [238, 244, 248]]];
  var still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function wet() { return S.wx === 'rain' || S.wx === 'storm'; }
  function cloud() { return wet() ? 1 : +S.wx; }
  function skyTriple(alt) {
    var a = KF[0], b = KF[KF.length - 1], i, t = 0, c = cloud(), dim = S.wx === 'storm' ? 0.6 : S.wx === 'rain' ? 0.78 : 1 - c * 0.08;
    if (alt <= a[0]) b = a; else if (alt >= b[0]) a = b; else for (i = 1; i < KF.length; i++) if (alt <= KF[i][0]) { a = KF[i - 1]; b = KF[i]; t = (alt - a[0]) / (b[0] - a[0]); break; }
    // un ciel voilé garde son bleu ; c'est le couvert, puis la pluie, qui le grisent
    return [1, 2, 3].map(function (k) { var col = [0, 1, 2].map(function (j) { return a[k][j] + (b[k][j] - a[k][j]) * t; }), g = 0.3 * col[0] + 0.59 * col[1] + 0.11 * col[2];
      return col.map(function (v) { v = v + (g - v) * c * c * 0.86; return Math.round(v * dim); }); });
  }
  function rgb(c) { return 'rgb(' + c.map(Math.round).join(',') + ')'; }
  function skyHTML() { return '<div class="sky" data-sky></div>'; }
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  /** L'état du ciel à cet instant. Sert deux fois : au canevas qui le peint (sky.js) et au garde-fou qui mesure la lisibilité.
   *  L'écran est une fenêtre : l'horizon passe sous le cadran, le zénith est en haut. Un soleil d'hiver, bas, passe donc
   *  derrière le verre du cadran ; un soleil d'été passe au-dessus. */
  function skyModel(m) {
    var plain = S.face === 'layla', c = plain ? 0 : cloud(), light = m.alt > -1.5, tri = plain ? [[0, 0, 0], [0, 0, 0], [0, 0, 0]] : skyTriple(m.alt),
        xOf = function (az) { return clamp((az - 60) / 240, 0.06, 0.94); }, yOf = function (alt) { return 0.60 - clamp(alt, 0, 90) / 90 * 0.54; };
    return { plain: plain, tri: tri, c: c, wet: !plain && wet(), storm: !plain && S.wx === 'storm', light: light,
      stops: [[0, tri[0]], [0.24, mix(tri[0], tri[1], 0.55)], [0.5, tri[1]], [0.78, mix(tri[1], tri[2], 0.6)], [1, tri[2]]],
      glow: plain ? 0 : clamp(1 - Math.abs(m.alt) / 10, 0, 1) * (1 - c * 0.85), sunX: xOf(m.sky.sun.az),
      sun: !plain && m.sky.sun.alt > -2 ? { x: xOf(m.sky.sun.az), y: yOf(m.sky.sun.alt), a: 1 - c * 0.8, warm: clamp(1 - m.sky.sun.alt / 14, 0, 1) } : null,
      moon: !plain && m.sky.moon.alt > 0 && m.alt < 6 ? { x: xOf(m.sky.moon.az), y: yOf(m.sky.moon.alt), p: m.moon, a: +(1 - c * 0.85).toFixed(2) } : null,
      stars: plain ? 0 : clamp((-m.alt - 3) / 9, 0, 1) * (1 - c * 0.92),
      cloudRGB: light ? (c > 0.6 ? [226, 231, 238] : [255, 255, 255]) : [142, 152, 180], cloudA: c > 0.02 ? 0.16 + 0.42 * c : 0,
      veilRGB: light ? (S.wx === 'storm' ? [82, 90, 108] : S.wx === 'rain' ? [104, 114, 130] : [176, 184, 194]) : [16, 20, 32], veilA: c > 0.6 ? (c - 0.6) * 1.1 : 0, rainRGB: light ? '244,248,253' : '186,202,230' };
  }
  /** Ce que le canevas du ciel doit peindre à cet instant (voir sky.js). */
  function skyDraw(k, m) {
    return { grad: k.stops.map(function (s) { return [s[0], rgb(s[1])]; }), glow: k.glow, sunX: k.sunX, stars: k.stars, rot: (+m.now / 86164090.5) * 2 * Math.PI % (2 * Math.PI), sun: k.sun, moon: k.moon,
      cloud: k.c, rain: k.wet ? (k.storm ? 1.5 : 1) : 0, storm: k.storm, cloudRGB: k.cloudRGB.join(','), veilRGB: k.veilRGB.join(','), rainRGB: k.rainRGB };
  }

  /* ---------- le garde-fou de lisibilité ----------
   * Le fond change toute la journée ; le texte, lui, doit rester lisible à chaque instant. Pour chaque zone de l'écran,
   * on calcule la couleur réelle du ciel derrière elle (dégradé, lueur d'horizon, nuages, halo du soleil, voile de pluie),
   * puis on choisit le ton du verre (clair ou fumé) et on l'épaissit jusqu'à tenir les contrastes exigés (WCAG 2.2). */
  var INK = { light: [15, 27, 45], dark: [244, 246, 251] }, MUTE = { light: [43, 61, 85], dark: [190, 200, 219] }, TINT = { light: [255, 255, 255], dark: [9, 14, 32] }, BASE = { light: 0.42, dark: 0.2 }, NEED = { ink: 7, mute: 4.5, acc: 3 },
      ACCT = { hatadhar: { light: [11, 99, 218], dark: [92, 203, 245] }, awqat: { light: [6, 122, 90], dark: [47, 191, 155] }, kairos: { light: [208, 58, 12], dark: [255, 138, 91] } }, GOLD = [246, 207, 126];
  function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function over(bg, fg, al) { return bg.map(function (v, i) { return v + (fg[i] - v) * al; }); }
  function bgAt(k, y) {
    var st = k.stops, i, c = st[st.length - 1][1];
    for (i = 1; i < st.length; i++) if (y <= st[i][0]) { c = over(st[i - 1][1], st[i][1], (y - st[i - 1][0]) / (st[i][0] - st[i - 1][0])); break; }
    if (k.glow > 0.01) { var d = Math.sqrt(Math.pow((0.5 - k.sunX) * 0.48, 2) + Math.pow(1.02 - y, 2)) / 0.8, gl = d < 0.45 ? 0.6 - 0.36 * d / 0.45 : d < 1 ? 0.24 * (1 - (d - 0.45) / 0.55) : 0; c = over(c, [255, 160, 116], gl * k.glow); }
    if (k.veilA) c = over(c, k.veilRGB, k.veilA);
    if (k.wet) c = over(c, k.veilRGB, clamp((y - 0.55) / 0.45, 0, 1) * 0.3);
    return c;
  }
  /** Les fonds possibles derrière une zone : le ciel nu, le même sous un nuage, le même dans le halo du soleil. */
  function variants(k, ys) { var o = []; ys.forEach(function (y) { var b = bgAt(k, y); o.push(b); if (k.cloudA) o.push(over(b, k.cloudRGB, Math.min(0.85, k.cloudA * 1.3)));
    if (k.sun) { var d = Math.abs(y - k.sun.y) / 0.36, f = d < 0.1 ? 0.7 - 3.4 * d : d < 0.38 ? 0.36 - 0.25 * (d - 0.1) / 0.28 : d < 1 ? 0.11 * (1 - (d - 0.38) / 0.62) : 0; if (f * k.sun.a > 0.02) o.push(over(b, [255, 226, 156], f * k.sun.a)); } }); return o; }
  function solve(v, tone, acct, base, need) { need = need || [NEED.ink, NEED.mute, NEED.acc]; var a = base == null ? BASE[tone] : base, r, test = function (al) { var x = [99, 99, 99]; v.forEach(function (bg) { var gl = over(bg, TINT[tone], al); x[0] = Math.min(x[0], ratio(INK[tone], gl)); x[1] = Math.min(x[1], ratio(MUTE[tone], gl)); x[2] = Math.min(x[2], ratio(acct, gl)); }); return x; };
    for (; a < 0.92; a += 0.02) { r = test(a); if (r[0] >= need[0] && r[1] >= need[1] && r[2] >= need[2]) break; } a = Math.min(a, 0.92); return { tone: tone, a: a, r: test(a) }; }
  function guard(k, m) {
    var shab = isShabbat(m), acct = function (t) { return shab ? (t === 'light' ? INK.light : GOLD) : ACCT[S.p][t]; }, pref = k.plain ? 'dark' : lum(bgAt(k, 0.5)) > 0.22 ? 'light' : 'dark', other = pref === 'light' ? 'dark' : 'light';
    function zone(ys, base, need) { var v = variants(k, ys), z = solve(v, pref, acct(pref), base, need), y; if (z.a > 0.86) { y = solve(v, other, acct(other), base, need); if (y.a < z.a) z = y; }
      var sk = [[255, 255, 255], [0, 0, 0]].map(function (c) { return Math.min.apply(null, v.map(function (x) { return ratio(c, x); })); }); z.sink = sk[0] >= sk[1] ? '#fff' : '#000'; z.rs = Math.max(sk[0], sk[1]); return z; }
    var z = { top: zone([0.04, 0.11]), dial: zone([0.2, 0.4, 0.6]), rail: zone([0.69, 0.76]), bar: zone([0.9, 0.96]), pane: zone([0.06, 0.3, 0.6, 0.93]), watch: zone([0.12, 0.2, 0.5, 0.8]), sb: zone([0.03, 0.06], 0, [4.5, 0, 0]) }, min = { ink: 99, mute: 99, acc: 99, sky: 99 };
    Object.keys(z).forEach(function (n) { if (n === 'sb') return; min.ink = Math.min(min.ink, z[n].r[0]); min.mute = Math.min(min.mute, z[n].r[1]); min.acc = Math.min(min.acc, z[n].r[2]); }); min.sky = z.sb.r[0];
    return { pref: pref, z: z, min: min };
  }
  function setZone(e, z, shab) { if (!e) return; e.dataset.tone = z.tone; e.style.setProperty('--s', 'rgba(' + TINT[z.tone].join(',') + ',' + z.a.toFixed(2) + ')'); e.style.setProperty('--sink', z.sink);
    e.style.setProperty('--acct', shab ? (z.tone === 'light' ? 'var(--ink)' : rgb(GOLD)) : rgb(ACCT[S.p][z.tone])); }
  function clearZone(e) { if (!e) return; delete e.dataset.tone; ['--s', '--sink', '--acct'].forEach(function (p) { e.style.removeProperty(p); }); }
  /** Le même contrôle sur toute une journée, par tous les temps : c'est la jauge que le propriétaire a demandée. */
  function audit() { var keep = S.wx, w = T.wall(S.now, tz()), out = { n: 0, ink: 99, mute: 99, acc: 99, sky: 99, bad: 0 };
    [0, 0.45, 0.9, 'rain', 'storm'].forEach(function (wx) { S.wx = wx; for (var mn = 0; mn < 1440; mn += 5) { var m = T.compute(S.p, T.fromWall(w.y, w.m, w.d, mn / 60, tz()), cfg()), g = guard(skyModel(m), m).min; out.n++;
      ['ink', 'mute', 'acc', 'sky'].forEach(function (q) { out[q] = Math.min(out[q], g[q]); }); if (g.ink < NEED.ink || g.mute < NEED.mute || g.acc < NEED.acc || g.sky < NEED.mute) out.bad++; } });
    S.wx = keep; return out; }
  function moonSVG(m) { return '<svg viewBox="0 0 24 24"><defs><radialGradient id="mgd" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#CBD3E4"/></radialGradient></defs><circle cx="12" cy="12" r="11" fill="currentColor" opacity=".12"/><path d="' + D2Sky.moonPath(12, 12, 11, m.moon) + '" fill="url(#mgd)"/></svg>'; }

  /* ---------- le cadran ----------
   * Rond sur le téléphone. Sur la montre, une superellipse qui épouse le boîtier : tout l'écran sert,
   * et l'ANGLE reste le paramètre, comme pour la face carrée du brevet. */
  var HOURS = { he: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב'], ar: ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١', '١٢'] };
  var GEO = {
    full: { w: 320, h: 320, cx: 160, cy: 160, a: 146, b: 146, n: 2, rw: 10, ia: 118, ib: 118, iw: 16, step: 1.5 },
    watch: { w: 212, h: 258, cx: 106, cy: 129, a: 96, b: 119, n: 4.4, rw: 9, ia: 80, ib: 103, iw: 13, step: 3 },
    mini: { w: 320, h: 320, cx: 160, cy: 160, a: 138, b: 138, n: 2, rw: 28, ia: 86, ib: 86, iw: 34, step: 6 },
    thin: { w: 320, h: 320, cx: 160, cy: 160, a: 148, b: 148, n: 2, rw: 5, ia: 134, ib: 134, iw: 7, step: 1.5 }
  };
  function pt(g, deg, d) { var t = deg * Math.PI / 180, s = Math.sin(t), c = -Math.cos(t), a = g.a + d, b = g.b + d, r = Math.pow(Math.pow(Math.abs(s) / a, g.n) + Math.pow(Math.abs(c) / b, g.n), -1 / g.n); return [g.cx + r * s, g.cy + r * c]; }
  function line(g, a0, a1, d) { var o = [], x; if (a1 < a0) a1 = a0; for (x = a0; x < a1; x += g.step) o.push(pt(g, x, d)); o.push(pt(g, a1, d));
    return 'M' + o.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L'); }
  function seg(g, a, d0, d1, col, w) { var p = pt(g, a, d0), q = pt(g, a, d1); return '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>'; }
  var ringCache = {};
  function ring(m) { var k = m.product.id + m.city.tz + m.city.lat + (+m.cycle.start); if (!ringCache[k]) { var a = [], len = m.cycle.end - m.cycle.start, i; for (i = 0; i < 120; i++) a.push(T.skyCSS(T.sunAlt(new Date(+m.cycle.start + (i + 0.5) / 120 * len), m.city.lat, m.city.lng))); ringCache[k] = a; } return ringCache[k]; }
  function dialSVG(m, key, mono) {
    var g = key === 'full' && S.face === 'pashut' && !mono ? GEO.thin : GEO[key], o = [], now = m.frac * 360 * (mono ? 1 : S.intro), w0 = m.angle(m.window.start), w1 = m.angle(m.window.end), cols = ring(m), i, n = Math.floor(now / 3), di = g.ia - g.a, P = function (d, s, sw, cap) { return '<path d="' + d + '" fill="none" stroke="' + s + '" stroke-width="' + sw + '"' + (cap ? ' stroke-linecap="round" stroke-linejoin="round"' : '') + '/>'; };
    // l'anneau : le cycle qui se consomme, coloré par la lumière réelle de chaque instant
    o.push(P(line(g, 0, 360, 0) + 'Z', 'var(--track)', g.rw));
    if (mono) o.push(P(line(g, 0, Math.max(now, 1), 0), 'var(--mute)', g.rw));
    else { o.push('<g class="ringg">'); for (i = 0; i < n; i++) o.push(P(line(g, i * 3, i * 3 + 3.5, 0), cols[i], g.rw)); if (now > n * 3) o.push(P(line(g, n * 3, now, 0), cols[Math.min(n, 119)], g.rw)); o.push('</g>'); }
    if (key !== 'mini' && S.face !== 'pashut') m.cycle.windows.forEach(function (w, j) { if (j) o.push(seg(g, m.angle(w.start), -g.rw / 2 - 4, -g.rw / 2 - 8, 'var(--mute)', 1.6)); });
    if (key === 'full' && S.face === 'otiot' && !mono) {
      // les heures du cycle, à l'intérieur du cadran : douze heures zmaniot, la lettre de l'heure en cours mise en avant
      var cur = Math.min(12, Math.floor(m.frac * 12) + 1), hl = S.p === 'kairos' ? null : HOURS[m.product.lang];
      for (i = 1; i <= 12; i++) { var q = pt(g, i * 30, -55), tx = hl ? hl[i - 1] : String(Math.round(T.wall(new Date(+m.cycle.start + i / 12 * (m.cycle.end - m.cycle.start)), m.city.tz).h) % 24);
        o.push('<text class="hr' + (i === cur ? ' on' : i < cur ? ' past' : '') + '" x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="central">' + tx + '</text>'); }
    } else if (key === 'full' && S.face !== 'pashut') {
      for (i = 1; i < 12; i++) { var d = pt(g, i * 30, -49); o.push('<circle cx="' + d[0].toFixed(1) + '" cy="' + d[1].toFixed(1) + '" r="1.4" fill="var(--mute)" opacity=".6"/>'); }
    }
    // l'arc intérieur : uniquement la fenêtre en cours ; sa partie colorée est le temps restant
    o.push(P(line(g, w0, w1, di), 'var(--s2)', g.iw, 1));
    o.push('<g class="rest">' + P(line(g, Math.min(Math.max(now, w0), w1 - 0.6), w1, di), mono ? 'var(--ink)' : 'var(--acc)', g.iw, 1) + '</g>');
    if (key !== 'mini') o.push(seg(g, w1, di - g.iw / 2 - 4, di + g.iw / 2 + 4, 'var(--ink)', 2.6));
    // l'encoche du haut : l'ancre du cycle
    o.push(seg(g, 0, -g.rw / 2 - (key === 'mini' ? 2 : 5), g.rw / 2 + (key === 'mini' ? 2 : 5), 'var(--ink)', key === 'mini' ? 9 : 3.2));
    // l'astre du moment : un soleil avec son halo, une lune avec sa phase — jamais un simple point
    if (!mono) { var c = pt(g, now, 0), r = key === 'mini' ? 16 : Math.max(9, g.rw * 1.05), cx = c[0].toFixed(1), cy = c[1].toFixed(1), id = key + S.p;
      if (m.isNight) o.push('<defs><radialGradient id="mh' + id + '"><stop offset="0" stop-color="#DCE5FF" stop-opacity=".55"/><stop offset="1" stop-color="#DCE5FF" stop-opacity="0"/></radialGradient><radialGradient id="mb' + id + '" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#C9D1E3"/></radialGradient></defs>' +
        '<circle class="halo" cx="' + cx + '" cy="' + cy + '" r="' + (r * 2.6).toFixed(1) + '" fill="url(#mh' + id + ')"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#AEB9D6" opacity=".2"/><path d="' + D2Sky.moonPath(+cx, +cy, r, m.moon) + '" fill="url(#mb' + id + ')"/>');
      else o.push('<defs><radialGradient id="sh' + id + '"><stop offset="0" stop-color="#FFE08A" stop-opacity=".8"/><stop offset=".45" stop-color="#FFC95A" stop-opacity=".3"/><stop offset="1" stop-color="#FFC95A" stop-opacity="0"/></radialGradient><radialGradient id="sb' + id + '"><stop offset="0" stop-color="#FFFDF0"/><stop offset=".55" stop-color="#FFE585"/><stop offset="1" stop-color="#FFB53E"/></radialGradient></defs>' +
        '<circle class="halo" cx="' + cx + '" cy="' + cy + '" r="' + (r * 3).toFixed(1) + '" fill="url(#sh' + id + ')"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#sb' + id + ')"/>'); }
    return '<svg class="dial" viewBox="0 0 ' + g.w + ' ' + g.h + '" role="img" aria-label="' + esc(remText(m.remaining) + ' ' + win(m.window).what) + '">' + o.join('') + '</svg>';
  }
  /* La boussole : la rose tourne avec l'appareil, le Temple (ou la Kaaba), le soleil et la lune y sont à leur place réelle. */
  function compassSVG(m) {
    var g = GEO.full, o = [P0('<defs><linearGradient id="cmg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE9A8"/><stop offset="1" stop-color="#F2B02E"/></linearGradient></defs><circle cx="160" cy="160" r="146" fill="none" stroke="var(--track)" stroke-width="10"/>')], i, rose = [];
    function P0(x) { return x; }
    for (i = 0; i < 72; i++) rose.push(seg(g, i * 5, -18, i % 6 ? -23 : -28, 'var(--mute)', i % 18 ? 1.2 : 2.4));
    L().card.forEach(function (t, j) { var q = pt(g, j * 90, -48); rose.push('<text x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="600" fill="' + (j ? 'var(--mute)' : 'var(--ink)') + '" font-family="inherit" transform="rotate(' + (j * 90) + ' ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')">' + t + '</text>'); });
    function mark(az, body) { return '<g transform="rotate(' + az.toFixed(1) + ' 160 160)">' + body + '</g>'; }
    if (m.sky.sun.alt > -6) rose.push(mark(m.sky.sun.az, '<circle cx="160" cy="14" r="9" fill="#FFD76A" stroke="#F0A93B" stroke-width="1.4"/>'));
    if (m.sky.moon.alt > -6) rose.push(mark(m.sky.moon.az, '<circle cx="160" cy="14" r="8" fill="#F1F3F8" stroke="#8D97AD" stroke-width="1.2"/>'));
    rose.push(mark(m.bearing, '<circle cx="160" cy="16" r="21" fill="url(#cmg)"/><g transform="translate(142.5 -1.5) scale(1.46)" style="color:#3A2800">' + (S.p === 'hatadhar' ? I.raw('temple') : '<path fill="currentColor" d="M6.5 6.5h11v12h-11zM6.5 9.6h11v1.5h-11z" fill-rule="evenodd"/>') + '</g>'));
    o.push('<g class="rose" style="transform:rotate(' + (-S.heading).toFixed(1) + 'deg)">' + rose.join('') + '</g>');
    o.push('<path d="M160 44l-8 -16h16z" fill="var(--acc)"/>');
    return '<svg class="dial" viewBox="0 0 320 320" aria-hidden="true">' + o.join('') + '</svg>';
  }
  function centerHTML(mono) { return '<div class="center">' + (mono ? '' : '<span class="shabcap" data-t="shabcap"></span><span class="cic" data-ic="win"></span>') + '<strong data-h="big"></strong><b class="what" data-t="what"></b>' + (mono ? '' : '<small data-t="untilT"></small>') + '</div>'; }
  function dialBox(key, flippable, side, mono) {
    var back = flippable ? '<div class="face back"><div data-cmp></div><div class="cmp-c"><strong data-t="bear"></strong><b data-t="target"></b><small data-t="dist"></small><small data-t="salt"></small></div></div>' : '';
    return '<div class="dialbox" data-dial="' + key + '"' + (mono ? ' data-mono="1"' : '') + ' data-side="' + (side || 'front') + '">' + (mono || key === 'mini' ? '' : '<i class="glass"></i>') + '<div class="flip"><div class="face">' +
      (flippable ? '<button class="dialbtn" data-act="flip" aria-label="' + esc(L().dir) + '">' : '<div class="dialbtn">') + '<span data-svg></span>' + (flippable ? '</button>' : '</div>') + (key === 'mini' ? '' : centerHTML(mono)) + '</div>' + back + '</div></div>';
  }

  /* ---------- téléphone ---------- */
  function tabs() { var icons = ['clock', 'list', 'cal', 'bell', 'user'], l = L();
    return '<nav class="tb" role="tablist"><i class="blob"></i>' + icons.map(function (n, i) { return l.tabs[i] ? '<button role="tab" aria-selected="false" data-act="tab" data-i="' + i + '">' + ic(n) + '<span>' + l.tabs[i] + '</span></button>' : ''; }).join('') + '</nav>'; }
  function sw(key, on) { return '<button class="sw" role="switch" aria-checked="' + on + '" data-act="sw" data-k="' + esc(key) + '" aria-label="' + esc(key) + '"></button>'; }
  function isOn(key, def) { var k = S.p + key; return S.off[k] == null ? def : S.off[k]; }
  function scrDial() {
    return '<div class="row between"><button class="pill" data-act="tab" data-i="4">' + ic('pin') + '<span data-t="city"></span></button><span class="pill ghost" data-t="date"></span></div>' +
      '<div class="dialwrap">' + (M.target ? '<button class="fbtn" data-act="flip" aria-label="' + esc(L().dir) + '" data-fbtn></button>' : '') + dialBox('full', !!M.target, S.side) +
      (M.target ? '<div class="pg" data-pg><button data-act="flipto" data-s="front" aria-label="' + esc(L().tabs[0]) + '"><i></i></button><button data-act="flipto" data-s="back" aria-label="' + esc(L().dir) + '"><i></i></button></div>' : '') + '</div>' +
      '<div class="next" data-list="next"></div>';
  }
  function scrLouah() {
    // Les flèches pointent vers l'extérieur : en hébreu et en arabe, le jour suivant est à gauche.
    var nav = { he: ['היום הקודם', 'היום הבא'], ar: ['اليوم السابق', 'اليوم التالي'], fr: ['Jour précédent', 'Jour suivant'] }[P().lang];
    return '<div class="daynav"><button data-act="day" data-d="-1" aria-label="' + nav[0] + '">' + ic('chev', 'mir flipx') + '</button><div style="text-align:center"><div class="h1 dayline" style="margin:0" data-t="dayline"></div><div class="meta greg" data-h="greg"></div></div>' +
      '<button data-act="day" data-d="1" aria-label="' + nav[1] + '">' + ic('chev', 'mir') + '</button></div><div data-h="mooncard"></div><ul class="list glassy" data-list="louah"></ul><p class="meta" style="margin-top:14px" data-t="shita"></p><p class="meta">' + L().note + '</p>';
  }
  function scrCal() {
    if (S.p !== 'hatadhar') return '<div class="h1">' + L().week + '</div><p class="meta" data-t="date"></p><div class="wk" data-list="week"></div>';
    var z = tz(), today = calNoon(dayInstant(M)), sel = S.calSel || today, seg = function (v, s) { return '<button data-act="calview" data-v="' + v + '" aria-pressed="' + (S.calView === v) + '">' + s + '</button>'; },
        head = '<div class="calhead"><div class="seg2" role="group">' + seg('day', 'יום') + seg('week', 'שבוע') + seg('month', 'חודש') + '</div><button class="fab" data-act="addev" aria-label="הוספת אירוע">' + ic('plus') + '</button></div>';
    if (S.calView === 'week') return head + '<div class="wk" data-list="week"></div>';
    if (S.calView === 'day') return head + dayView(sel, z);
    var mo = hmonth(S.calMon || sel, z), gm = function (d, o) { o.timeZone = z; return new Intl.DateTimeFormat('he-u-ca-gregory-nu-latn', o).format(d); }, d0 = mo.days[0], d1 = mo.days[mo.days.length - 1], ga = gm(d0.date, { month: 'long' }), gb = gm(d1.date, { month: 'long' }), i,
        h = head + '<div class="mnav"><button data-act="mon" data-d="-1" aria-label="החודש הקודם">' + ic('chev', 'mir flipx') + '</button><div><b>' + HMON[mo.m] + ' ' + gem(mo.y % 1000) + '</b><small>' + (ga === gb ? ga : ga + ' – ' + gb) + ' ' + gm(d1.date, { year: 'numeric' }) + '</small></div><button data-act="mon" data-d="1" aria-label="החודש הבא">' + ic('chev', 'mir') + '</button></div><div class="mgrid">' +
          ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map(function (x) { return '<span class="dow">' + x + '</span>'; }).join('');
    for (i = 0; i < d0.w.dow; i++) h += '<span></span>';
    mo.days.forEach(function (d) { var ev = dayEvents(d, z); h += '<button class="mday' + (+d.date === +today ? ' today' : '') + (+d.date === +sel ? ' sel' : '') + (d.w.dow === 6 ? ' shab' : '') + '" data-act="calsel" data-t0="' + (+d.date) + '" aria-label="' + hebDate(d.date, z) + '"><b>' + gem(d.h.d).replace(/[׳״]/g, '') + '</b><small>' + d.w.d + '</small><i>' + (ev.hol.length ? '<u></u>' : '') + (ev.mine.length ? '<u class="mine"></u>' : '') + '</i></button>'; });
    return h + '</div>' + agenda(sel, z);
  }
  /* La journée, comme dans un agenda : ce qu'elle est, mes événements, puis toutes ses heures. */
  function dayView(d, z) {
    var x = T.compute(S.p, d, cfg()), t2 = x.today, ev = dayEvents({ date: d, h: hparts(d, z) }, z), prev = T.compute(S.p, new Date(+d - 864e5), cfg()).today, sum = [],
        row = function (icn, a, b, tm, cls) { return '<div class="srow' + (cls || '') + '"><span class="sico">' + ic(icn) + '</span><span class="slab"><b>' + a + '</b>' + (b ? '<small>' + b + '</small>' : '') + '</span>' + (tm ? '<time>' + tm + '</time>' : '') + '</div>'; };
    ev.hol.forEach(function (n) { sum.push(row('cal', n)); });
    if (t2.dow === 5) sum.push(row('candles', 'ערב שבת', 'הדלקת נרות', hm(t2.candles, z)));
    if (t2.dow === 6) sum.push(row('havdala', 'שבת קודש', 'צאת השבת', hm(t2.tzet, z)));
    if (!sum.length) sum.push(row('sun', 'יום חול'));
    sum.push(row('night', phaseName(x), levana(x).text));
    return '<div class="mnav"><button data-act="calday" data-d="-1" aria-label="היום הקודם">' + ic('chev', 'mir flipx') + '</button><div><b>' + wdText(x, d) + ' · ' + hebDate(d, z) + '</b><small>' + new Intl.DateTimeFormat('he-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: z }).format(d) + '</small></div><button data-act="calday" data-d="1" aria-label="היום הבא">' + ic('chev', 'mir') + '</button></div>' +
      '<p class="lbl">היום בקצרה</p><div class="sgroup">' + sum.join('') + '</div><p class="lbl">האירועים שלי</p>' +
      (ev.mine.length ? '<div class="sgroup mine">' + ev.mine.map(function (e) { return row(e.type === 'azkara' ? 'flame' : e.type === 'bday' ? 'gift' : 'bell', EVT[e.type] + ' · ' + esc(e.name), remText2(e, prev, z)); }).join('') + '</div>' : '') +
      '<button class="addrow" data-act="addev">' + ic('plus') + '<span>הוספת יום הולדת, אזכרה או אירוע</span></button>' +
      '<p class="lbl">זמני היום</p><div class="sgroup tl">' + x.list.map(function (r) { return '<div class="srow">' + rowIc(r[0]) + '<span class="slab">' + esc(r[0]) + '</span><time>' + hm(r[1], z) + '</time></div>'; }).join('') + '</div>';
  }
  function remText2(e, prevT, z) { return e.remind === 'eve' ? 'התראה בערב שלפני, בצאת הכוכבים · ' + hm(prevT.tzet, z) : e.remind === 'morning' ? 'התראה בבוקר היום' : 'התראה שבוע לפני, בערב'; }
  function agenda(d, z) {
    var ev = dayEvents({ date: d, h: hparts(d, z) }, z), x = T.compute(S.p, d, cfg()), t2 = x.today, prev = T.compute(S.p, new Date(+d - 864e5), cfg()).today, rows = '',
        key = t2.dow === 5 ? ['הדלקת נרות', t2.candles] : t2.dow === 6 ? ['צאת השבת', t2.tzet] : ['שקיעה', t2.shkia];
    ev.hol.forEach(function (n) { rows += '<li><span class="ri">' + ic('cal') + '</span><span>' + n + '</span></li>'; });
    ev.mine.forEach(function (e) { rows += '<li class="mine"><span class="ri">' + ic(e.type === 'azkara' ? 'flame' : e.type === 'bday' ? 'gift' : 'bell') + '</span><span><b>' + EVT[e.type] + ' · ' + esc(e.name) + '</b><small>' + remText2(e, prev, z) + '</small></span>' + (e.demo ? '<em>דוגמה</em>' : '') + '</li>'; });
    rows += '<li>' + rowIc(key[0]) + '<span>' + key[0] + '</span><time>' + hm(key[1], z) + '</time></li>';
    return '<div class="agenda"><div class="aghead"><b>' + wdText(x, d) + ' · ' + hebDate(d, z) + '</b><small>' + new Intl.DateTimeFormat('he-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: z }).format(d) + '</small></div><ul class="list glassy">' + rows + '</ul><button class="linkbtn" data-act="calview" data-v="day">' + ic('list') + '<span>כל היום</span></button>' +
      '<button class="addrow" data-act="addev">' + ic('plus') + '<span>הוספת יום הולדת, אזכרה או אירוע</span></button></div>';
  }
  function scrAlerts() { return '<div class="h1">' + L().alerts + '</div><div class="sgroup alg" data-list="alerts"></div>'; }
  function alertRows(m) {
    var z = m.city.tz, t = m.today, k = m.marks, mn = T.MIN;
    if (S.p === 'hatadhar') return [['סוף זמן קריאת שמע', '30 דק׳ לפני · היום ' + hm(new Date(t.sofShema - 30 * mn), z), 1, 'scroll'], ['מנחה', '20 דק׳ לפני השקיעה · היום ' + hm(new Date(t.shkia - 20 * mn), z), 1, 'sunlow'],
      ['הדלקת נרות', '40 דק׳ לפני · ערב שבת', 1, 'candles'], ['ברכת הלבנה', 'בלילה הראשון שאפשר, לפי הנוסח', 1, 'night'], ['ימי הולדת ואזכרות', 'בערב, עם כניסת התאריך העברי', 1, 'gift'], ['ספירת העומר', 'אחרי צאת הכוכבים · בין פסח לשבועות', 0, 'cal'], ['נגיעה בהתראה פותחת את התפילה', 'מנחה, ערבית, הדלקת נרות…', 1, 'book'], ['רטט בשעון בלבד', 'ללא צליל · בשבת ובחג הכול שקט', 1, 'bell']];
    if (S.p === 'awqat') return [['الفجر', 'أذان · ' + hm(t.fajr, z), 1, 'dawn'], ['الظهر', 'أذان · ' + hm(t.dhuhr, z), 1, 'sun'], ['العصر', 'أذان · ' + hm(t.asr, z), 1, 'sunlow'], ['المغرب', 'أذان · ' + hm(t.maghrib, z), 1, 'sunset'], ['العشاء', 'أذان · ' + hm(t.isha, z), 1, 'night'],
      ['قبل خروج الوقت', 'تنبيه قبل 15 د من نهاية وقت كل صلاة', 1, 'bell'], ['اهتزاز الساعة فقط', 'بلا صوت · مناسب للعمل والمسجد', 0, 'bell']];
    return [['Lumière du matin', 'Sortir avant ' + hm(k.lumiere, z), 1, 'sunrise'], ['Dernière caféine', hm(k.cafeine, z), 1, 'cup'], ['Sieste possible', 'Pendant le creux · 20 min', 0, 'bed'], ['Écrans en veilleuse', hm(k.ecrans, z), 1, 'moon'], ['Coucher', hm(k.coucher, z), 1, 'bed']];
  }
  function choice(key, opts, cur) { return '<div class="choice">' + opts.map(function (o) { return '<button data-act="set" data-k="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  var FACES = { he: ['שמיים', 'שעות זמניות', 'נקי', 'לילה'], ar: ['السماء', 'الساعات', 'بسيط', 'الليل'], fr: ['Ciel vivant', 'Heures', 'Épuré', 'Nuit'] }, FACE_ID = ['sky', 'otiot', 'pashut', 'layla'];
  function OPTS(key) { var lang = P().lang;
    if (key === 'city') return { t: L().city, ic: 'pin', list: P().cities.map(function (id) { return [id, T.CITIES[id][lang]]; }) };
    if (key === 'rite') return { t: 'נוסח', ic: 'book', list: [['edot', 'עדות המזרח', 'ברכת הלבנה מז׳ בחודש'], ['sfard', 'ספרד', 'ברכת הלבנה מז׳ בחודש'], ['ashkenaz', 'אשכנז', 'ברכת הלבנה מג׳ בחודש']] };
    if (key === 'opinion') return { t: 'שיטה · סוף זמן קריאת שמע', ic: 'scroll', list: [['gra', 'הגר״א', 'היום נמדד מהנץ החמה עד השקיעה'], ['mga', 'מגן אברהם', 'היום נמדד מעלות השחר עד צאת הכוכבים']] };
    if (key === 'method') return { t: 'طريقة الحساب', ic: 'compass', list: Object.keys(T.METHODS).map(function (k) { return [k, T.METHODS[k].ar]; }) };
    if (key === 'asr') return { t: 'وقت العصر', ic: 'sunlow', list: [['shafii', 'الشافعي · المالكي · الحنبلي'], ['hanafi', 'الحنفي']] };
    return { t: 'Votre réveil habituel', ic: 'sunrise', list: [[6, '6 h', 'Plutôt matinal'], [7, '7 h'], [8.5, '8 h 30', 'Plutôt tardif']] }; }
  function scrMe() {
    var c = cfg(), l = L(), lang = P().lang, keep = S.face, val = function (key) { var o = OPTS(key).list.filter(function (x) { return String(x[0]) === String(c[key]); })[0]; return o ? o[1] : ''; },
        row = function (key, label) { return '<button class="srow" data-act="pick" data-k="' + key + '"><span class="sico">' + ic(OPTS(key).ic) + '</span><span class="slab">' + label + '</span><span class="sval">' + val(key) + '</span>' + ic('chev', 'mir') + '</button>'; },
        h = '<div class="h1">' + l.me + '</div><p class="lbl">' + { he: 'עיצוב השעון', ar: 'شكل الساعة', fr: 'Modèle de cadran' }[lang] + '</p><div class="fthumbs">';
    FACE_ID.forEach(function (id, i) { S.face = id; h += '<button class="fthumb" data-face="' + id + '" aria-pressed="' + (keep === id) + '"><span class="fprev"' + (id === 'layla' ? ' data-tone="dark"' : '') + '>' + dialSVG(M, 'full') + '</span><span>' + FACES[lang][i] + '</span></button>'; }); S.face = keep;
    h += '</div><p class="lbl">' + { he: 'ההגדרות שלי', ar: 'إعداداتي', fr: 'Mes réglages' }[lang] + '</p><div class="sgroup">' + row('city', l.city) +
      (S.p === 'hatadhar' ? row('rite', 'נוסח') + row('opinion', 'שיטה') : S.p === 'awqat' ? row('method', 'طريقة الحساب') + row('asr', 'وقت العصر') : row('wake', 'Réveil habituel')) + '</div>' +
      '<div class="sgroup"><button class="srow" data-act="tab" data-i="' + (l.tabs[3] ? 3 : 2) + '"><span class="sico">' + ic('bell') + '</span><span class="slab">' + l.alerts + '</span>' + ic('chev', 'mir') + '</button>' +
      (S.p === 'hatadhar' ? '<button class="srow" data-act="tab" data-i="2"><span class="sico">' + ic('gift') + '</span><span class="slab">ימי הולדת ואזכרות</span><span class="sval">' + S.events.length + '</span>' + ic('chev', 'mir') + '</button>' : '') + '</div>';
    if (S.p === 'hatadhar') h += '<div class="card"><h4>תמיכה בפרויקט</h4><p>האפליקציה חינמית, בלי פרסומות. אפשר לתרום, או להקדיש יום לעילוי נשמת או לרפואה שלמה.</p><button class="cta">הקדשת יום</button></div>';
    if (S.p === 'awqat') h += '<div class="card"><h4>النسخة الكاملة</h4><p>شراء واحد مدى الحياة. بلا إعلانات وبلا اشتراك. موقعك لا يغادر هاتفك.</p><button class="cta">عرض النسخة الكاملة</button></div>';
    if (S.p === 'kairos') h += '<div class="card"><h4>Essai de 7 jours</h4><p>Vous le démarrez vous-même. Rien n’est prélevé à la fin.</p><ol class="steps"><li>Aujourd’hui<small>Tout est ouvert, sans carte bancaire.</small></li><li>Jour 5<small>Un rappel, une seule fois.</small></li><li>Jour 7<small>L’essai s’arrête. Vous choisissez : 4,99 € par mois ou 34,99 € par an.</small></li></ol><button class="cta">Démarrer l’essai</button></div>';
    return h;
  }
  /* Le tfilon contextuel : la prière du moment, ouverte d'un geste. */
  /* Deux textes complets, chargés à la source (Sefaria, « Miqra selon la Massora ») plutôt qu'écrits de mémoire.
   * Les signes de cantillation sont retirés ; le Nom est rendu comme dans les sidourim. */
  var TEXTS = { shema: { t: 'קריאת שמע', refs: ['Deuteronomy.6.4-9', 'Deuteronomy.11.13-21', 'Numbers.15.37-41'], after: 'בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.' }, ashrei: { t: 'אשרי', refs: ['Psalms.84.5', 'Psalms.144.15', 'Psalms.145', 'Psalms.115.18'] } }, tcache = {};
  function cleanHe(s) { return String(s).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\{[פס]\}/g, '').replace(/[֑-ֽ֯׀]/g, '').replace(/׃/g, '.')
    .replace(/י[ְ-ׇּׁׂ]*ה[ְ-ׇּׁׂ]*ו[ְ-ׇּׁׂ]*ה(?![ְ-ׇא-ת])/g, 'יְיָ').replace(/\s+/g, ' ').trim(); }
  function loadText(id) { var x = TEXTS[id]; if (tcache[id]) return Promise.resolve(tcache[id]);
    return Promise.all(x.refs.map(function (r) { return fetch('https://www.sefaria.org/api/texts/' + r + '?context=0&commentary=0').then(function (q) { return q.json(); }).then(function (d) { return [].concat(d.he).map(cleanHe); }); }))
      .then(function (parts) { if (x.after) parts[0].splice(1, 0, x.after); return (tcache[id] = parts); }); }
  function textHTML(id) { return tcache[id].map(function (vs) { return '<p>' + vs.map(esc).join(' ') + '</p>'; }).join(''); }
  function sheetHTML() {
    var frame = function (title, icn, sub, body) { return '<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-label="' + esc(title) + '"><div class="row between"><div class="row"><span class="sic">' + ic(icn) + '</span><div><b class="st">' + title + '</b><small class="meta">' + sub + '</small></div></div><button class="xbtn" data-act="close" aria-label="' + esc(L().dir) + '">' + ic('x') + '</button></div>' + body + '</div>'; },
        opt = function (act, k, v, on, lab, sub) { return '<button class="opt" data-act="' + act + '" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + on + '"><span><b>' + lab + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><i class="radio"></i></button>'; };
    if (S.sheet && S.sheet.indexOf('pick:') === 0) { var pk = S.sheet.slice(5), po = OPTS(pk); return frame(po.t, po.ic, '', '<div class="opts">' + po.list.map(function (x) { return opt('set', pk, x[0], String(cfg()[pk]) === String(x[0]), x[1], x[2]); }).join('') + '</div>'); }
    if (S.sheet === 'addev') { var az = tz(), ad = S.calSel || calNoon(dayInstant(M)), dr = S.draft;
      return frame('הוספה ליומן', dr.type === 'azkara' ? 'flame' : dr.type === 'bday' ? 'gift' : 'bell', hebDate(ad, az, 1), '<p class="lbl">סוג</p><div class="seg2 wide">' + Object.keys(EVT).map(function (k) { return '<button data-act="draft" data-k="type" data-v="' + k + '" aria-pressed="' + (dr.type === k) + '">' + EVT[k] + '</button>'; }).join('') + '</div>' +
        '<p class="lbl">שם</p><input class="inp" data-draft="name" value="' + esc(dr.name) + '" maxlength="40" aria-label="שם" autocomplete="off">' +
        '<div class="card flat"><div class="row"><span class="ri">' + ic('cal') + '</span><div><b>' + hebDate(ad, az) + '</b><small class="meta">חוזר כל שנה, לפי התאריך העברי</small></div></div></div>' +
        '<p class="lbl">התראה</p><div class="opts">' + REMS.map(function (r) { return opt('draft', 'remind', r[0], dr.remind === r[0], r[1], r[0] === 'eve' ? 'היום העברי מתחיל בלילה: ההתראה מגיעה בצאת הכוכבים' : ''); }).join('') + '</div><button class="cta" data-act="evsave">שמירה</button>'); }
    var p = I.PRAY[S.sheet]; if (!p) return '';
    var rite = { edot: 'נוסח עדות המזרח', sfard: 'נוסח ספרד', ashkenaz: 'נוסח אשכנז' }[cfg().rite], tid = S.text || (S.sheet === 'shema' ? 'shema' : null), body;
    if (tid) body = (S.text ? '<button class="backrow" data-act="untext">' + ic('chev', 'mir flipx') + '<span>' + p.t + '</span></button>' : '') + '<div class="ptext long" data-text="' + tid + '">' + (tcache[tid] ? textHTML(tid) : '<span class="meta">טוען…</span>') + '</div><p class="meta src">הנוסח: מקרא על פי המסורה (ויקיטקסט, CC BY-SA), דרך ספריא.</p>';
    else body = (p.text ? '<p class="ptext">' + p.text + '</p>' : '') +
      (p.rows.length ? '<ol class="prows">' + p.rows.map(function (r) { var am = r === 'עמידה', as = r === 'אשרי'; return '<li><button' + (am ? ' data-act="amida"' : as ? ' data-act="text" data-x="ashrei"' : '') + '><span>' + r + '</span>' + (am ? '<small>' + ic('temple') + 'לכיוון בית המקדש</small>' : ic('chev', 'mir')) + '</button></li>'; }).join('') + '</ol>' : '') +
      (p.shabbat ? '<div class="al" style="border:0"><div><b>מצב שבת בשעון</b><small>ללא צליל, ללא רטט, אין צורך לגעת</small></div><button class="sw" role="switch" aria-checked="' + S.shabbatOn + '" data-act="shabbat" aria-label="מצב שבת"></button></div>' : '') +
      '<p class="meta" style="margin-top:10px">קריאת שמע ואשרי מוצגים במלואם. שאר התפילות יגיעו ממקור מאושר, לפי הנוסח שנבחר.</p>';
    return '<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-label="' + esc(p.t) + '"><div class="row between"><div class="row"><span class="sic">' + ic(p.ic) + '</span><div><b class="st">' + (S.text ? TEXTS[S.text].t : p.t) + '</b><small class="meta">' + rite + '</small></div></div><button class="xbtn" data-act="close" aria-label="סגירה">' + ic('x') + '</button></div>' + body + '</div>' +
      (S.flash ? '<div class="flash"><div class="fl-in">' + ic('temple') + '<b>לכיוון בית המקדש</b><small>' + Math.round(M.bearing) + '° · ' + Math.round(M.distance).toLocaleString('fr-FR') + ' ' + L().km + '</small></div></div>' : '');
  }
  /* La coque du téléphone reste en place : seul l'écran change, et la goutte de la barre du bas glisse d'un onglet à l'autre. */
  function moveBlob(ph, anim) { var tb = $('.tb', ph), b = tb && $('.blob', tb), on = tb && $('[aria-selected=true]', tb); if (!on) return;
    var from = { l: b.offsetLeft, w: b.offsetWidth }, to = { l: on.offsetLeft, w: on.offsetWidth }; b.style.left = to.l + 'px'; b.style.width = to.w + 'px';
    if (anim && !still && b.animate && from.w) { var l0 = Math.min(from.l, to.l), r0 = Math.max(from.l + from.w, to.l + to.w);
      b.animate([{ left: from.l + 'px', width: from.w + 'px', transform: 'scaleY(1)' }, { left: l0 + 'px', width: (r0 - l0) + 'px', transform: 'scaleY(.74)', offset: 0.4 }, { left: to.l + 'px', width: to.w + 'px', transform: 'scaleY(1)' }], { duration: 620, easing: 'cubic-bezier(.3,1.3,.45,1)' }); } }
  function renderPhone() {
    var host = $('#phone'), ph = $('.phone', host), prev = ph ? +ph.dataset.scr : -1;
    if (!ph || ph.dataset.pid !== S.p) { prev = -1;
      host.innerHTML = '<div class="phone" data-pid="' + S.p + '" dir="' + P().dir + '" lang="' + P().lang + '">' + skyHTML() + '<i class="pane"></i><div class="sb"><span data-t="clock"></span><i></i><span><b></b></span></div><div class="scr"></div>' + tabs() + '<div data-onb></div><div data-sheet></div><div class="splash" data-splash hidden></div></div>'; S.onb = null;
      ph = $('.phone', host); }
    var scr = $('.scr', ph); ph.dataset.scr = S.screen; var keepTop = prev === S.screen ? scr.scrollTop : 0; scr.innerHTML = [scrDial, scrLouah, scrCal, scrAlerts, scrMe][S.screen](); scr.scrollTop = keepTop; $('[data-sheet]', ph).innerHTML = sheetHTML();
    $$('.tb button', ph).forEach(function (b) { b.setAttribute('aria-selected', +b.dataset.i === S.screen); }); moveBlob(ph, prev >= 0 && prev !== S.screen);
    if (prev >= 0 && prev !== S.screen && !still) { scr.style.setProperty('--dx', ((S.screen > prev ? 1 : -1) * (P().dir === 'rtl' ? -1 : 1) * 28) + 'px'); scr.classList.remove('enter'); void scr.offsetWidth; scr.classList.add('enter'); }
  }

  /* ---------- montre ---------- */
  function renderWatch() {
    var l = L(), pg, top = '<div class="wtop"><span data-h="wbadge"></span><span data-t="clock"></span></div>';
    if (S.wscreen === 0) pg = '<div class="wfull">' + dialBox('watch', !!M.target, S.wside) + '</div><div class="wclock" data-t="clock"></div>';
    else if (S.wscreen === 1) pg = top + '<div class="wnow" data-h="wnow"></div><ul class="wl" data-list="wlist"></ul>';
    else if (S.p === 'awqat') pg = top + '<button class="wtap" data-act="tasbih"><div class="wbig" data-t="tasbih"></div><small>تسبيح · 33</small></button>';
    else pg = top + '<div data-h="wday"></div>';
    $('#watch').innerHTML = '<div class="watch"><div class="wcase"><div class="wscr" data-wscr="' + S.wscreen + '" dir="' + P().dir + '" lang="' + P().lang + '">' + skyHTML() + '<i class="pane"></i><div class="wpage' + (S.wscreen ? '' : ' full') + '">' + pg + '</div>' +
      '<div class="wdots" dir="ltr">' + [0, 1, 2].map(function (i) { return '<button data-act="wtab" data-i="' + i + '" aria-selected="' + (S.wscreen === i) + '" aria-label="' + l.wl[i] + '"><i></i></button>'; }).join('') + '</div></div></div>' +
      '<div class="wnav">' + l.wl.map(function (t, i) { return '<button data-act="wtab" data-i="' + i + '" aria-pressed="' + (S.wscreen === i) + '" lang="' + P().lang + '">' + t + '</button>'; }).join('') + '</div></div>';
  }
  function renderSurfaces() {
    var d = ' dir="' + P().dir + '" lang="' + P().lang + '"';
    $('#surfaces').innerHTML =
      '<div class="surface"><h3>Complication et Smart Stack</h3><div class="sfc"' + d + '><div class="row"><div class="mini" data-dial="mini"><span data-svg></span></div><div style="min-width:0"><b data-t="whatShort"></b><small data-t="untilT"></small></div><span class="big" data-h="big"></span></div></div><p class="cap">Sur le cadran de la montre, et remontée d’elle-même dans la pile quand une fenêtre va se fermer.</p></div>' +
      '<div class="surface"><h3>Dynamic Island et écran verrouillé</h3><div class="island"' + d + '><div class="mini" data-dial="mini"><span data-svg></span></div><span data-t="plain"></span></div><div class="sfc"' + d + '><div class="row"><span class="cic" data-ic="win"></span><div><b data-t="whatFull"></b><small data-t="untilL"></small></div></div><div class="bar"><i data-bar></i></div></div><p class="cap">Activité en direct pendant la dernière heure d’une fenêtre. Un appui ouvre la prière du moment.</p></div>' +
      '<div class="surface"><h3>Toujours allumé</h3><div class="aod">' + dialBox('watch', false, 'front', true) + '</div><p class="cap">Écran en veille : même lecture, sans couleur, une mise à jour par minute.</p></div>' +
      '<div class="surface"><h3>Widget d’accueil</h3><div class="sfc wd"' + d + '><div class="row"><span class="cic" data-ic="win"></span><div><b data-t="whatFull"></b><small data-t="untilL"></small></div></div><ul class="wl" data-list="wlist" style="margin-top:8px"></ul></div><p class="cap">Les prochains repères, sans ouvrir l’application.</p></div>' +
      '<div class="surface wide"><h3>Tablette</h3><div class="tabl"' + d + '>' + skyHTML() + '<div class="tabl-in"><div class="tabl-dial">' + dialBox('full', false, 'front') + '</div><div class="tabl-side"><div class="pill ghost" data-t="dayline"></div><div class="sgroup"><ul class="wl" data-list="wlist"></ul></div></div></div></div><p class="cap">Sur une tablette, le cadran et la suite de la journée tiennent côte à côte. Même moteur, même lecture.</p></div>';
  }

  /* ---------- peinture ---------- */
  function upcoming(m, n) { var t = +m.now, a = []; m.cycles.forEach(function (c) { c.windows.forEach(function (w) { if (+w.start > t && a.length < n) a.push(w); }); }); return a; }
  /* La prière du moment : une vignette épinglée en tête de la rangée, pas une barre au milieu de l'écran. */
  function pinned(m) {
    var w = win(m.window), h = '', day = T.wall(m.now, m.city.tz).d, now = { he: 'עכשיו', ar: 'الآن', fr: '' }[P().lang];
    if (S.p === 'hatadhar') {
      if (w.act) h += '<button class="tile pin" data-act="open" data-s="' + w.act + '"><span class="ri">' + ic(I.PRAY[w.act].ic) + '</span><span><small>' + now + '</small><span>' + I.ACT[w.act] + '</span></span></button>';
      if (m.isNight && levana(m).open && m.sky.moon.alt > 0) h += '<button class="tile pin2" data-act="open" data-s="levana"><span class="ri">' + ic('night') + '</span><span><small>הלילה</small><span>ברכת הלבנה</span></span></button>';
    } else if (S.p === 'awqat' && w.act) { var k = m.window.id + day, done = !!S.prayed[k]; h += '<button class="tile pin' + (done ? ' done' : '') + '" data-act="prayed" data-k="' + k + '"><span class="ri">' + ic(done ? 'check' : w.ic) + '</span><span><small>' + esc(m.window.name) + '</small><span>صلّيت</span></span></button>'; }
    return h;
  }
  function moonCard(m) {
    if (S.p === 'kairos') return '';
    var lv = S.p === 'hatadhar' ? levana(m) : null, d = lunarDay(m);
    return '<div class="card mooncard"><div class="row"><span class="moonbig">' + moonSVG(m) + '</span><div><h4>' + phaseName(m) + '</h4><p>' + (S.p === 'hatadhar' ? 'יום ' + d + ' לחודש · ' + lv.text : 'اليوم ' + d + ' من الشهر الهجري') + '</p></div></div></div>';
  }
  function rowIc(label) { return '<span class="ri">' + ic(I.ROW[label] || 'clock') + '</span>'; }
  function dials(m, root) { $$('[data-dial]', root).forEach(function (e) { $('[data-svg]', e).innerHTML = dialSVG(m, e.dataset.dial, !!e.dataset.mono); e.classList.toggle('urgent', m.remaining < 10 * T.MIN); var c = $('[data-cmp]', e); if (c) c.innerHTML = compassSVG(m); }); }
  function paint() {
    var m = M = T.compute(S.p, S.now, cfg()), l = L(), z = m.city.tz, root = $('#stage'), w = win(m.window), k = skyModel(m), G = guard(k, m), shab = isShabbat(m), endT = hm(m.window.end, z);
    root.dataset.p = S.p; root.dataset.theme = G.pref; root.dataset.face = S.face; root.dataset.shabbat = shab ? '1' : '';
    root.style.setProperty('--g', rgb(k.tri[1])); root.style.setProperty('--skybg', k.plain ? '#000' : 'linear-gradient(180deg,' + rgb(k.tri[0]) + ' 0%,' + rgb(k.tri[1]) + ' 46%,' + rgb(k.tri[2]) + ' 100%)');
    var whatFull = S.p === 'kairos' ? m.window.name : remText(m.remaining) + ' ' + w.what;
    var v = { clock: hm(m.now, z), city: m.city[m.product.lang], date: dateText(m), wd: wdText(m), dayline: wdText(m) + (S.p === 'kairos' ? ' ' : ' · ') + dateText(m), what: w.what, whatShort: S.p === 'kairos' ? m.window.name : w.what, whatFull: whatFull, untilT: l.until + ' ' + endT + (S.face === 'otiot' && S.p === 'hatadhar' ? ' · שעה ' + HOURS.he[Math.min(11, Math.floor(m.frac * 12))] + '׳' : ''), untilL: m.window.endLabel + ' · ' + endT, plain: remPlain(m.remaining),
      bear: m.bearing == null ? '' : Math.round(m.bearing) + '°', target: m.target ? m.target.label : '', dist: m.distance == null ? '' : Math.round(m.distance).toLocaleString('fr-FR') + ' ' + l.km, salt: l.sunAlt + ' ' + Math.round(m.sky.sun.alt) + '°', tasbih: S.tasbih, shabcap: shab ? l.shabbat : '',
      shita: S.p === 'hatadhar' ? (cfg().opinion === 'mga' ? 'סוף זמן קריאת שמע ותפילה לפי המגן אברהם' : 'סוף זמן קריאת שמע ותפילה לפי הגר״א') : S.p === 'awqat' ? 'طريقة الحساب: ' + T.METHODS[cfg().method].ar : '' };
    var hv = { big: remBig(m.remaining), mooncard: moonCard(m), greg: gregHTML(m),
      wbadge: shab ? '<span class="badge shab">' + ic('candles') + 'שבת</span>' : '',
      wnow: '<span class="cic">' + ic(w.ic) + '</span><div><b>' + remPlain(m.remaining) + '</b><small>' + esc(w.what) + '</small></div>',
      wday: S.p === 'hatadhar' ? '<div class="wttl">' + wdText(m) + ' · ' + dateText(m) + '</div>' + (shab ? '<p class="wnote">' + l.shabbatMode + '</p>' : '') + '<div class="wmoon"><span class="moonbig">' + moonSVG(m) + '</span><div><b>' + phaseName(m) + '</b><small>' + levana(m).text + '</small></div></div><ul class="wl">' + [['שקיעה', m.today.shkia], [m.today.dow === 6 ? 'צאת השבת' : 'צאת הכוכבים', m.today.tzet]].map(function (r) { return '<li>' + rowIc(r[0]) + '<span>' + r[0] + '</span><time>' + hm(r[1], z) + '</time></li>'; }).join('') + '</ul>'
          : S.p !== 'kairos' ? '' : '<div class="wttl">Lumière et repères</div><ul class="wl">' + [['Lumière avant', m.marks.lumiere, 'sunrise'], ['Dernière caféine', m.marks.cafeine, 'cup'], ['Coucher', m.marks.coucher, 'bed']].map(function (r) { return '<li><span class="ri">' + ic(r[2]) + '</span><span>' + r[0] + '</span><time>' + hm(r[1], z) + '</time></li>'; }).join('') + '</ul>' };
    $$('[data-t]', root).forEach(function (e) { var x = v[e.dataset.t]; if (x != null && e.textContent !== String(x)) e.textContent = x; });
    $$('[data-h]', root).forEach(function (e) { var x = hv[e.dataset.h]; if (x != null && e.innerHTML !== x) e.innerHTML = x; });
    $$('[data-ic]', root).forEach(function (e) { if (e.dataset.cur !== w.ic) { e.dataset.cur = w.ic; e.innerHTML = ic(w.ic); } });
    dials(m, root);
    var wk = S.p + m.window.id + (+m.window.start); if (root.dataset.wk !== wk) { if (root.dataset.wk && !still) $$('.center', root).forEach(function (c) { c.classList.remove('chg'); void c.offsetWidth; c.classList.add('chg'); }); root.dataset.wk = wk; $$('.next', root).forEach(function (e) { e.classList.add('fresh'); setTimeout(function () { e.classList.remove('fresh'); }, 1100); }); }
    $$('[data-bar]', root).forEach(function (e) { e.style.width = (100 * (1 - m.windowFrac)).toFixed(1) + '%'; });
    var sd = k.plain ? null : skyDraw(k, m);
    $$('[data-sky]', root).forEach(function (e) { e.hidden = !sd; if (!sd) return; if (!e._sky) e._sky = new D2Sky.Sky(e); e._sky.set(sd); });
    $$('[data-fbtn]', root).forEach(function (e) { var n = S.side === 'back' ? 'clock' : (S.p === 'hatadhar' ? 'temple' : 'compass'); if (e.dataset.cur !== n) { e.dataset.cur = n; e.innerHTML = ic(n); } });
    $$('[data-pg]', root).forEach(function (e) { e.dataset.side = S.side; });
    // le garde-fou : chaque zone reçoit le ton et l'opacité de verre qui gardent tout lisible
    var ph = $('.phone', root), ws = $('.wscr', root), mins = { ink: 99, mute: 99, acc: 99, sky: 99 }, use = function (z) { mins.ink = Math.min(mins.ink, z.r[0]); mins.mute = Math.min(mins.mute, z.r[1]); mins.acc = Math.min(mins.acc, z.r[2]); return z; };
    if (ph) { var sb = $('.sb', ph), scrE = $('.scr', ph), tbE = $('.tb', ph);
      if (S.screen === 0) { clearZone(scrE); setZone(sb, G.z.sb, shab); mins.sky = G.z.sb.r[0]; setZone($('.scr > .row', ph), use(G.z.top), shab); setZone($('.dialwrap', ph), use(G.z.dial), shab); setZone($('.next', ph), use(G.z.rail), shab); setZone(tbE, use(G.z.bar), shab); }
      else { var pz = use(G.z.pane), on = { tone: pz.tone, a: pz.tone === 'light' ? 0.5 : 0.3, sink: pz.sink }; ph.style.setProperty('--pane', 'rgba(' + TINT[pz.tone].join(',') + ',' + Math.max(pz.a, 0.62).toFixed(2) + ')'); [sb, scrE, tbE].forEach(function (e) { setZone(e, on, shab); }); } }
    if (ws) { if (S.wscreen === 0) setZone(ws, use(G.z.watch), shab);
      else { var wz = use(G.z.pane); ws.style.setProperty('--pane', 'rgba(' + TINT[wz.tone].join(',') + ',' + Math.max(wz.a, 0.62).toFixed(2) + ')'); setZone(ws, { tone: wz.tone, a: wz.tone === 'light' ? 0.5 : 0.3, sink: wz.sink }, shab); } }
    var ob = ph && $('.onb', ph), tabl = $('.tabl', root); if (ob) { var oz = G.z.pane; ob.style.setProperty('--pane', 'rgba(' + TINT[oz.tone].join(',') + ',' + Math.max(oz.a, 0.66).toFixed(2) + ')'); setZone(ob, { tone: oz.tone, a: oz.tone === 'light' ? 0.5 : 0.3, sink: oz.sink }, shab); } if (tabl) setZone(tabl, G.z.watch, shab);
    var gEl = $('#gauge'); if (gEl) { var f1 = function (x) { return x.toFixed(1).replace('.', ','); }, okk = mins.ink >= NEED.ink && mins.mute >= NEED.mute && mins.acc >= NEED.acc && mins.sky >= NEED.mute;
      gEl.innerHTML = '<i class="' + (okk ? 'ok' : 'ko') + '"></i>Lisibilité mesurée à cet instant : texte <b>' + f1(mins.ink) + '</b> · texte secondaire <b>' + f1(mins.mute) + '</b> · icônes <b>' + f1(mins.acc) + '</b>' + (mins.sky < 99 ? ' · heure du haut <b>' + f1(mins.sky) + '</b>' : '') + ' <span>(minimums exigés : 7 · 4,5 · 3 · 4,5)</span>'; }
    var dayKey = S.p + JSON.stringify(cfg()) + T.wall(m.now, z).d;
    $$('[data-list]', root).forEach(function (e) {
      var k = e.dataset.list, h = '';
      if (k === 'next') h = pinned(m) + upcoming(m, 4).map(function (x) { return '<div class="tile"><span class="ri">' + ic(win(x).ic) + '</span><span><small>' + hm(x.start, z) + '</small><span>' + esc(x.name) + '</span></span></div>'; }).join('');
      if (k === 'wlist') h = upcoming(m, e.closest('.sfc') ? 3 : 3).map(function (x) { return '<li><span class="ri">' + ic(win(x).ic) + '</span><span>' + esc(x.name) + '</span><time>' + hm(x.start, z) + '</time></li>'; }).join('');
      if (k === 'louah') { var done = false; m.list.forEach(function (r) { var past = +r[1] <= +m.now; if (!past && !done) { done = true; h += '<li class="cur"><div class="row"><span class="cic">' + ic(w.ic) + '</span><div style="flex:1"><b>' + esc(whatFull) + '</b><div class="meta">' + esc(m.window.endLabel) + ' ' + endT + '</div></div><span class="meta">' + l.here + '</span></div><div class="bar"><i style="width:' + (100 * (1 - m.windowFrac)).toFixed(1) + '%"></i></div></li>'; }
        h += '<li class="' + (past ? 'past' : '') + '">' + rowIc(r[0]) + '<span>' + esc(r[0]) + '</span><time>' + hm(r[1], z) + '</time></li>'; }); }
      if (k === 'alerts' || k === 'week') { if (e.dataset.key === dayKey) return; e.dataset.key = dayKey; }
      if (k === 'alerts') h = alertRows(m).map(function (r) { return '<div class="al"><span class="ri">' + ic(r[3]) + '</span><div style="flex:1"><b>' + esc(r[0]) + '</b><small>' + esc(r[1]) + '</small></div>' + sw(r[0], isOn(r[0], !!r[2])) + '</div>'; }).join('');
      if (k === 'week') { for (var i = 0; i < 7; i++) { var d = new Date(+m.now + i * 864e5), wl = T.wall(d, z), x = T.compute(S.p, T.fromWall(wl.y, wl.m, wl.d, 12, z), cfg()), t2 = x.today, key;
          if (S.p === 'hatadhar') key = t2.dow === 5 ? ['הדלקת נרות', t2.candles] : t2.dow === 6 ? ['צאת השבת', t2.tzet] : ['שקיעה', t2.shkia]; else key = t2.dow === 5 ? ['الجمعة', t2.dhuhr] : ['المغرب', t2.maghrib];
          h += '<button data-act="goto" data-d="' + i + '"' + (i ? '' : ' aria-current="date"') + '><span class="d"><b>' + wl.d + '</b><small>' + weekday(x, x.now, 'short') + '</small></span><span class="m"><span>' + dateText(x, x.now) + '</span><small>' + key[0] + '</small></span>' + rowIc(key[0]) + '<time>' + hm(key[1], z) + '</time></button>'; } }
      if (e.innerHTML !== h) e.innerHTML = h;
    });
    var wl2 = T.wall(m.now, z), t = $('#t'); if (t) { t.value = wl2.h * 60 + wl2.min; $('#tout').textContent = hm(m.now, z);
      $('#cityOut').textContent = m.city.fr + ' · ' + new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: z }).format(m.now); }
    $$('[data-wx]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.wx) === String(S.wx)); });
    $$('[data-face]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.face === S.face); });
  }
  function render() { M = T.compute(S.p, S.now, cfg()); renderPhone(); renderWatch(); renderSurfaces(); paint();
    $$('[data-prod]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.prod === S.p); }); $$('[data-for]').forEach(function (e) { e.hidden = e.dataset.for.split(' ').indexOf(S.p) < 0; }); }
  /* L'ouverture : le sceau, une aiguille qui fait un tour complet, puis le cadran se remonte jusqu'à l'instant présent. */
  var spT = 0, SPL = { hatadhar: ['', 'מחברים זמן לשורשים'], awqat: ['الأوقات', 'وقتك على مدار الشمس'], kairos: ['Kairos', 'Le bon moment, pas l’heure'] };
  function wind() { var t0 = performance.now(); (function f(t) { var x = clamp((t - t0) / 1400, 0, 1); S.intro = 1 - Math.pow(1 - x, 3); if (M) dials(M, $('#stage')); if (x < 1) requestAnimationFrame(f); })(t0); }
  function splash() {
    var ph = $('#phone .phone'), el = ph && $('[data-splash]', ph); if (!el || still) return;
    var he = S.p === 'hatadhar', t = SPL[S.p];
    el.innerHTML = '<div class="sp-mark' + (he ? ' logo' : '') + '"><svg class="sp-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" pathLength="100"/></svg><svg class="sp-hand" viewBox="0 0 100 100" aria-hidden="true"><line x1="50" y1="50" x2="50" y2="6"/></svg>' +
      (he ? '<img src="logo-hatadhar.png" alt="התדהר" width="150" height="185">' : '<span class="sp-dot"></span>') + '</div>' + (t[0] ? '<div class="sp-name">' + t[0] + '</div>' : '') + '<div class="sp-sub">' + t[1] + '</div><div class="sp-pat" dir="ltr">WO 2010/013230</div>';
    el.className = 'splash'; el.hidden = false; ph.classList.add('splashing'); clearTimeout(spT); S.intro = 0; dials(M, $('#stage'));
    spT = setTimeout(function () { el.classList.add('out'); ph.classList.remove('splashing'); ph.classList.add('arriving'); wind(); spT = setTimeout(function () { el.hidden = true; ph.classList.remove('arriving'); }, 1500); }, 2050);
  }
  var ONB = { he: { t: ['הזמן שנשאר, במבט אחד', 'איפה אתם?', 'הנוסח והשיטה שלכם', 'מה להזכיר לכם?'], b: ['הטבעת החיצונית היא היום שעובר, בצבעי השמיים.', 'הקשת הפנימית היא הזמן שנשאר לחלון הנוכחי.'], s: ['הזמנים מחושבים לפי מיקום השמש אצלכם. המיקום נשאר במכשיר.', 'אפשר לשנות בכל רגע בהגדרות.', 'ההתראות זזות עם השמש, כל יום.'], next: 'המשך', start: 'מתחילים', skip: 'דילוג' },
    ar: { t: ['الوقت المتبقي بنظرة واحدة', 'أين أنت؟', 'طريقة الحساب', 'بماذا نذكّرك؟'], b: ['الحلقة الخارجية هي اليوم الذي يمضي، بألوان السماء.', 'القوس الداخلي هو الوقت المتبقي للصلاة الحالية.'], s: ['تُحسب الأوقات حسب موقع الشمس عندك. موقعك لا يغادر هاتفك.', 'يمكنك التغيير في أي وقت من الإعدادات.', 'التنبيهات تتحرك مع الشمس كل يوم.'], next: 'التالي', start: 'ابدأ', skip: 'تخطي' },
    fr: { t: ['Le temps qui reste, d’un coup d’œil', 'Où êtes-vous ?', 'Votre rythme', 'Que faut-il vous rappeler ?'], b: ['L’anneau extérieur, c’est la journée qui passe, aux couleurs du ciel.', 'L’arc intérieur, c’est le temps qui reste à la phase en cours.'], s: ['Les heures suivent le soleil là où vous êtes. Votre position reste sur le téléphone.', 'Modifiable à tout moment dans les réglages.', 'Les rappels suivent votre rythme.'], next: 'Continuer', start: 'Commencer', skip: 'Passer' } };
  function onbHTML() {
    if (S.onb == null) return ''; var o = ONB[P().lang], i = S.onb, body = '', list = function (key) { return '<div class="opts">' + OPTS(key).list.map(function (x) { return '<button class="opt" data-act="oset" data-k="' + key + '" data-v="' + x[0] + '" aria-pressed="' + (String(cfg()[key]) === String(x[0])) + '"><span><b>' + x[1] + '</b>' + (x[2] ? '<small>' + x[2] + '</small>' : '') + '</span><i class="radio"></i></button>'; }).join('') + '</div>'; };
    if (i === 0) body = '<div class="onb-dial">' + dialSVG(M, 'full') + '</div><ul class="onb-leg"><li><i class="k1"></i><span>' + o.b[0] + '</span></li><li><i class="k2"></i><span>' + o.b[1] + '</span></li></ul>';
    if (i === 1) body = '<p class="sub">' + o.s[0] + '</p>' + list('city');
    if (i === 2) body = '<p class="sub">' + o.s[1] + '</p>' + (S.p === 'hatadhar' ? list('rite') + list('opinion') : S.p === 'awqat' ? list('method') : list('wake'));
    if (i === 3) body = '<p class="sub">' + o.s[2] + '</p><div class="sgroup alg">' + alertRows(M).slice(0, 4).map(function (r) { return '<div class="al"><span class="ri">' + ic(r[3]) + '</span><div style="flex:1"><b>' + esc(r[0]) + '</b><small>' + esc(r[1]) + '</small></div>' + sw(r[0], isOn(r[0], !!r[2])) + '</div>'; }).join('') + '</div>';
    return '<div class="onb"><div class="onb-top"><span class="onb-dots">' + [0, 1, 2, 3].map(function (j) { return '<i' + (j === i ? ' class="on"' : '') + '></i>'; }).join('') + '</span><button data-act="onbskip">' + o.skip + '</button></div><div class="onb-body"><h2 class="ttl">' + o.t[i] + '</h2>' + body + '</div><button class="cta" data-act="onbnext">' + (i === 3 ? o.start : o.next) + '</button></div>';
  }
  function onb() { var h = $('#phone [data-onb]'); if (!h) return; var had = $('.onb', h); h.innerHTML = onbHTML(); var n = $('.onb', h); if (n && had) n.classList.add('still'); paint(); }
  function showAudit() { var g = $('#gaugeAll'); if (!g) return; var r = audit(), f = function (x) { return x.toFixed(1).replace('.', ','); };
    g.innerHTML = '<b>' + r.n.toLocaleString('fr-FR') + ' instants testés</b> (toute la journée, toutes les 5 minutes, par temps dégagé, voilé, couvert, de pluie et d’orage). Plus faible contraste mesuré : texte ' + f(r.ink) + ' · texte secondaire ' + f(r.mute) + ' · icônes ' + f(r.acc) + ' · heure en haut de l’écran ' + f(r.sky) + '. ' +
      (r.bad ? '<b class="ko">' + r.bad + ' instants sous le seuil.</b>' : '<b class="ok">Aucun instant sous le seuil.</b>'); }
  function sheet() { var host = $('[data-sheet]'), was = $('.sheet', host), top = was ? was.scrollTop : 0; host.innerHTML = sheetHTML(); var cur = $('.sheet', host); if (was && cur) { cur.classList.add('still'); cur.scrollTop = top; $('.scrim', host).classList.add('still'); }
    var e = $('[data-text]'); if (!e || tcache[e.dataset.text]) return; var id = e.dataset.text, put = function (h) { var x = $('[data-text="' + id + '"]'); if (x) x.innerHTML = h; };
    loadText(id).then(function () { put(textHTML(id)); }).catch(function () { put('<span class="meta">לא ניתן לטעון את הטקסט כרגע.</span>'); }); }

  /* ---------- interactions ---------- */
  function go(what) {
    var z = tz(), w = T.wall(S.now, z), add; stop();
    if (what === 'now') S.now = new Date();
    if (what === 'end') S.now = new Date(+M.window.end - 6 * T.MIN);
    if (what === 'erev' || what === 'shab' || what === 'motz') { add = ((what === 'erev' ? 5 : 6) - w.dow + 7) % 7; var noon = T.fromWall(w.y, w.m, w.d + add, 12, z), d = T.compute(S.p, noon, cfg()).today;
      S.now = what === 'shab' ? T.fromWall(w.y, w.m, w.d + add, 9.5, z) : what === 'erev' ? new Date((d.candles || d.asr) - 20 * T.MIN) : new Date(+(d.shkia || d.maghrib) + 12 * T.MIN); }
    S.shabbatOn = false; paint();
  }
  var swiped = false;
  /* Le cadran se retourne en boussole : par son bouton, par les deux points, ou d'un glissement. */
  function flip(inW, to) { var box = $((inW ? '.wscr' : '.phone') + ' .dialbox'); if (!box) return; var s = to || (box.dataset.side === 'back' ? 'front' : 'back'); if (s === box.dataset.side) return; box.dataset.side = s; if (inW) S.wside = s; else S.side = s;
    S.heading = 0; paint(); if (s === 'back') setTimeout(function () { S.heading = M.bearing; $$('.rose').forEach(function (r) { r.style.transform = 'rotate(' + (-S.heading).toFixed(1) + 'deg)'; }); }, 420); }
  document.addEventListener('click', function (ev) {
    if (swiped) { swiped = false; return; }
    var b = ev.target.closest('[data-act],[data-prod],[data-go],[data-wx],[data-face]'); if (!b) return; var a = b.dataset.act;
    if (b.dataset.prod) { S.p = b.dataset.prod; S.screen = 0; S.wscreen = 0; S.side = S.wside = 'front'; S.sheet = null; S.heading = 0; render(); return splash(); }
    if (b.dataset.wx != null) { S.wx = isNaN(+b.dataset.wx) ? b.dataset.wx : +b.dataset.wx; return paint(); }
    if (b.dataset.face) { S.face = b.dataset.face; return paint(); }
    if (b.dataset.go === 'play') return S.playing ? stop() : play();
    if (b.dataset.go === 'splash') return splash();
    if (b.dataset.go === 'onb') { S.onb = 0; return onb(); }
    if (b.dataset.go === 'audit') return showAudit();
    if (b.dataset.go) return go(b.dataset.go);
    if (a === 'tab') { S.screen = +b.dataset.i; S.side = 'front'; S.heading = 0; S.sheet = null; renderPhone(); return paint(); }
    if (a === 'wtab') { S.wscreen = +b.dataset.i; S.wside = 'front'; renderWatch(); return paint(); }
    if (a === 'flip' || a === 'flipto') return flip(!!b.closest('.wscr'), b.dataset.s);
    if (a === 'day') { S.now = new Date(+S.now + b.dataset.d * 864e5); return paint(); }
    if (a === 'goto') { S.now = new Date(+S.now + b.dataset.d * 864e5); S.screen = 1; renderPhone(); return paint(); }
    if (a === 'sw') { var on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); S.off[S.p + b.dataset.k] = on; return; }
    if (a === 'set') { var v = b.dataset.v; cfg()[b.dataset.k] = isNaN(+v) ? v : +v; S.sheet = null; renderPhone(); return paint(); }
    if (a === 'pick') { S.sheet = 'pick:' + b.dataset.k; return sheet(); }
    if (a === 'calview') { S.calView = b.dataset.v; renderPhone(); return paint(); }
    if (a === 'calsel') { S.calSel = new Date(+b.dataset.t0); S.calMon = S.calSel; $$('.mday.sel').forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); var ag = $('.phone .agenda'); if (ag) ag.outerHTML = agenda(S.calSel, tz()); return; }
    if (a === 'calday') { S.calSel = calNoon(new Date(+(S.calSel || calNoon(dayInstant(M))) + b.dataset.d * 864e5)); S.calMon = S.calSel; renderPhone(); return paint(); }
    if (a === 'oset') { var ov = b.dataset.v; cfg()[b.dataset.k] = isNaN(+ov) ? ov : +ov; $$('[data-act=oset][data-k="' + b.dataset.k + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.v === ov); }); return paint(); }
    if (a === 'onbnext') { S.onb = S.onb < 3 ? S.onb + 1 : null; return onb(); }
    if (a === 'onbskip') { S.onb = null; return onb(); }
    if (a === 'mon') { var mo = hmonth(S.calMon || S.calSel || calNoon(dayInstant(M)), tz()); S.calMon = calNoon(new Date(+b.dataset.d > 0 ? +mo.days[mo.days.length - 1].date + 4 * 864e5 : +mo.days[0].date - 4 * 864e5)); renderPhone(); return paint(); }
    if (a === 'addev') { S.sheet = 'addev'; return sheet(); }
    if (a === 'draft') { S.draft[b.dataset.k] = b.dataset.v; $$('[data-act=draft][data-k="' + b.dataset.k + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.v === b.dataset.v); }); var si = $('.sheet .sic'); if (si && b.dataset.k === 'type') si.innerHTML = ic(S.draft.type === 'azkara' ? 'flame' : S.draft.type === 'bday' ? 'gift' : 'bell'); return; }
    if (a === 'evsave') { var ed = S.calSel || calNoon(dayInstant(M)), eh = hparts(ed, tz()); S.events.push({ type: S.draft.type, name: S.draft.name.trim() || EVT[S.draft.type], m: eh.m, d: eh.d, remind: S.draft.remind }); S.draft.name = ''; S.sheet = null; S.calSel = ed; S.screen = 2; S.calView = 'month'; renderPhone(); return paint(); }
    if (a === 'tasbih') { S.tasbih = (S.tasbih + 1) % 34; return paint(); }
    if (a === 'open') { S.sheet = b.dataset.s; S.text = null; S.flash = false; return sheet(); }
    if (a === 'close') { S.sheet = null; S.text = null; S.flash = false; return sheet(); }
    if (a === 'text') { S.text = b.dataset.x; return sheet(); }
    if (a === 'untext') { S.text = null; return sheet(); }
    if (a === 'amida') { S.flash = true; sheet(); return setTimeout(function () { S.flash = false; if (S.sheet) sheet(); }, 2200); }
    if (a === 'shabbat') { S.shabbatOn = !S.shabbatOn; sheet(); return paint(); }
    if (a === 'prayed') { S.prayed[b.dataset.k] = !S.prayed[b.dataset.k]; return paint(); }
  });
  document.addEventListener('input', function (ev) { var k = ev.target.dataset && ev.target.dataset.draft; if (k) S.draft[k] = ev.target.value; });
  var tEl = $('#t'); if (tEl) tEl.addEventListener('input', function () { stop(); var w = T.wall(S.now, tz()); S.now = T.fromWall(w.y, w.m, w.d, this.value / 60, tz()); paint(); });
  var timer = null;
  function play() { S.playing = true; var b = $('[data-go=play]'); if (b) { b.setAttribute('aria-pressed', true); b.textContent = 'Pause'; } timer = setInterval(function () { S.now = new Date(+S.now + 2 * T.MIN); paint(); }, 60); }
  function stop() { S.playing = false; clearInterval(timer); var b = $('[data-go=play]'); if (b) { b.setAttribute('aria-pressed', false); b.textContent = 'Lecture'; } }
  setInterval(function () { if (!S.playing && Math.abs(Date.now() - S.now) < 9e4) { S.now = new Date(); paint(); } }, 20000);
  var sx = null, zone = null; document.addEventListener('pointerdown', function (e) { zone = e.target.closest('.wscr') ? 'w' : (e.target.closest('.phone .dialwrap') && M.target ? 'd' : null); sx = zone ? e.clientX : null; });
  document.addEventListener('pointerup', function (e) { if (sx == null) return; var d = e.clientX - sx; sx = null; if (Math.abs(d) < 30) return; swiped = true; setTimeout(function () { swiped = false; }, 60);
    if (zone === 'd') return flip(false); var dir = (d < 0 ? 1 : -1) * (P().dir === 'rtl' ? -1 : 1); S.wscreen = clamp(S.wscreen + dir, 0, 2); S.wside = 'front'; renderWatch(); paint(); });
  if (/[?&]embed=1/.test(location.search)) document.body.classList.add('embed');
  window.addEventListener('resize', function () { var ph = $('#phone .phone'); if (ph) moveBlob(ph, false); });
  render(); splash();
  window.D2 = { S: S, render: render, paint: paint, go: go, T: T, audit: audit, splash: splash };
})();

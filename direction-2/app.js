/* TIDHAR — Direction 2 · l'interface des maquettes (téléphone, montre, autres surfaces).
 * Tout est dessiné à partir de TIDHAR.compute() : un seul moteur, toutes les surfaces. */
(function () {
  'use strict';
  var T = window.TIDHAR, $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---------- textes des produits ---------- */
  var STR = {
    he: { left: 'נותרו', until: 'עד', next: 'בהמשך', tabs: ['שעון', 'זמנים', 'לוח', 'התראות', 'אני'], min: 'דק׳', sim: 'הדמיה · המכשיר פונה צפונה', dir: 'כיוון התפילה',
          card: ['N', 'מז', 'ד', 'מע'], city: 'עיר', louah: 'זמני היום', week: 'השבוע', alerts: 'התראות', me: 'אני', faces: ['נקי', 'סופר'], face: 'פני השעון',
          note: 'אין לסמוך על הזמנים עד הרגע האחרון.', wl: ['שעון', 'זמנים', 'היום'], here: 'אתם כאן' },
    ar: { left: 'الباقي', until: 'حتى', next: 'التالي', tabs: ['الساعة', 'المواقيت', 'التقويم', 'التنبيهات', 'حسابي'], min: 'د', sim: 'محاكاة · الجهاز متجه شمالاً', dir: 'القبلة',
          card: ['ش', 'ق', 'ج', 'غ'], city: 'المدينة', louah: 'مواقيت اليوم', week: 'هذا الأسبوع', alerts: 'التنبيهات', me: 'حسابي', faces: ['بسيط', 'أرقام'], face: 'واجهة الساعة',
          note: 'المواقيت تقريبية بفارق دقيقة أو دقيقتين. راجع مسجدك عند الشك.', wl: ['الساعة', 'المواقيت', 'تسبيح'], here: 'أنت هنا' },
    fr: { left: 'Encore', until: 'jusqu’à', next: 'Ensuite', tabs: ['Cycle', 'Journée', '', 'Repères', 'Moi'], min: 'min', sim: '', dir: '',
          card: ['N', 'E', 'S', 'O'], city: 'Ville', louah: 'Votre journée', week: '', alerts: 'Repères du jour', me: 'Moi', faces: ['Épuré', 'Heures'], face: 'Cadran',
          note: 'Repères indicatifs. Kairos n’est pas un dispositif médical.', wl: ['Cycle', 'Journée', 'Lumière'], here: 'Vous êtes ici' }
  };
  STR.he.card[0] = 'צ';
  var IC = {
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', list: '<path d="M8.5 7H19M8.5 12H19M8.5 17H19M5 7h.01M5 12h.01M5 17h.01"/>',
    cal: '<rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>', bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14zM10 20.5a2 2 0 0 0 4 0"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1-3.5 4-5 7-5s6 1.5 7 5"/>', compass: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2l-1.6 4-4 1.6 1.6-4z"/>',
    pin: '<path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>', chev: '<path d="M9 5l7 7-7 7"/>'
  };
  function ic(n, cls) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + IC[n] + '</svg>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- état ---------- */
  var S = { p: 'hatadhar', now: new Date(), screen: 0, wscreen: 0, side: 'front', wside: 'front', theme: 'dark', playing: false, tasbih: 0,
            cfg: { hatadhar: { city: 'jerusalem', opinion: 'gra', face: 0 }, awqat: { city: 'casablanca', method: 'mwl', asr: 'shafii', face: 0 }, kairos: { city: 'paris', wake: 7, face: 0 } },
            off: {} };
  var M = null; // dernier modèle calculé
  function cfg() { return S.cfg[S.p]; }
  function P() { return T.PRODUCTS[S.p]; }
  function L() { return STR[P().lang]; }
  function tz() { return T.CITIES[cfg().city].tz; }

  /* ---------- formats ---------- */
  var fmtCache = {};
  function hm(d, z) { z = z || tz(); var f = fmtCache[z] || (fmtCache[z] = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: z, hourCycle: 'h23' })); return f.format(d); }
  function rem(ms) { var t = Math.max(0, Math.floor(ms / 6e4)); return { h: Math.floor(t / 60), m: t % 60 }; }
  function remBig(ms) { var r = rem(ms); if (r.h) return r.h + ':' + (r.m < 10 ? '0' : '') + r.m; var u = '<sup>' + L().min + '</sup>'; return P().dir === 'rtl' ? u + '<bdi>' + r.m + '</bdi>' : r.m + u; }
  function remPlain(ms) { var r = rem(ms); return r.h ? r.h + ':' + (r.m < 10 ? '0' : '') + r.m : r.m + ' ' + L().min; }
  function remText(ms) {
    var r = rem(ms), l = P().lang;
    if (l === 'he') return r.h ? (r.h === 1 ? 'שעה' : r.h + ' שעות') + (r.m ? ' ו־' + r.m + ' דק׳' : '') : r.m + ' דקות';
    if (l === 'ar') return r.h ? r.h + ' س ' + (r.m ? r.m + ' د' : '') : r.m + ' دقيقة';
    return r.h ? r.h + ' h ' + (r.m < 10 ? '0' : '') + r.m : r.m + ' min';
  }
  /** La date du produit. Le jour hébraïque et le jour hégirien commencent au coucher du soleil. */
  function dateText(m, d) {
    var l = m.product.lang, z = m.city.tz, x = d || m.now;
    if (!d && m.today) { var eve = m.today.shkia || m.today.maghrib; if (+m.now >= +eve) x = new Date(+m.now + 864e5 * 0.5); }
    if (l === 'he') return new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: z }).format(x);
    if (l === 'ar') return new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', timeZone: z }).format(x);
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: z }).format(x);
  }
  function weekday(m, d, style) { return new Intl.DateTimeFormat(m.product.lang, { weekday: style || 'long', timeZone: m.city.tz }).format(d || m.now); }

  /* ---------- le cadran ---------- */
  var GEO = { full: { R: 146, rw: 10, IR: 119, iw: 16 }, watch: { R: 146, rw: 13, IR: 114, iw: 20 }, aod: { R: 144, rw: 9, IR: 114, iw: 14 }, mini: { R: 138, rw: 28, IR: 86, iw: 34 } };
  function pt(a, r) { var t = (a - 90) * Math.PI / 180; return [(160 + r * Math.cos(t)).toFixed(2), (160 + r * Math.sin(t)).toFixed(2)]; }
  function arc(r, a0, a1) { if (a1 - a0 > 359.9) a1 = a0 + 359.9; var p = pt(a0, r), q = pt(a1, r); return 'M' + p[0] + ' ' + p[1] + 'A' + r + ' ' + r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + q[0] + ' ' + q[1]; }
  function tick(a, r0, r1, col, w) { var p = pt(a, r0), q = pt(a, r1); return '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>'; }
  var ringCache = {};
  /** La lumière réelle de chaque instant du cycle : 120 pas de 3°. */
  function ring(m) {
    var k = m.product.id + m.city.tz + m.city.lat + (+m.cycle.start);
    if (!ringCache[k]) { var a = [], len = m.cycle.end - m.cycle.start; for (var i = 0; i < 120; i++) a.push(T.skyCSS(T.sunAlt(new Date(+m.cycle.start + (i + 0.5) / 120 * len), m.city.lat, m.city.lng))); ringCache[k] = a; }
    return ringCache[k];
  }
  function dialSVG(m, detail) {
    var g = GEO[detail], o = [], now = m.frac * 360, w0 = m.angle(m.window.start), w1 = m.angle(m.window.end), cols = ring(m), i, n = Math.floor(now / 3);
    // l'anneau : le cycle qui se consomme
    o.push('<circle cx="160" cy="160" r="' + g.R + '" fill="none" stroke="var(--track)" stroke-width="' + g.rw + '"/>');
    if (detail === 'aod') o.push('<path d="' + arc(g.R, 0, Math.max(now, 1)) + '" fill="none" stroke="var(--mute)" stroke-width="' + g.rw + '"/>');
    else {
      for (i = 0; i < n; i++) o.push('<path d="' + arc(g.R, i * 3, i * 3 + 3.5) + '" fill="none" stroke="' + cols[i] + '" stroke-width="' + g.rw + '"/>');
      if (now > n * 3) o.push('<path d="' + arc(g.R, n * 3, now) + '" fill="none" stroke="' + cols[Math.min(n, 119)] + '" stroke-width="' + g.rw + '"/>');
    }
    if (detail === 'full' || detail === 'watch') {
      m.cycle.windows.forEach(function (w, j) { if (j) o.push(tick(m.angle(w.start), g.R - g.rw / 2 - 4, g.R - g.rw / 2 - 9, 'var(--mute)', 1.6)); });
      if (detail === 'full') {
        for (i = 1; i < 12; i++) { var d = pt(i * 30, 97); o.push('<circle cx="' + d[0] + '" cy="' + d[1] + '" r="1.4" fill="var(--mute)" opacity=".55"/>'); }
        if (cfg().face) { var lab = m.product.id === 'kairos' ? ['6 h', '12 h', '18 h'] : (m.product.lang === 'he' ? ['ג׳', 'ו׳', 'ט׳'] : ['3', '6', '9']);
          lab.forEach(function (t, j) { var q = pt((j + 1) * 90, 90); o.push('<circle cx="' + q[0] + '" cy="' + q[1] + '" r="11" fill="var(--g)"/><text x="' + q[0] + '" y="' + q[1] + '" text-anchor="middle" dominant-baseline="central" font-size="13" fill="var(--mute)" font-family="inherit">' + t + '</text>'); }); }
      }
    }
    // l'arc intérieur : uniquement la fenêtre en cours ; la partie colorée est le temps restant
    o.push('<path d="' + arc(g.IR, w0, w1) + '" fill="none" stroke="var(--s2)" stroke-width="' + g.iw + '" stroke-linecap="round"/>');
    o.push('<path d="' + arc(g.IR, Math.min(now, w1 - 0.6), w1) + '" fill="none" stroke="' + (detail === 'aod' ? 'var(--ink)' : 'var(--acc)') + '" stroke-width="' + g.iw + '" stroke-linecap="round"/>');
    if (detail !== 'mini') o.push(tick(w1, g.IR - g.iw / 2 - 5, g.IR + g.iw / 2 + 5, 'var(--ink)', 2.6));
    // l'encoche du haut : l'ancre du cycle
    o.push(tick(0, g.R - g.rw / 2 - (detail === 'mini' ? 2 : 6), g.R + g.rw / 2 + (detail === 'mini' ? 2 : 6), 'var(--ink)', detail === 'mini' ? 9 : 3.4));
    // l'astre du moment, sur l'anneau
    if (detail !== 'aod') {
      var c = pt(now, g.R), r = detail === 'mini' ? 15 : g.rw * 0.92;
      o.push('<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (r + (detail === 'mini' ? 7 : 3.5)) + '" fill="var(--g)"/>');
      if (m.isNight) { var k = (1 - Math.cos(2 * Math.PI * m.moon)) / 2, dx = (m.moon < 0.5 ? -1 : 1) * 2 * r * k, id = 'mc' + detail + m.product.id;
        o.push('<clipPath id="' + id + '"><circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + r + '"/></clipPath><circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + r + '" fill="#E9EDF6"/>' +
               '<circle cx="' + (+c[0] + dx).toFixed(2) + '" cy="' + c[1] + '" r="' + r + '" fill="#5B647A" clip-path="url(#' + id + ')"/>'); }
      else o.push('<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + r + '" fill="#FFE39A"/>');
    }
    return '<svg class="dial" viewBox="0 0 320 320" role="img" aria-label="' + esc(m.window.name + ' — ' + remText(m.remaining)) + '">' + o.join('') + '</svg>';
  }
  function compassSVG(m) {
    var o = ['<circle cx="160" cy="160" r="146" fill="none" stroke="var(--s2)" stroke-width="10"/>'], i;
    for (i = 0; i < 72; i++) o.push(tick(i * 5, 128, i % 6 ? 133 : 138, 'var(--mute)', i % 18 ? 1.2 : 2.4));
    L().card.forEach(function (t, j) { var q = pt(j * 90, 100); o.push('<text x="' + q[0] + '" y="' + q[1] + '" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="600" fill="' + (j ? 'var(--mute)' : 'var(--ink)') + '" font-family="inherit">' + t + '</text>'); });
    var a = pt(0, 150), b1 = pt(-6, 126), b2 = pt(6, 126);
    o.push('<g class="needle" style="transform:rotate(' + (m.bearing || 0).toFixed(1) + 'deg)"><path d="M' + a[0] + ' ' + a[1] + 'L' + b1[0] + ' ' + b1[1] + 'L' + b2[0] + ' ' + b2[1] + 'z" fill="var(--acc)"/>' + '</g>');
    return '<svg class="dial" viewBox="0 0 320 320" aria-hidden="true">' + o.join('') + '</svg>';
  }
  function dialBox(detail, flippable, side) {
    var back = flippable ? '<div class="face back"><div data-cmp></div><div class="cmp-c"><strong data-t="bear"></strong><small data-t="target"></small><small data-t="sim"></small></div></div>' : '';
    return '<div class="dialbox" data-dial="' + detail + '" data-side="' + (side || 'front') + '"><div class="flip"><div class="face">' +
      (flippable ? '<button class="dialbtn" data-act="flip" aria-label="' + esc(L().dir) + '">' : '<div class="dialbtn">') + '<span data-svg></span>' + (flippable ? '</button>' : '</div>') +
      (detail === 'mini' ? '' : '<div class="center">' + (detail === 'aod' ? '' : '<small data-t="left"></small>') + '<strong data-h="big"></strong>' + (detail === 'aod' ? '' : '<small data-t="untilT"></small>') + '</div>') +
      '</div>' + back + '</div></div>';
  }

  /* ---------- téléphone ---------- */
  function tabs() {
    var icons = ['clock', 'list', 'cal', 'bell', 'user'], l = L();
    return '<nav class="tb" role="tablist">' + icons.map(function (n, i) { return l.tabs[i] ? '<button role="tab" aria-selected="' + (S.screen === i) + '" data-act="tab" data-i="' + i + '">' + ic(n) + '<span>' + l.tabs[i] + '</span></button>' : ''; }).join('') + '</nav>';
  }
  function sw(key, on) { return '<button class="sw" role="switch" aria-checked="' + on + '" data-act="sw" data-k="' + key + '" aria-label="' + esc(key) + '"></button>'; }
  function isOn(key, def) { var k = S.p + key; return S.off[k] == null ? def : S.off[k]; }
  function scrDial() {
    return '<div class="row between"><button class="pill" data-act="tab" data-i="4">' + ic('pin') + '<span data-t="city"></span></button><span class="meta" data-t="date"></span></div>' +
      '<h2 class="ttl" data-t="ttl"></h2><p class="sub" data-h="sub"></p>' +
      '<div style="position:relative">' + (M.target ? '<button class="fbtn" data-act="flip" aria-label="' + esc(L().dir) + '">' + ic('compass') + '</button>' : '') + dialBox('full', !!M.target, S.side) + '</div>' +
      '<p class="lbl" style="margin-top:8px">' + L().next + '</p><div class="next" data-list="next"></div>';
  }
  function scrLouah() {
    return '<div class="daynav"><button data-act="day" data-d="-1" aria-label="−1">' + ic('chev', 'mir') + '</button><div style="text-align:center"><div class="h1" style="margin:0" data-t="date"></div><div class="meta" data-t="wd"></div></div>' +
      '<button data-act="day" data-d="1" aria-label="+1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="mir" style="transform:scaleX(' + (P().dir === 'rtl' ? 1 : -1) + ')"><path d="M15 5l-7 7 7 7"/></svg></button></div>' +
      '<ul class="list" data-list="louah"></ul><p class="meta" style="margin-top:14px" data-t="shita"></p><p class="meta">' + L().note + '</p>';
  }
  function scrCal() { return '<div class="h1">' + L().week + '</div><p class="meta" data-t="date"></p><div class="wk" data-list="week"></div>'; }
  function alertRows(m) {
    var z = m.city.tz, t = m.today, k = m.marks, mn = T.MIN;
    if (S.p === 'hatadhar') return [['סוף זמן קריאת שמע', '30 דק׳ לפני · היום ' + hm(new Date(t.sofShema - 30 * mn), z), 1], ['מנחה', '20 דק׳ לפני השקיעה · היום ' + hm(new Date(t.shkia - 20 * mn), z), 1],
      ['הדלקת נרות', '40 דק׳ לפני · ערב שבת', 1], ['ספירת העומר', 'אחרי צאת הכוכבים · בין פסח לשבועות', 0], ['קידוש לבנה', 'כשהחלון נפתח', 0], ['רטט בשעון בלבד', 'ללא צליל · בשבת ובחג הכול שקט', 1]];
    if (S.p === 'awqat') return [['الفجر', 'أذان · ' + hm(t.fajr, z), 1], ['الظهر', 'أذان · ' + hm(t.dhuhr, z), 1], ['العصر', 'أذان · ' + hm(t.asr, z), 1], ['المغرب', 'أذان · ' + hm(t.maghrib, z), 1], ['العشاء', 'أذان · ' + hm(t.isha, z), 1],
      ['قبل خروج الوقت', 'تنبيه قبل 15 د من نهاية وقت كل صلاة', 1], ['اهتزاز الساعة فقط', 'بلا صوت · مناسب للعمل والمسجد', 0]];
    return [['Lumière du matin', 'Sortir avant ' + hm(k.lumiere, z), 1], ['Dernière caféine', hm(k.cafeine, z), 1], ['Sieste possible', 'Pendant le creux · 20 min', 0], ['Écrans en veilleuse', hm(k.ecrans, z), 1], ['Coucher', hm(k.coucher, z), 1]];
  }
  function scrAlerts() { return '<div class="h1">' + L().alerts + '</div><div data-list="alerts"></div>'; }
  function choice(key, opts, cur) { return '<div class="choice">' + opts.map(function (o) { return '<button data-act="set" data-k="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function scrMe() {
    var c = cfg(), l = L(), lang = P().lang, h = '<div class="h1">' + l.me + '</div><p class="lbl">' + l.city + '</p>' + choice('city', P().cities.map(function (id) { return [id, T.CITIES[id][lang]]; }), c.city);
    if (S.p === 'hatadhar') h += '<p class="lbl">שיטה · סוף זמן קריאת שמע</p>' + choice('opinion', [['gra', 'הגר״א'], ['mga', 'מגן אברהם']], c.opinion);
    if (S.p === 'awqat') h += '<p class="lbl">طريقة الحساب</p>' + choice('method', Object.keys(T.METHODS).map(function (k) { return [k, T.METHODS[k].ar]; }), c.method) +
      '<p class="lbl">وقت العصر</p>' + choice('asr', [['shafii', 'الشافعي · المالكي · الحنبلي'], ['hanafi', 'الحنفي']], c.asr);
    if (S.p === 'kairos') h += '<p class="lbl">Votre réveil habituel</p>' + choice('wake', [[6, '6 h · plutôt matinal'], [7, '7 h'], [8.5, '8 h 30 · plutôt tardif']], c.wake);
    h += '<p class="lbl">' + l.face + '</p>' + choice('face', [[0, l.faces[0]], [1, l.faces[1]]], c.face);
    if (S.p === 'hatadhar') h += '<div class="card"><h4>תמיכה בפרויקט</h4><p>האפליקציה חינמית, בלי פרסומות. אפשר לתרום, או להקדיש יום לעילוי נשמת או לרפואה שלמה.</p><button class="cta">הקדשת יום</button></div>';
    if (S.p === 'awqat') h += '<div class="card"><h4>النسخة الكاملة</h4><p>شراء واحد مدى الحياة. بلا إعلانات وبلا اشتراك. موقعك لا يغادر هاتفك.</p><button class="cta">عرض النسخة الكاملة</button></div>';
    if (S.p === 'kairos') h += '<div class="card"><h4>Essai de 7 jours</h4><p>Vous le démarrez vous-même. Rien n’est prélevé à la fin.</p><ol class="steps"><li>Aujourd’hui<small>Tout est ouvert, sans carte bancaire.</small></li><li>Jour 5<small>Un rappel, une seule fois.</small></li><li>Jour 7<small>L’essai s’arrête. Vous choisissez : 4,99 € par mois ou 34,99 € par an.</small></li></ol><button class="cta">Démarrer l’essai</button></div>';
    return h;
  }
  function renderPhone() {
    var scr = [scrDial, scrLouah, scrCal, scrAlerts, scrMe][S.screen]();
    $('#phone').innerHTML = '<div class="phone" dir="' + P().dir + '" lang="' + P().lang + '"><div class="sb"><span data-t="clock"></span><i></i><span><b></b></span></div><div class="scr">' + scr + '</div>' + tabs() + '</div>';
  }

  /* ---------- montre ---------- */
  function renderWatch() {
    var l = L(), pg;
    if (S.wscreen === 0) pg = '<div class="wtime" data-t="clock"></div><div class="wdial">' + dialBox('watch', !!M.target, S.wside) + '</div>';
    else if (S.wscreen === 1) pg = '<div class="wtime" data-t="clock"></div><div class="wttl" data-t="ttl"></div><ul class="wl" data-list="wlist"></ul>';
    else if (S.p === 'awqat') pg = '<div class="wtime" data-t="clock"></div><button class="wtap" data-act="tasbih"><div class="wbig" data-t="tasbih"></div><small style="color:var(--mute);font-size:13px;margin-top:6px;display:block">تسبيح · 33</small></button>';
    else pg = '<div class="wtime" data-t="clock"></div><div class="wttl" data-t="w3a"></div><ul class="wl" data-list="w3"></ul>';
    $('#watch').innerHTML = '<div class="watch"><div class="wcase"><div class="wscr" dir="' + P().dir + '" lang="' + P().lang + '"><div class="wsky" data-sky></div><div class="wpage">' + pg + '</div>' +
      '<div class="wdots" dir="ltr">' + [0, 1, 2].map(function (i) { return '<button data-act="wtab" data-i="' + i + '" aria-selected="' + (S.wscreen === i) + '" aria-label="' + l.wl[i] + '"><i></i></button>'; }).join('') + '</div></div></div>' +
      '<div class="wnav">' + l.wl.map(function (t, i) { return '<button data-act="wtab" data-i="' + i + '" aria-pressed="' + (S.wscreen === i) + '" lang="' + P().lang + '">' + t + '</button>'; }).join('') + '</div></div>';
  }
  function renderSurfaces() {
    var d = ' dir="' + P().dir + '" lang="' + P().lang + '"';
    $('#surfaces').innerHTML =
      '<div class="surface"><h3>Complication et Smart Stack</h3><div class="sfc"' + d + '><div class="row"><div class="mini" data-dial="mini"><span data-svg></span></div><div style="min-width:0"><b data-t="ttl"></b><small data-t="untilT"></small></div><span class="big" data-h="big"></span></div></div><p class="cap">Sur le cadran de la montre, et remontée automatiquement dans la pile quand une fenêtre va se fermer.</p></div>' +
      '<div class="surface"><h3>Dynamic Island et écran verrouillé</h3><div class="island"' + d + '><div class="mini" data-dial="mini"><span data-svg></span></div><span data-t="plain"></span></div><div class="sfc"' + d + '><b data-t="ttl"></b><small data-t="untilL"></small><div class="bar"><i data-bar></i></div></div><p class="cap">Activité en direct pendant la dernière heure d’une fenêtre, pas en permanence.</p></div>' +
      '<div class="surface"><h3>Toujours allumé</h3><div class="aod">' + dialBox('aod', false) + '</div><p class="cap">Écran en veille : même lecture, sans couleur, une mise à jour par minute.</p></div>' +
      '<div class="surface"><h3>Widget d’accueil</h3><div class="sfc wd"' + d + '><b data-t="ttl"></b><small data-h="sub"></small><ul class="wl" data-list="wlist" style="margin-top:8px"></ul></div><p class="cap">Les prochains repères, sans ouvrir l’application.</p></div>';
  }

  /* ---------- peinture : on met à jour ce qui bouge, sans reconstruire ---------- */
  function upcoming(m, n) { var t = +m.now, a = []; m.cycles.forEach(function (c) { c.windows.forEach(function (w) { if (+w.start > t && a.length < n) a.push(w); }); }); return a; }
  function paint() {
    var m = M = T.compute(S.p, S.now, cfg()), l = L(), z = m.city.tz, root = $('#stage');
    root.dataset.p = S.p; root.dataset.theme = S.theme;
    var endT = hm(m.window.end, z), v = {
      clock: hm(m.now, z), city: m.city[m.product.lang], date: dateText(m), wd: weekday(m), ttl: m.window.name, left: l.left, untilT: l.until + ' ' + endT, untilL: m.window.endLabel + ' · ' + endT,
      plain: remPlain(m.remaining), bear: m.bearing == null ? '' : Math.round(m.bearing) + '°', target: m.target ? m.target.label : '', sim: l.sim, tasbih: S.tasbih,
      shita: S.p === 'hatadhar' ? (cfg().opinion === 'mga' ? 'סוף זמן קריאת שמע ותפילה לפי המגן אברהם' : 'סוף זמן קריאת שמע ותפילה לפי הגר״א') : S.p === 'awqat' ? 'طريقة الحساب: ' + T.METHODS[cfg().method].ar : '',
      w3a: S.p === 'hatadhar' ? weekday(m) + ' · ' + dateText(m) : 'Lumière et repères'
    };
    var hv = { big: remBig(m.remaining), sub: '<b>' + remText(m.remaining) + '</b> · ' + esc(m.window.endLabel) + ' ' + endT };
    $$('[data-t]', root).forEach(function (e) { var x = v[e.dataset.t]; if (e.textContent !== String(x)) e.textContent = x; });
    $$('[data-h]', root).forEach(function (e) { var x = hv[e.dataset.h]; if (e.innerHTML !== x) e.innerHTML = x; });
    $$('[data-dial]', root).forEach(function (e) { $('[data-svg]', e).innerHTML = dialSVG(m, e.dataset.dial); e.classList.toggle('urgent', m.remaining < 10 * T.MIN); var c = $('[data-cmp]', e); if (c && !c.firstChild) c.innerHTML = compassSVG(m); else if (c) $('.needle', c).style.transform = 'rotate(' + (m.bearing || 0).toFixed(1) + 'deg)'; });
    $$('[data-bar]', root).forEach(function (e) { e.style.width = (100 * (1 - m.windowFrac)).toFixed(1) + '%'; });
    $$('[data-sky]', root).forEach(function (e) { e.style.background = 'radial-gradient(130% 85% at 50% -5%,' + T.skyCSS(m.alt, 0.62) + ',rgba(0,0,0,0) 62%),#000'; });
    var dayKey = S.p + JSON.stringify(cfg()) + T.wall(m.now, z).d;
    $$('[data-list]', root).forEach(function (e) {
      var k = e.dataset.list, h = '';
      if (k === 'next') h = upcoming(m, 4).map(function (w) { return '<div><small>' + hm(w.start, z) + '</small><span>' + esc(w.name) + '</span></div>'; }).join('');
      if (k === 'wlist') h = upcoming(m, e.closest('.sfc') ? 3 : 4).map(function (w) { return '<li><span>' + esc(w.name) + '</span><time>' + hm(w.start, z) + '</time></li>'; }).join('');
      if (k === 'louah') { var done = false; m.list.forEach(function (r) { var past = +r[1] <= +m.now; if (!past && !done) { done = true; h += '<li class="cur"><div class="row"><b>' + esc(m.window.name) + '</b><span class="meta">' + l.here + '</span></div><div class="meta">' + remText(m.remaining) + ' · ' + esc(m.window.endLabel) + ' ' + endT + '</div><div class="bar"><i style="width:' + (100 * (1 - m.windowFrac)).toFixed(1) + '%"></i></div></li>'; }
        h += '<li class="' + (past ? 'past' : '') + '"><span>' + esc(r[0]) + '</span><time>' + hm(r[1], z) + '</time></li>'; }); }
      if (k === 'w3') { if (S.p === 'hatadhar') { var t = m.today; h = [['שקיעה', t.shkia], ['צאת הכוכבים', t.tzet]].concat(t.dow === 5 ? [['הדלקת נרות', t.candles]] : []).map(function (r) { return '<li><span>' + r[0] + '</span><time>' + hm(r[1], z) + '</time></li>'; }).join(''); }
        else h = [['Lumière avant', m.marks.lumiere], ['Dernière caféine', m.marks.cafeine], ['Coucher', m.marks.coucher]].map(function (r) { return '<li><span>' + r[0] + '</span><time>' + hm(r[1], z) + '</time></li>'; }).join(''); }
      if (k === 'alerts' || k === 'week') { if (e.dataset.key === dayKey) return; e.dataset.key = dayKey; }
      if (k === 'alerts') h = alertRows(m).map(function (r) { return '<div class="al"><div><b>' + esc(r[0]) + '</b><small>' + esc(r[1]) + '</small></div>' + sw(r[0], isOn(r[0], !!r[2])) + '</div>'; }).join('');
      if (k === 'week') { for (var i = 0; i < 7; i++) { var d = new Date(+m.now + i * 864e5), x = T.compute(S.p, T.fromWall(T.wall(d, z).y, T.wall(d, z).m, T.wall(d, z).d, 12, z), cfg()), t2 = x.today, key;
          if (S.p === 'hatadhar') key = t2.dow === 5 ? ['הדלקת נרות', t2.candles] : t2.dow === 6 ? ['צאת השבת', t2.tzet] : ['שקיעה', t2.shkia]; else key = t2.dow === 5 ? ['الجمعة', t2.dhuhr] : ['المغرب', t2.maghrib];
          h += '<button data-act="goto" data-d="' + i + '"' + (i ? '' : ' aria-current="date"') + '><span class="d"><b>' + T.wall(d, z).d + '</b><small>' + weekday(x, x.now, 'short') + '</small></span><span class="m"><span>' + dateText(x, x.now) + '</span><small>' + key[0] + '</small></span><time>' + hm(key[1], z) + '</time></button>'; } }
      if (e.innerHTML !== h) e.innerHTML = h;
    });
    // commandes
    var w = T.wall(m.now, z); $('#t').value = w.h * 60 + w.min; $('#tout').textContent = hm(m.now, z);
    $('#cityOut').textContent = m.city.fr + ' · ' + new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: z }).format(m.now);
  }
  function render() { M = T.compute(S.p, S.now, cfg()); renderPhone(); renderWatch(); renderSurfaces(); paint();
    $$('[data-prod]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.prod === S.p); }); $$('[data-for]').forEach(function (e) { e.hidden = e.dataset.for !== S.p; }); }

  /* ---------- interactions ---------- */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act],[data-prod],[data-go]'); if (!b) return;
    var a = b.dataset.act, z = tz();
    if (b.dataset.prod) { S.p = b.dataset.prod; S.screen = 0; S.wscreen = 0; S.side = S.wside = 'front'; return render(); }
    if (b.dataset.go === 'now') { S.now = new Date(); stop(); return paint(); }
    if (b.dataset.go === 'play') { S.playing ? stop() : play(); return; }
    if (b.dataset.go === 'end') { stop(); S.now = new Date(+M.window.end - 6 * T.MIN); return paint(); }
    if (b.dataset.go === 'fri') { stop(); var w = T.wall(S.now, z), add = (5 - w.dow + 7) % 7; S.now = T.fromWall(w.y, w.m, w.d + add, 14.5, z); return paint(); }
    if (b.dataset.go === 'theme') { S.theme = S.theme === 'dark' ? 'light' : 'dark'; b.setAttribute('aria-pressed', S.theme === 'light'); return paint(); }
    if (a === 'tab') { S.screen = +b.dataset.i; S.side = 'front'; renderPhone(); return paint(); }
    if (a === 'wtab') { S.wscreen = +b.dataset.i; S.wside = 'front'; renderWatch(); return paint(); }
    if (a === 'flip') { var box = b.closest('.wscr') ? $('.wscr .dialbox') : $('.phone .dialbox'), s = box.dataset.side === 'back' ? 'front' : 'back'; box.dataset.side = s; if (b.closest('.wscr')) S.wside = s; else S.side = s; return; }
    if (a === 'day') { S.now = new Date(+S.now + b.dataset.d * 864e5); return paint(); }
    if (a === 'goto') { S.now = new Date(+S.now + b.dataset.d * 864e5); S.screen = 1; renderPhone(); return paint(); }
    if (a === 'sw') { var on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); S.off[S.p + b.dataset.k] = on; return; }
    if (a === 'set') { var v = b.dataset.v; cfg()[b.dataset.k] = isNaN(+v) ? v : +v; return render(); }
    if (a === 'tasbih') { S.tasbih = (S.tasbih + 1) % 34; return paint(); }
  });
  $('#t').addEventListener('input', function () { stop(); var w = T.wall(S.now, tz()); S.now = T.fromWall(w.y, w.m, w.d, this.value / 60, tz()); paint(); });
  var timer = null;
  function play() { S.playing = true; $('[data-go=play]').setAttribute('aria-pressed', true); $('[data-go=play]').textContent = 'Pause'; timer = setInterval(function () { S.now = new Date(+S.now + 2 * T.MIN); paint(); }, 60); }
  function stop() { S.playing = false; clearInterval(timer); var b = $('[data-go=play]'); b.setAttribute('aria-pressed', false); b.textContent = 'Lecture'; }
  setInterval(function () { if (!S.playing && Math.abs(Date.now() - S.now) < 9e4) { S.now = new Date(); paint(); } }, 20000);
  // glisser sur la montre pour changer d'écran
  var sx = null; document.addEventListener('pointerdown', function (e) { sx = e.target.closest('.wscr') ? e.clientX : null; });
  document.addEventListener('pointerup', function (e) { if (sx == null) return; var d = e.clientX - sx; sx = null; if (Math.abs(d) < 30) return; var dir = (d < 0 ? 1 : -1) * (P().dir === 'rtl' ? -1 : 1); S.wscreen = Math.max(0, Math.min(2, S.wscreen + dir)); S.wside = 'front'; renderWatch(); paint(); });
  render();
  window.D2 = { S: S, render: render, paint: paint };
})();

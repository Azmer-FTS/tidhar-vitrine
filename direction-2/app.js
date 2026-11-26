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
  var S = { p: 'hatadhar', now: new Date(), screen: 0, wscreen: 0, side: 'front', wside: 'front', playing: false, tasbih: 0,
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
    if (l === 'he') return new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: z }).format(x);
    if (l === 'ar') return new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', timeZone: z }).format(x);
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: z }).format(x);
  }
  function weekday(m, d, style) { return new Intl.DateTimeFormat(m.product.lang, { weekday: style || 'long', timeZone: m.city.tz }).format(d || m.now); }
  function lunarDay(m) { var cal = m.product.lang === 'ar' ? 'islamic-umalqura' : 'hebrew'; return +new Intl.DateTimeFormat('en-u-ca-' + cal, { day: 'numeric', timeZone: m.city.tz }).format(dayInstant(m)); }

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
  function cloud() { return S.wx === 'rain' ? 1 : +S.wx; }
  function skyTriple(alt) {
    var a = KF[0], b = KF[KF.length - 1], i, t = 0, c = cloud(), rain = S.wx === 'rain';
    if (alt <= a[0]) b = a; else if (alt >= b[0]) a = b; else for (i = 1; i < KF.length; i++) if (alt <= KF[i][0]) { a = KF[i - 1]; b = KF[i]; t = (alt - a[0]) / (b[0] - a[0]); break; }
    return [1, 2, 3].map(function (k) { var col = [0, 1, 2].map(function (j) { return a[k][j] + (b[k][j] - a[k][j]) * t; }), g = 0.3 * col[0] + 0.59 * col[1] + 0.11 * col[2];
      return col.map(function (v) { v = v + (g - v) * c * 0.8; return Math.round(v * (rain ? 0.78 : 1 - c * 0.08)); }); });
  }
  function rgb(c) { return 'rgb(' + c.join(',') + ')'; }
  function skyState(m) {
    var face = S.face, tri = skyTriple(m.alt), light = m.alt > -1.5;
    if (face === 'sofer') return { theme: 'light', bg: '#EFE6D2', g: '#EFE6D2', sky: false };
    if (face === 'even') return { theme: 'light', bg: 'linear-gradient(180deg,#EDE1CA,#DCCAA8)', g: '#E4D5B8', sky: false };
    if (face === 'layla') return { theme: 'dark', bg: '#000', g: '#000', sky: false };
    return { theme: light ? 'light' : 'dark', bg: 'linear-gradient(180deg,' + rgb(tri[0]) + ' 0%,' + rgb(tri[1]) + ' 46%,' + rgb(tri[2]) + ' 100%)', g: rgb(tri[1]), sky: true,
             stars: clamp((-m.alt - 3) / 9, 0, 1) * (1 - cloud() * 0.92), clouds: cloud(), rain: S.wx === 'rain' };
  }
  function skyHTML() { return '<div class="sky" data-sky></div>'; }
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  /** Ce que le canevas du ciel doit peindre à cet instant (voir sky.js). */
  function skyDraw(m, sk) {
    var tri = skyTriple(m.alt), c = cloud(), light = sk.theme === 'light', sunX = clamp((m.sky.sun.az - 60) / 240, 0.06, 0.94), yOf = function (alt) { return 0.42 - clamp(alt, 0, 75) / 75 * 0.32; };
    return { grad: [[0, rgb(tri[0])], [0.24, rgb(mix(tri[0], tri[1], 0.55))], [0.5, rgb(tri[1])], [0.78, rgb(mix(tri[1], tri[2], 0.6))], [1, rgb(tri[2])]],
      glow: clamp(1 - Math.abs(m.alt) / 10, 0, 1) * (1 - c * 0.85), sunX: sunX, stars: sk.stars, rot: (+m.now / 86164090.5) * 2 * Math.PI % (2 * Math.PI),
      sun: m.sky.sun.alt > -2 ? { x: sunX, y: yOf(m.sky.sun.alt), a: 1 - c * 0.8, warm: clamp(1 - m.sky.sun.alt / 14, 0, 1) } : null,
      moon: m.sky.moon.alt > 0 && m.alt < 6 ? { x: clamp((m.sky.moon.az - 60) / 240, 0.06, 0.94), y: yOf(m.sky.moon.alt), p: m.moon, a: +(1 - c * 0.85).toFixed(2) } : null,
      cloud: c, rain: S.wx === 'rain', cloudRGB: light ? (c > 0.6 ? '226,231,238' : '255,255,255') : '142,152,180', veilRGB: light ? (S.wx === 'rain' ? '104,114,130' : '176,184,194') : '16,20,32', rainRGB: light ? '244,248,253' : '186,202,230' };
  }
  function moonSVG(m) { return '<svg viewBox="0 0 24 24"><defs><radialGradient id="mgd" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#CBD3E4"/></radialGradient></defs><circle cx="12" cy="12" r="11" fill="currentColor" opacity=".12"/><path d="' + D2Sky.moonPath(12, 12, 11, m.moon) + '" fill="url(#mgd)"/></svg>'; }

  /* ---------- le cadran ----------
   * Rond sur le téléphone. Sur la montre, une superellipse qui épouse le boîtier : tout l'écran sert,
   * et l'ANGLE reste le paramètre, comme pour la face carrée du brevet. */
  var GEO = {
    full: { w: 320, h: 320, cx: 160, cy: 160, a: 146, b: 146, n: 2, rw: 10, ia: 118, ib: 118, iw: 16, step: 1.5 },
    watch: { w: 212, h: 258, cx: 106, cy: 129, a: 96, b: 119, n: 4.4, rw: 9, ia: 80, ib: 103, iw: 13, step: 3 },
    mini: { w: 320, h: 320, cx: 160, cy: 160, a: 138, b: 138, n: 2, rw: 28, ia: 86, ib: 86, iw: 34, step: 6 }
  };
  function pt(g, deg, d) { var t = deg * Math.PI / 180, s = Math.sin(t), c = -Math.cos(t), a = g.a + d, b = g.b + d, r = Math.pow(Math.pow(Math.abs(s) / a, g.n) + Math.pow(Math.abs(c) / b, g.n), -1 / g.n); return [g.cx + r * s, g.cy + r * c]; }
  function line(g, a0, a1, d) { var o = [], x; if (a1 < a0) a1 = a0; for (x = a0; x < a1; x += g.step) o.push(pt(g, x, d)); o.push(pt(g, a1, d));
    return 'M' + o.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L'); }
  function seg(g, a, d0, d1, col, w) { var p = pt(g, a, d0), q = pt(g, a, d1); return '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>'; }
  var ringCache = {};
  function ring(m) { var k = m.product.id + m.city.tz + m.city.lat + (+m.cycle.start); if (!ringCache[k]) { var a = [], len = m.cycle.end - m.cycle.start, i; for (i = 0; i < 120; i++) a.push(T.skyCSS(T.sunAlt(new Date(+m.cycle.start + (i + 0.5) / 120 * len), m.city.lat, m.city.lng))); ringCache[k] = a; } return ringCache[k]; }
  function dialSVG(m, key, mono) {
    var g = GEO[key], o = [], now = m.frac * 360, w0 = m.angle(m.window.start), w1 = m.angle(m.window.end), cols = ring(m), i, n = Math.floor(now / 3), di = g.ia - g.a, P = function (d, s, sw, cap) { return '<path d="' + d + '" fill="none" stroke="' + s + '" stroke-width="' + sw + '"' + (cap ? ' stroke-linecap="round" stroke-linejoin="round"' : '') + '/>'; };
    // l'anneau : le cycle qui se consomme, coloré par la lumière réelle de chaque instant
    o.push(P(line(g, 0, 360, 0) + 'Z', 'var(--track)', g.rw));
    if (mono) o.push(P(line(g, 0, Math.max(now, 1), 0), 'var(--mute)', g.rw));
    else { o.push('<g class="ringg">'); for (i = 0; i < n; i++) o.push(P(line(g, i * 3, i * 3 + 3.5, 0), cols[i], g.rw)); if (now > n * 3) o.push(P(line(g, n * 3, now, 0), cols[Math.min(n, 119)], g.rw)); o.push('</g>'); }
    if (key !== 'mini') m.cycle.windows.forEach(function (w, j) { if (j) o.push(seg(g, m.angle(w.start), -g.rw / 2 - 4, -g.rw / 2 - 8, 'var(--mute)', 1.6)); });
    if (key === 'full') {
      for (i = 1; i < 12; i++) { var d = pt(g, i * 30, -49); o.push('<circle cx="' + d[0].toFixed(1) + '" cy="' + d[1].toFixed(1) + '" r="1.4" fill="var(--mute)" opacity=".6"/>'); }
      if (S.face === 'sofer') { var lab = S.p === 'kairos' ? ['6 h', '12 h', '18 h'] : (P().lang === 'he' ? ['ג׳', 'ו׳', 'ט׳'] : ['3', '6', '9']);
        lab.forEach(function (t, j) { var q = pt(g, (j + 1) * 90, -57); o.push('<text x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="central" font-size="15" fill="var(--mute)" style="font-family:var(--title)">' + t + '</text>'); }); }
    }
    // l'arc intérieur : uniquement la fenêtre en cours ; sa partie colorée est le temps restant
    o.push(P(line(g, w0, w1, di), 'var(--s2)', g.iw, 1));
    o.push(P(line(g, Math.min(now, w1 - 0.6), w1, di), mono ? 'var(--ink)' : 'var(--acc)', g.iw, 1));
    if (key !== 'mini') o.push(seg(g, w1, di - g.iw / 2 - 4, di + g.iw / 2 + 4, 'var(--ink)', 2.6));
    // l'encoche du haut : l'ancre du cycle
    o.push(seg(g, 0, -g.rw / 2 - (key === 'mini' ? 2 : 5), g.rw / 2 + (key === 'mini' ? 2 : 5), 'var(--ink)', key === 'mini' ? 9 : 3.2));
    // l'astre du moment : un soleil avec son halo, une lune avec sa phase — jamais un simple point
    if (!mono) { var c = pt(g, now, 0), r = key === 'mini' ? 16 : g.rw * 1.05, cx = c[0].toFixed(1), cy = c[1].toFixed(1), id = key + S.p;
      if (m.isNight) o.push('<defs><radialGradient id="mh' + id + '"><stop offset="0" stop-color="#DCE5FF" stop-opacity=".55"/><stop offset="1" stop-color="#DCE5FF" stop-opacity="0"/></radialGradient><radialGradient id="mb' + id + '" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#C9D1E3"/></radialGradient></defs>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 2.6).toFixed(1) + '" fill="url(#mh' + id + ')"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#AEB9D6" opacity=".2"/><path d="' + D2Sky.moonPath(+cx, +cy, r, m.moon) + '" fill="url(#mb' + id + ')"/>');
      else o.push('<defs><radialGradient id="sh' + id + '"><stop offset="0" stop-color="#FFE08A" stop-opacity=".8"/><stop offset=".45" stop-color="#FFC95A" stop-opacity=".3"/><stop offset="1" stop-color="#FFC95A" stop-opacity="0"/></radialGradient><radialGradient id="sb' + id + '"><stop offset="0" stop-color="#FFFDF0"/><stop offset=".55" stop-color="#FFE585"/><stop offset="1" stop-color="#FFB53E"/></radialGradient></defs>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 3).toFixed(1) + '" fill="url(#sh' + id + ')"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#sb' + id + ')"/>'); }
    return '<svg class="dial" viewBox="0 0 ' + g.w + ' ' + g.h + '" role="img" aria-label="' + esc(remText(m.remaining) + ' ' + win(m.window).what) + '">' + o.join('') + '</svg>';
  }
  /* La boussole : la rose tourne avec l'appareil, le Temple (ou la Kaaba), le soleil et la lune y sont à leur place réelle. */
  function compassSVG(m) {
    var g = GEO.full, o = [P0('<circle cx="160" cy="160" r="146" fill="none" stroke="var(--track)" stroke-width="10"/>')], i, rose = [];
    function P0(x) { return x; }
    for (i = 0; i < 72; i++) rose.push(seg(g, i * 5, -18, i % 6 ? -23 : -28, 'var(--mute)', i % 18 ? 1.2 : 2.4));
    L().card.forEach(function (t, j) { var q = pt(g, j * 90, -48); rose.push('<text x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) + '" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="600" fill="' + (j ? 'var(--mute)' : 'var(--ink)') + '" font-family="inherit" transform="rotate(' + (j * 90) + ' ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')">' + t + '</text>'); });
    function mark(az, body) { return '<g transform="rotate(' + az.toFixed(1) + ' 160 160)">' + body + '</g>'; }
    if (m.sky.sun.alt > -6) rose.push(mark(m.sky.sun.az, '<circle cx="160" cy="14" r="9" fill="#FFD76A" stroke="#F0A93B" stroke-width="1.4"/>'));
    if (m.sky.moon.alt > -6) rose.push(mark(m.sky.moon.az, '<circle cx="160" cy="14" r="8" fill="#F1F3F8" stroke="#8D97AD" stroke-width="1.2"/>'));
    rose.push(mark(m.bearing, '<circle cx="160" cy="16" r="21" fill="var(--g)" stroke="var(--gold)" stroke-width="2"/><g transform="translate(142.5 -1.5) scale(1.46)" style="color:var(--gold)">' + (S.p === 'hatadhar' ? I.raw('temple') : '<path fill="currentColor" d="M6.5 6.5h11v12h-11zM6.5 9.6h11v1.5h-11z" fill-rule="evenodd"/>') + '</g>'));
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
    return '<nav class="tb" role="tablist">' + icons.map(function (n, i) { return l.tabs[i] ? '<button role="tab" aria-selected="' + (S.screen === i) + '" data-act="tab" data-i="' + i + '">' + ic(n) + '<span>' + l.tabs[i] + '</span></button>' : ''; }).join('') + '</nav>'; }
  function sw(key, on) { return '<button class="sw" role="switch" aria-checked="' + on + '" data-act="sw" data-k="' + esc(key) + '" aria-label="' + esc(key) + '"></button>'; }
  function isOn(key, def) { var k = S.p + key; return S.off[k] == null ? def : S.off[k]; }
  function scrDial() {
    return '<div class="row between"><button class="pill" data-act="tab" data-i="4">' + ic('pin') + '<span data-t="city"></span></button><span class="meta" data-t="date"></span></div>' +
      '<div class="dialwrap">' + (M.target ? '<button class="fbtn" data-act="flip" aria-label="' + esc(L().dir) + '" data-fbtn></button>' : '') + dialBox('full', !!M.target, S.side) +
      (M.target ? '<div class="pg" data-pg><button data-act="flipto" data-s="front" aria-label="' + esc(L().tabs[0]) + '"><i></i></button><button data-act="flipto" data-s="back" aria-label="' + esc(L().dir) + '"><i></i></button></div>' : '') + '</div>' +
      '<div class="next" data-list="next"></div>';
  }
  function scrLouah() {
    return '<div class="daynav"><button data-act="day" data-d="-1" aria-label="−1">' + ic('chev', 'mir') + '</button><div style="text-align:center"><div class="h1" style="margin:0" data-t="date"></div><div class="meta" data-t="wd"></div></div>' +
      '<button data-act="day" data-d="1" aria-label="+1">' + ic('chev', 'mir flipx') + '</button></div><div data-h="mooncard"></div><ul class="list" data-list="louah"></ul><p class="meta" style="margin-top:14px" data-t="shita"></p><p class="meta">' + L().note + '</p>';
  }
  function scrCal() { return '<div class="h1">' + L().week + '</div><p class="meta" data-t="date"></p><div class="wk" data-list="week"></div>'; }
  function scrAlerts() { return '<div class="h1">' + L().alerts + '</div><div data-list="alerts"></div>'; }
  function alertRows(m) {
    var z = m.city.tz, t = m.today, k = m.marks, mn = T.MIN;
    if (S.p === 'hatadhar') return [['סוף זמן קריאת שמע', '30 דק׳ לפני · היום ' + hm(new Date(t.sofShema - 30 * mn), z), 1, 'scroll'], ['מנחה', '20 דק׳ לפני השקיעה · היום ' + hm(new Date(t.shkia - 20 * mn), z), 1, 'sunlow'],
      ['הדלקת נרות', '40 דק׳ לפני · ערב שבת', 1, 'candles'], ['ברכת הלבנה', 'בלילה הראשון שאפשר, לפי הנוסח', 1, 'night'], ['ספירת העומר', 'אחרי צאת הכוכבים · בין פסח לשבועות', 0, 'cal'], ['נגיעה בהתראה פותחת את התפילה', 'מנחה, ערבית, הדלקת נרות…', 1, 'book'], ['רטט בשעון בלבד', 'ללא צליל · בשבת ובחג הכול שקט', 1, 'bell']];
    if (S.p === 'awqat') return [['الفجر', 'أذان · ' + hm(t.fajr, z), 1, 'dawn'], ['الظهر', 'أذان · ' + hm(t.dhuhr, z), 1, 'sun'], ['العصر', 'أذان · ' + hm(t.asr, z), 1, 'sunlow'], ['المغرب', 'أذان · ' + hm(t.maghrib, z), 1, 'sunset'], ['العشاء', 'أذان · ' + hm(t.isha, z), 1, 'night'],
      ['قبل خروج الوقت', 'تنبيه قبل 15 د من نهاية وقت كل صلاة', 1, 'bell'], ['اهتزاز الساعة فقط', 'بلا صوت · مناسب للعمل والمسجد', 0, 'bell']];
    return [['Lumière du matin', 'Sortir avant ' + hm(k.lumiere, z), 1, 'sunrise'], ['Dernière caféine', hm(k.cafeine, z), 1, 'cup'], ['Sieste possible', 'Pendant le creux · 20 min', 0, 'bed'], ['Écrans en veilleuse', hm(k.ecrans, z), 1, 'moon'], ['Coucher', hm(k.coucher, z), 1, 'bed']];
  }
  function choice(key, opts, cur) { return '<div class="choice">' + opts.map(function (o) { return '<button data-act="set" data-k="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  var FACES = { he: ['שמיים', 'סופר', 'אבן ירושלמית', 'לילה'], ar: ['السماء', 'الخطاط', 'الحجر', 'الليل'], fr: ['Ciel vivant', 'Encre', 'Pierre', 'Nuit'] }, FACE_ID = ['sky', 'sofer', 'even', 'layla'];
  function scrMe() {
    var c = cfg(), l = L(), lang = P().lang, h = '<div class="h1">' + l.me + '</div><p class="lbl">' + l.city + '</p>' + choice('city', P().cities.map(function (id) { return [id, T.CITIES[id][lang]]; }), c.city);
    if (S.p === 'hatadhar') h += '<p class="lbl">נוסח</p>' + choice('rite', [['edot', 'עדות המזרח'], ['sfard', 'ספרד'], ['ashkenaz', 'אשכנז']], c.rite) + '<p class="lbl">שיטה · סוף זמן קריאת שמע</p>' + choice('opinion', [['gra', 'הגר״א'], ['mga', 'מגן אברהם']], c.opinion);
    if (S.p === 'awqat') h += '<p class="lbl">طريقة الحساب</p>' + choice('method', Object.keys(T.METHODS).map(function (k) { return [k, T.METHODS[k].ar]; }), c.method) + '<p class="lbl">وقت العصر</p>' + choice('asr', [['shafii', 'الشافعي · المالكي · الحنبلي'], ['hanafi', 'الحنفي']], c.asr);
    if (S.p === 'kairos') h += '<p class="lbl">Votre réveil habituel</p>' + choice('wake', [[6, '6 h · plutôt matinal'], [7, '7 h'], [8.5, '8 h 30 · plutôt tardif']], c.wake);
    h += '<p class="lbl">' + { he: 'עיצוב השעון', ar: 'شكل الساعة', fr: 'Modèle de cadran' }[lang] + '</p><div class="choice">' + FACE_ID.map(function (id, i) { return '<button data-face="' + id + '" aria-pressed="' + (S.face === id) + '">' + FACES[lang][i] + '</button>'; }).join('') + '</div>';
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
  function renderPhone() {
    var scr = [scrDial, scrLouah, scrCal, scrAlerts, scrMe][S.screen]();
    $('#phone').innerHTML = '<div class="phone" dir="' + P().dir + '" lang="' + P().lang + '">' + skyHTML() + '<div class="sb"><span data-t="clock"></span><i></i><span><b></b></span></div><div class="scr">' + scr + '</div>' + tabs() + '<div data-sheet>' + sheetHTML() + '</div></div>';
  }

  /* ---------- montre ---------- */
  function renderWatch() {
    var l = L(), pg, top = '<div class="wtop"><span data-h="wbadge"></span><span data-t="clock"></span></div>';
    if (S.wscreen === 0) pg = '<div class="wfull">' + dialBox('watch', !!M.target, S.wside) + '</div><div class="wclock" data-t="clock"></div>';
    else if (S.wscreen === 1) pg = top + '<div class="wnow" data-h="wnow"></div><ul class="wl" data-list="wlist"></ul>';
    else if (S.p === 'awqat') pg = top + '<button class="wtap" data-act="tasbih"><div class="wbig" data-t="tasbih"></div><small>تسبيح · 33</small></button>';
    else pg = top + '<div data-h="wday"></div>';
    $('#watch').innerHTML = '<div class="watch"><div class="wcase"><div class="wscr" dir="' + P().dir + '" lang="' + P().lang + '">' + skyHTML() + '<div class="wpage' + (S.wscreen ? '' : ' full') + '">' + pg + '</div>' +
      '<div class="wdots" dir="ltr">' + [0, 1, 2].map(function (i) { return '<button data-act="wtab" data-i="' + i + '" aria-selected="' + (S.wscreen === i) + '" aria-label="' + l.wl[i] + '"><i></i></button>'; }).join('') + '</div></div></div>' +
      '<div class="wnav">' + l.wl.map(function (t, i) { return '<button data-act="wtab" data-i="' + i + '" aria-pressed="' + (S.wscreen === i) + '" lang="' + P().lang + '">' + t + '</button>'; }).join('') + '</div></div>';
  }
  function renderSurfaces() {
    var d = ' dir="' + P().dir + '" lang="' + P().lang + '"';
    $('#surfaces').innerHTML =
      '<div class="surface"><h3>Complication et Smart Stack</h3><div class="sfc"' + d + '><div class="row"><div class="mini" data-dial="mini"><span data-svg></span></div><div style="min-width:0"><b data-t="whatShort"></b><small data-t="untilT"></small></div><span class="big" data-h="big"></span></div></div><p class="cap">Sur le cadran de la montre, et remontée d’elle-même dans la pile quand une fenêtre va se fermer.</p></div>' +
      '<div class="surface"><h3>Dynamic Island et écran verrouillé</h3><div class="island"' + d + '><div class="mini" data-dial="mini"><span data-svg></span></div><span data-t="plain"></span></div><div class="sfc"' + d + '><div class="row"><span class="cic" data-ic="win"></span><div><b data-t="whatFull"></b><small data-t="untilL"></small></div></div><div class="bar"><i data-bar></i></div></div><p class="cap">Activité en direct pendant la dernière heure d’une fenêtre. Un appui ouvre la prière du moment.</p></div>' +
      '<div class="surface"><h3>Toujours allumé</h3><div class="aod">' + dialBox('watch', false, 'front', true) + '</div><p class="cap">Écran en veille : même lecture, sans couleur, une mise à jour par minute.</p></div>' +
      '<div class="surface"><h3>Widget d’accueil</h3><div class="sfc wd"' + d + '><div class="row"><span class="cic" data-ic="win"></span><div><b data-t="whatFull"></b><small data-t="untilL"></small></div></div><ul class="wl" data-list="wlist" style="margin-top:8px"></ul></div><p class="cap">Les prochains repères, sans ouvrir l’application.</p></div>';
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
  function paint() {
    var m = M = T.compute(S.p, S.now, cfg()), l = L(), z = m.city.tz, root = $('#stage'), w = win(m.window), sk = skyState(m), shab = isShabbat(m), endT = hm(m.window.end, z);
    root.dataset.p = S.p; root.dataset.theme = sk.theme; root.dataset.face = S.face; root.dataset.shabbat = shab ? '1' : '';
    root.style.setProperty('--g', sk.g); root.style.setProperty('--skybg', sk.bg);
    var whatFull = S.p === 'kairos' ? m.window.name : remText(m.remaining) + ' ' + w.what;
    var v = { clock: hm(m.now, z), city: m.city[m.product.lang], date: dateText(m), wd: weekday(m), what: w.what, whatShort: S.p === 'kairos' ? m.window.name : w.what, whatFull: whatFull, untilT: l.until + ' ' + endT, untilL: m.window.endLabel + ' · ' + endT, plain: remPlain(m.remaining),
      bear: m.bearing == null ? '' : Math.round(m.bearing) + '°', target: m.target ? m.target.label : '', dist: m.distance == null ? '' : Math.round(m.distance).toLocaleString('fr-FR') + ' ' + l.km, salt: l.sunAlt + ' ' + Math.round(m.sky.sun.alt) + '°', tasbih: S.tasbih, shabcap: shab ? l.shabbat : '',
      shita: S.p === 'hatadhar' ? (cfg().opinion === 'mga' ? 'סוף זמן קריאת שמע ותפילה לפי המגן אברהם' : 'סוף זמן קריאת שמע ותפילה לפי הגר״א') : S.p === 'awqat' ? 'طريقة الحساب: ' + T.METHODS[cfg().method].ar : '' };
    var hv = { big: remBig(m.remaining), mooncard: moonCard(m),
      wbadge: shab ? '<span class="badge shab">' + ic('candles') + 'שבת</span>' : '',
      wnow: '<span class="cic">' + ic(w.ic) + '</span><div><b>' + remPlain(m.remaining) + '</b><small>' + esc(w.what) + '</small></div>',
      wday: S.p === 'hatadhar' ? '<div class="wttl">' + weekday(m) + ' · ' + dateText(m) + '</div>' + (shab ? '<p class="wnote">' + l.shabbatMode + '</p>' : '') + '<div class="wmoon"><span class="moonbig">' + moonSVG(m) + '</span><div><b>' + phaseName(m) + '</b><small>' + levana(m).text + '</small></div></div><ul class="wl">' + [['שקיעה', m.today.shkia], [m.today.dow === 6 ? 'צאת השבת' : 'צאת הכוכבים', m.today.tzet]].map(function (r) { return '<li>' + rowIc(r[0]) + '<span>' + r[0] + '</span><time>' + hm(r[1], z) + '</time></li>'; }).join('') + '</ul>'
          : '<div class="wttl">Lumière et repères</div><ul class="wl">' + [['Lumière avant', m.marks.lumiere, 'sunrise'], ['Dernière caféine', m.marks.cafeine, 'cup'], ['Coucher', m.marks.coucher, 'bed']].map(function (r) { return '<li><span class="ri">' + ic(r[2]) + '</span><span>' + r[0] + '</span><time>' + hm(r[1], z) + '</time></li>'; }).join('') + '</ul>' };
    $$('[data-t]', root).forEach(function (e) { var x = v[e.dataset.t]; if (x != null && e.textContent !== String(x)) e.textContent = x; });
    $$('[data-h]', root).forEach(function (e) { var x = hv[e.dataset.h]; if (x != null && e.innerHTML !== x) e.innerHTML = x; });
    $$('[data-ic]', root).forEach(function (e) { if (e.dataset.cur !== w.ic) { e.dataset.cur = w.ic; e.innerHTML = ic(w.ic); } });
    $$('[data-dial]', root).forEach(function (e) { $('[data-svg]', e).innerHTML = dialSVG(m, e.dataset.dial, !!e.dataset.mono); e.classList.toggle('urgent', m.remaining < 10 * T.MIN); var c = $('[data-cmp]', e); if (c) c.innerHTML = compassSVG(m); });
    $$('[data-bar]', root).forEach(function (e) { e.style.width = (100 * (1 - m.windowFrac)).toFixed(1) + '%'; });
    var sd = sk.sky ? skyDraw(m, sk) : null;
    $$('[data-sky]', root).forEach(function (e) { e.hidden = !sk.sky; if (!sk.sky) return; if (!e._sky) e._sky = new D2Sky.Sky(e); e._sky.set(sd); });
    $$('[data-fbtn]', root).forEach(function (e) { var n = S.side === 'back' ? 'clock' : (S.p === 'hatadhar' ? 'temple' : 'compass'); if (e.dataset.cur !== n) { e.dataset.cur = n; e.innerHTML = ic(n); } });
    $$('[data-pg]', root).forEach(function (e) { e.dataset.side = S.side; });
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
  function sheet() { $('[data-sheet]').innerHTML = sheetHTML(); var e = $('[data-text]'); if (!e || tcache[e.dataset.text]) return; var id = e.dataset.text, put = function (h) { var x = $('[data-text="' + id + '"]'); if (x) x.innerHTML = h; };
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
    if (b.dataset.prod) { S.p = b.dataset.prod; S.screen = 0; S.wscreen = 0; S.side = S.wside = 'front'; S.sheet = null; S.heading = 0; return render(); }
    if (b.dataset.wx != null) { S.wx = b.dataset.wx === 'rain' ? 'rain' : +b.dataset.wx; return paint(); }
    if (b.dataset.face) { S.face = b.dataset.face; return paint(); }
    if (b.dataset.go === 'play') return S.playing ? stop() : play();
    if (b.dataset.go) return go(b.dataset.go);
    if (a === 'tab') { S.screen = +b.dataset.i; S.side = 'front'; S.heading = 0; S.sheet = null; renderPhone(); return paint(); }
    if (a === 'wtab') { S.wscreen = +b.dataset.i; S.wside = 'front'; renderWatch(); return paint(); }
    if (a === 'flip' || a === 'flipto') return flip(!!b.closest('.wscr'), b.dataset.s);
    if (a === 'day') { S.now = new Date(+S.now + b.dataset.d * 864e5); return paint(); }
    if (a === 'goto') { S.now = new Date(+S.now + b.dataset.d * 864e5); S.screen = 1; renderPhone(); return paint(); }
    if (a === 'sw') { var on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); S.off[S.p + b.dataset.k] = on; return; }
    if (a === 'set') { var v = b.dataset.v; cfg()[b.dataset.k] = isNaN(+v) ? v : +v; return render(); }
    if (a === 'tasbih') { S.tasbih = (S.tasbih + 1) % 34; return paint(); }
    if (a === 'open') { S.sheet = b.dataset.s; S.text = null; S.flash = false; return sheet(); }
    if (a === 'close') { S.sheet = null; S.text = null; S.flash = false; return sheet(); }
    if (a === 'text') { S.text = b.dataset.x; return sheet(); }
    if (a === 'untext') { S.text = null; return sheet(); }
    if (a === 'amida') { S.flash = true; sheet(); return setTimeout(function () { S.flash = false; if (S.sheet) sheet(); }, 2200); }
    if (a === 'shabbat') { S.shabbatOn = !S.shabbatOn; sheet(); return paint(); }
    if (a === 'prayed') { S.prayed[b.dataset.k] = !S.prayed[b.dataset.k]; return paint(); }
  });
  var tEl = $('#t'); if (tEl) tEl.addEventListener('input', function () { stop(); var w = T.wall(S.now, tz()); S.now = T.fromWall(w.y, w.m, w.d, this.value / 60, tz()); paint(); });
  var timer = null;
  function play() { S.playing = true; var b = $('[data-go=play]'); if (b) { b.setAttribute('aria-pressed', true); b.textContent = 'Pause'; } timer = setInterval(function () { S.now = new Date(+S.now + 2 * T.MIN); paint(); }, 60); }
  function stop() { S.playing = false; clearInterval(timer); var b = $('[data-go=play]'); if (b) { b.setAttribute('aria-pressed', false); b.textContent = 'Lecture'; } }
  setInterval(function () { if (!S.playing && Math.abs(Date.now() - S.now) < 9e4) { S.now = new Date(); paint(); } }, 20000);
  var sx = null, zone = null; document.addEventListener('pointerdown', function (e) { zone = e.target.closest('.wscr') ? 'w' : (e.target.closest('.phone .dialwrap') && M.target ? 'd' : null); sx = zone ? e.clientX : null; });
  document.addEventListener('pointerup', function (e) { if (sx == null) return; var d = e.clientX - sx; sx = null; if (Math.abs(d) < 30) return; swiped = true; setTimeout(function () { swiped = false; }, 60);
    if (zone === 'd') return flip(false); var dir = (d < 0 ? 1 : -1) * (P().dir === 'rtl' ? -1 : 1); S.wscreen = clamp(S.wscreen + dir, 0, 2); S.wside = 'front'; renderWatch(); paint(); });
  if (/[?&]embed=1/.test(location.search)) document.body.classList.add('embed');
  render();
  window.D2 = { S: S, render: render, paint: paint, go: go, T: T };
})();

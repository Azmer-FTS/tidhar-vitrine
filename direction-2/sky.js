/* TIDHAR — Direction 2 · le ciel vivant.
 * Un canevas par écran, TOUJOURS derrière le cadran : dégradé du ciel, lueur d'horizon, voie lactée et
 * étoiles qui tournent autour du pôle au rythme réel du ciel, soleil avec son halo, lune avec son relief
 * et sa phase, nuages qui dérivent, pluie. Rien ici ne porte d'information : c'est le décor. */
(function (root) {
  'use strict';
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  var STARS = (function () { var r = rng(7), a = [], i; for (i = 0; i < 620; i++) { var m = Math.pow(r(), 2.6); a.push({ d: Math.sqrt(r()) * 1.5, a: r() * 6.2832, s: 0.7 + m * 2.3, b: 0.45 + 0.55 * r(), tw: r() * 6.28, sp: 0.5 + r() * 1.9, c: r() }); } return a; })();
  var PUFFS = (function () { var r = rng(21), a = [], i, j; for (i = 0; i < 30; i++) { var p = { x: r() * 2.6, y: 0.02 + r() * 0.66, w: 0.3 + r() * 0.45, sp: 0.004 + r() * 0.009, b: [] }; for (j = 0; j < 8; j++) p.b.push([r() - 0.5, (r() - 0.5) * 0.34, 0.22 + r() * 0.4]); a.push(p); } return a; })();
  var DROPS = (function () { var r = rng(99), a = [], i; for (i = 0; i < 190; i++) a.push({ x: r(), y: r(), l: 0.016 + r() * 0.03, v: 0.85 + r() * 1.0, a: 0.10 + r() * 0.30, w: r() < 0.22 ? 1.5 : 0.8 }); return a; })();
  var MARIA = [[-0.28, -0.22, 0.34, 0.26], [0.2, 0.12, 0.3, 0.2], [-0.08, 0.42, 0.2, 0.14], [0.34, -0.4, 0.15, 0.12], [-0.42, 0.14, 0.14, 0.18]];

  /** Le contour de la partie éclairée de la lune (phase 0 = nouvelle, 0.5 = pleine). */
  function moonPath(cx, cy, r, p) {
    var k = (1 - Math.cos(2 * Math.PI * p)) / 2, wax = p < 0.5, rx = Math.max(0.01, r * Math.abs(1 - 2 * k)), outer = wax ? 1 : 0, inner = ((k < 0.5) === wax) ? 0 : 1;
    return 'M' + cx + ' ' + (cy - r) + 'A' + r + ' ' + r + ' 0 0 ' + outer + ' ' + cx + ' ' + (cy + r) + 'A' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + inner + ' ' + cx + ' ' + (cy - r) + 'Z';
  }

  function Sky(host) {
    var self = this; this.c = document.createElement('canvas'); this.c.className = 'skyc'; host.appendChild(this.c); this.st = null; this.last = 0;
    this.still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.loop = function (now) { if (!self.c.isConnected) return; self.raf = requestAnimationFrame(self.loop); if (now - self.last < 33) return; self.last = now; self.draw(now); };
    if (!this.still) this.raf = requestAnimationFrame(this.loop);
  }
  Sky.prototype.set = function (st) { this.st = st; if (this.still) this.draw(0); };
  Sky.prototype.draw = function (now) {
    var st = this.st, c = this.c, w = c.clientWidth, h = c.clientHeight; if (!st || !w || !h) return;
    var dpr = Math.min(2, root.devicePixelRatio || 1), g = c.getContext('2d'), t = now / 1000, i;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 1. le ciel
    var gr = g.createLinearGradient(0, 0, 0, h); st.grad.forEach(function (s) { gr.addColorStop(s[0], s[1]); }); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (st.glow > 0.01) { var gx = w * st.sunX, rg = g.createRadialGradient(gx, h * 1.02, 0, gx, h * 1.02, h * 0.8);
      rg.addColorStop(0, 'rgba(255,176,112,' + (0.6 * st.glow).toFixed(3) + ')'); rg.addColorStop(0.45, 'rgba(255,128,124,' + (0.24 * st.glow).toFixed(3) + ')'); rg.addColorStop(1, 'rgba(255,128,124,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); }
    // 2. la voie lactée et les étoiles, qui tournent autour du pôle
    if (st.stars > 0.01) {
      var px = w * 0.64, py = -h * 0.14, R = Math.max(w, h) * 1.22, rot = st.rot;
      g.save(); g.translate(px, py); g.rotate(rot + 0.7);
      var mw = g.createLinearGradient(0, R * 0.46, 0, R * 0.86); mw.addColorStop(0, 'rgba(170,182,255,0)'); mw.addColorStop(0.5, 'rgba(196,202,255,' + (0.22 * st.stars).toFixed(3) + ')'); mw.addColorStop(1, 'rgba(170,182,255,0)');
      g.fillStyle = mw; g.fillRect(-R * 1.5, R * 0.46, R * 3, R * 0.4); g.restore();
      for (i = 0; i < STARS.length; i++) { var s = STARS[i], x = px + Math.cos(s.a + rot) * s.d * R, y = py + Math.sin(s.a + rot) * s.d * R; if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
        var al = st.stars * s.b * (0.7 + 0.3 * Math.sin(t * s.sp + s.tw)), col = s.c < 0.14 ? '255,214,176' : s.c > 0.86 ? '188,208,255' : '255,255,255';
        if (s.s > 1.25) { var sg = g.createRadialGradient(x, y, 0, x, y, s.s * 4.2); sg.addColorStop(0, 'rgba(' + col + ',' + (al * 0.6).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = sg; g.fillRect(x - s.s * 4.2, y - s.s * 4.2, s.s * 8.4, s.s * 8.4); }
        g.fillStyle = 'rgba(' + col + ',' + al.toFixed(3) + ')'; g.beginPath(); g.arc(x, y, s.s * 0.78, 0, 6.2832); g.fill(); }
    }
    // 3. le soleil et la lune
    if (st.sun) { var sx = w * st.sun.x, sy = h * st.sun.y, a = st.sun.a, wm = st.sun.warm, cr = Math.round(255), cg = Math.round(244 - 60 * wm), cb = Math.round(206 - 110 * wm), bl = g.createRadialGradient(sx, sy, 0, sx, sy, h * 0.36);
      bl.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.7 * a).toFixed(3) + ')'); bl.addColorStop(0.1, 'rgba(255,' + (226 - 50 * wm | 0) + ',' + (156 - 60 * wm | 0) + ',' + (0.36 * a).toFixed(3) + ')'); bl.addColorStop(0.38, 'rgba(255,214,140,' + (0.11 * a).toFixed(3) + ')'); bl.addColorStop(1, 'rgba(255,214,140,0)');
      g.fillStyle = bl; g.fillRect(0, 0, w, h);
      var co = g.createRadialGradient(sx, sy, 0, sx, sy, 17); co.addColorStop(0, 'rgba(255,255,248,' + a.toFixed(3) + ')'); co.addColorStop(0.55, 'rgba(255,' + (240 - 40 * wm | 0) + ',' + (190 - 80 * wm | 0) + ',' + a.toFixed(3) + ')'); co.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = co; g.beginPath(); g.arc(sx, sy, 17, 0, 6.2832); g.fill(); }
    if (st.moon) { var mx = w * st.moon.x, my = h * st.moon.y, ma = st.moon.a, mr = 15, hl = g.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 4.4);
      hl.addColorStop(0, 'rgba(214,224,255,' + (0.26 * ma).toFixed(3) + ')'); hl.addColorStop(1, 'rgba(214,224,255,0)'); g.fillStyle = hl; g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
      g.fillStyle = 'rgba(190,202,232,' + (0.09 * ma).toFixed(3) + ')'; g.beginPath(); g.arc(mx, my, mr, 0, 6.2832); g.fill();   // lumière cendrée, à peine
      var mp = new Path2D(moonPath(mx, my, mr, st.moon.p)), mg = g.createRadialGradient(mx - 4, my - 5, 1, mx, my, mr); mg.addColorStop(0, 'rgba(255,255,255,' + ma + ')'); mg.addColorStop(0.7, 'rgba(232,236,246,' + ma + ')'); mg.addColorStop(1, 'rgba(204,212,230,' + ma + ')');
      g.save(); g.shadowColor = 'rgba(220,230,255,.55)'; g.shadowBlur = 12; g.fillStyle = mg; g.fill(mp); g.shadowBlur = 0; g.clip(mp); g.fillStyle = 'rgba(118,130,164,' + (0.26 * ma).toFixed(3) + ')';
      MARIA.forEach(function (q) { g.beginPath(); g.ellipse(mx + q[0] * mr, my + q[1] * mr, q[2] * mr, q[3] * mr, 0.4, 0, 6.2832); g.fill(); }); g.restore(); }
    // l'orage : de temps en temps un éclair, dessiné AVANT les nuages pour qu'ils le voilent
    var fl = 0;
    if (st.storm && !this.still) { if (!this.nf) this.nf = t + 1.5 + Math.random() * 2.5;
      if (t > this.nf) { this.f0 = t; this.nf = t + 4 + Math.random() * 7; var bx0 = 0.15 + Math.random() * 0.7, by0 = 0, pts = [[bx0, 0]], br = null, n2 = 9 + (Math.random() * 5 | 0), j;
        for (j = 0; j < n2; j++) { bx0 += (Math.random() - 0.5) * 0.11; by0 += 0.03 + Math.random() * 0.045; pts.push([bx0, by0]); if (!br && j > 2 && Math.random() < 0.3) br = [[bx0, by0], [bx0 + 0.07 * (Math.random() < 0.5 ? -1 : 1), by0 + 0.05], [bx0 + 0.11 * (Math.random() < 0.5 ? -1 : 1), by0 + 0.11]]; }
        this.bolt = [pts, br]; }
      var dt = t - (this.f0 == null ? -99 : this.f0); if (dt >= 0 && dt < 1.2) fl = Math.max(Math.exp(-dt * 11), dt > 0.14 ? 0.8 * Math.exp(-(dt - 0.14) * 8) : 0);
      if (fl > 0.02 && this.bolt) { g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.shadowColor = 'rgba(170,200,255,.95)'; g.shadowBlur = 16; g.strokeStyle = 'rgba(244,248,255,' + Math.min(1, fl * 1.3).toFixed(3) + ')';
        this.bolt.forEach(function (ln, q) { if (!ln) return; g.lineWidth = q ? 1 : 2; g.beginPath(); ln.forEach(function (pp, z) { g[z ? 'lineTo' : 'moveTo'](pp[0] * w, pp[1] * h); }); g.stroke(); }); g.restore(); } }
    else this.nf = 0;
    // 4. les nuages : ils traversent l'écran de gauche à droite ; fins et étirés quand le ciel est seulement voilé
    if (st.cloud > 0.02) {
      var thin = st.cloud < 0.6, n = Math.ceil(PUFFS.length * (0.35 + 0.65 * st.cloud)), base = (0.16 + 0.42 * st.cloud), sxk = thin ? 1.9 : 1.15, syk = thin ? 0.42 : 0.82;
      for (i = 0; i < n; i++) { var p = PUFFS[i], cx = (((p.x + t * p.sp * 1.7) % 2.6) - 0.8) * w, cy = p.y * h * (thin ? 0.8 : 1), cw = p.w * w; if (cx - cw * 1.5 > w || cx + cw * 1.5 < 0) continue;
        p.b.forEach(function (b) { var bx = cx + b[0] * cw * sxk, by = cy + b[1] * cw * syk, br = b[2] * cw, cgd = g.createRadialGradient(0, 0, 0, 0, 0, br);
          cgd.addColorStop(0, 'rgba(' + st.cloudRGB + ',' + base.toFixed(3) + ')'); cgd.addColorStop(0.55, 'rgba(' + st.cloudRGB + ',' + (base * 0.5).toFixed(3) + ')'); cgd.addColorStop(1, 'rgba(' + st.cloudRGB + ',0)');
          g.setTransform(dpr * sxk, 0, 0, dpr * syk, dpr * bx, dpr * by); g.fillStyle = cgd; g.fillRect(-br, -br, br * 2, br * 2); }); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (st.cloud > 0.6) { g.fillStyle = 'rgba(' + st.veilRGB + ',' + ((st.cloud - 0.6) * 1.1).toFixed(3) + ')'; g.fillRect(0, 0, w, h); }
    }
    // 5. la pluie : des gouttes de longueurs et de vitesses différentes, et la brume du bas ; plus drue sous l'orage
    if (st.rain) { g.lineCap = 'round'; var k = st.rain;
      for (i = 0; i < DROPS.length; i++) { var d = DROPS[i], dy = (((d.y + t * d.v * 0.95 * k) % 1.16) - 0.08) * h, dx = ((d.x + (dy / h) * 0.05 * k) % 1) * w, len = d.l * h * (0.8 + 0.3 * k);
        g.strokeStyle = 'rgba(' + st.rainRGB + ',' + Math.min(0.6, d.a * k).toFixed(3) + ')'; g.lineWidth = d.w; g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx - len * 0.06 * k, dy - len); g.stroke(); }
      var mi = g.createLinearGradient(0, h * 0.55, 0, h); mi.addColorStop(0, 'rgba(' + st.veilRGB + ',0)'); mi.addColorStop(1, 'rgba(' + st.veilRGB + ',.30)'); g.fillStyle = mi; g.fillRect(0, 0, w, h); }
    // 6. l'éclair illumine tout le ciel, par-dessus les nuages, puis s'éteint en deux temps
    if (fl > 0.02) { g.fillStyle = 'rgba(214,226,255,' + (0.46 * fl).toFixed(3) + ')'; g.fillRect(0, 0, w, h); }
  };
  root.D2Sky = { Sky: Sky, moonPath: moonPath };
})(window);

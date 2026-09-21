/* Puente mínimo: la clase original se escribió como componente; aquí se
   instancia una sola vez sobre el documento ya renderizado. */
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(next) { Object.assign(this.state, typeof next === 'function' ? next(this.state) : next); }
  forceUpdate() {}
}

class Component extends DCLogic {
  componentDidMount() {
    // Only the newest instance drives the page: older hot-reloaded copies would
    // each run their own loop and fight over the same styles (visible jitter).
    this.token = window.__orbToken = (window.__orbToken || 0) + 1;
    this.applyTheme();
    this.revealed = new WeakSet();
    this.cx = this.cy = this.tx = this.ty = -100;
    this.cursorSize = 14;
    this.fine = window.matchMedia('(pointer:fine)').matches;
    this.reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    // Contexto = orbit. The three titles circle a hub; hovering one halts the
    // orbit and unfolds its paragraph in the centre. Stacked fallback in markup.
    this.interactive = this.fine && !this.reduced;
    this.angle = -Math.PI / 2;
    this.speed = 0;
    this.active = null;
    this.orbit = false;
    this._w = 0;

    this.onMove = e => { this.tx = e.clientX; this.ty = e.clientY; };
    window.addEventListener('pointermove', this.onMove, { passive: true });

    this.onOver = e => {
      const t = e.target;
      if (!t.closest || !this.owner()) return;
      if (t.closest('a')) this.cursorSize = 46;
      const m = t.closest('[data-media]');
      if (m) { const i = m.querySelector('img'); if (i) { i.style.transform = 'scale(1.035)'; i.style.filter = 'grayscale(0)'; } }
      const b = t.closest('[data-btn]');
      if (b) { b.style.background = 'var(--acc)'; b.style.color = '#fff'; b.style.borderColor = 'var(--acc)'; }
      const n = t.closest('[data-next]');
      if (n) { n.style.paddingLeft = '18px'; n.style.color = 'var(--acc)'; }
      const demo = t.closest('[data-demo]');
      if (demo) this.setDemo(demo, true);
      const orb = t.closest('[data-orb-row]');
      if (orb) {
        this.ensureLayout();
        // Hover state lives in the DOM, so a hot-reloaded instance can't lose it.
        document.querySelectorAll('[data-orb-on]').forEach(el => el.removeAttribute('data-orb-on'));
        orb.setAttribute('data-orb-on', '');
        const sect = orb.closest('section');
        const sr = sect ? sect.getBoundingClientRect() : { left: 0, top: 0 };
        let ax, ay;
        if (e.type === 'pointerover' && e.clientX !== undefined) { ax = e.clientX; ay = e.clientY; }
        else { const b = orb.getBoundingClientRect(); ax = b.right - 12; ay = b.bottom - 12; }
        orb.dataset.ax = Math.round(ax - sr.left);
        orb.dataset.ay = Math.round(ay - sr.top);
        this.applyPanels(); // synchronous: never wait for a frame
      }
    };
    this.onOut = e => {
      const t = e.target;
      if (!t.closest || !this.owner()) return;
      if (t.closest('a')) this.cursorSize = 14;
      const m = t.closest('[data-media]');
      if (m) { const i = m.querySelector('img'); if (i) { i.style.transform = 'none'; i.style.filter = 'grayscale(.55)'; } }
      const b = t.closest('[data-btn]');
      if (b) { b.style.background = ''; b.style.color = ''; b.style.borderColor = ''; this.resetBtn(b); }
      const n = t.closest('[data-next]');
      if (n && !(e.relatedTarget && n.contains(e.relatedTarget))) { n.style.paddingLeft = '0px'; n.style.color = ''; }
      const demo = t.closest('[data-demo]');
      if (demo && !(e.relatedTarget && demo.contains(e.relatedTarget))) this.setDemo(demo, false);
      const orb = t.closest('[data-orb-row]');
      if (orb && !(e.relatedTarget && orb.contains(e.relatedTarget))) {
        orb.removeAttribute('data-orb-on');
        this.applyPanels();
      }
    };
    document.addEventListener('pointerover', this.onOver);
    document.addEventListener('pointerout', this.onOut);
    document.addEventListener('focusin', this.onOver);
    document.addEventListener('focusout', this.onOut);

    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { this.revealed.add(e.target); this.paint(e.target); this.io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    }
    this.setupReveal();
    this.safety = setTimeout(() => {
      document.querySelectorAll('[data-reveal]').forEach(el => { this.revealed.add(el); this.paint(el); });
    }, 2000);

    // Layout and panel state must not depend on rAF ever running.
    this.layout();
    this.placeRows();
    this.applyPanels();
    this.onResize = () => {
      if (!this.owner()) return;
      this._w = 0; this.layout(); this.placeRows(); this.applyPanels();
    };
    window.addEventListener('resize', this.onResize);

    // ResizeObserver fires on observe and whenever layout settles — no rAF needed.
    const wrap = document.querySelector('[data-wrap]');
    if (wrap && 'ResizeObserver' in window) {
      this.ro = new ResizeObserver(this.onResize);
      this.ro.observe(wrap);
    }
    setTimeout(this.onResize, 120);
    setTimeout(this.onResize, 600);
    setTimeout(this.onResize, 1500);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(this.onResize);

    // The template being re-rendered wipes the imperative orbit styles; watch for it.
    if ('MutationObserver' in window && wrap) {
      this.mo = new MutationObserver(() => {
        clearTimeout(this._moT);
        this._moT = setTimeout(() => this.ensureLayout(), 60);
      });
      this.mo.observe(wrap, { childList: true, subtree: true });
    }

    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  // The primary button is inverted by default; restore its own palette on leave.
  resetBtn(b) {
    const primary = b.getAttribute('href') && b.getAttribute('href').indexOf('github.com') === -1;
    if (primary) { b.style.background = 'var(--surf-ink)'; b.style.color = 'var(--surf)'; b.style.borderColor = 'var(--surf-ink)'; }
    else { b.style.background = 'transparent'; b.style.color = 'var(--surf-ink)'; b.style.borderColor = 'rgba(8,8,10,.35)'; }
  }

  paint(el) { el.style.opacity = '1'; el.style.transform = 'none'; }

  // Re-applies layout whenever the DOM is not actually in the state we want —
  // a re-render restores the template's static styles and a width check misses it.
  ensureLayout() {
    if (!this.owner()) return;
    const row = document.querySelector('[data-orb-row]');
    const stale = !row || (this.orbit === true && row.style.position !== 'absolute');
    if (stale || this._w !== (document.querySelector('[data-wrap]') || {}).clientWidth) {
      this.layout();
      this.placeRows();
      this.applyPanels();
    }
  }

  // Size type so the longest WORD fits the circle — measured, not estimated.
  fitFont(text, avail) {
    if (!this._ctx) this._ctx = document.createElement('canvas').getContext('2d');
    const ctx = this._ctx;
    ctx.font = '700 100px Syne, system-ui, sans-serif';
    let widest = 0;
    String(text || '').trim().split(/\s+/).forEach(w => {
      widest = Math.max(widest, ctx.measureText(w).width);
    });
    if (!widest) return 18;
    return Math.max(12, Math.min(20, Math.floor((avail / (widest / 100)) * 0.98)));
  }

  keep(el) {
    if (el && el.dataset && el.dataset.keepStyle === undefined) el.dataset.keepStyle = el.getAttribute('style') || '';
    return el;
  }
  restore(el) {
    if (el && el.dataset && el.dataset.keepStyle !== undefined) el.setAttribute('style', el.dataset.keepStyle);
  }

  // Paragraphs are found by their stable index, never by tree position — an
  // earlier version lost them when they were re-parented.
  textFor(row, i) {
    if (i === undefined) i = Array.from(document.querySelectorAll('[data-orb-row]')).indexOf(row);
    return document.querySelector('[data-orb-text][data-orb-idx="' + i + '"]') || row.querySelector('[data-orb-text]');
  }

  layout() {
    const wrap = document.querySelector('[data-wrap]');
    if (!wrap) return;
    const stages = Array.from(document.querySelectorAll('[data-stage]'));
    const allRows = Array.from(document.querySelectorAll('[data-orb-row]'));
    if (!stages.length || !allRows.length) return;

    this.keep(wrap);
    stages.forEach(st => { this.keep(st); this.keep(st.closest('[data-group]')); });
    allRows.forEach((r, i) => {
      this.keep(r);
      this.keep(r.querySelector('[data-orb-title]'));
      this.keep(this.textFor(r, i));
    });

    const total = wrap.clientWidth;
    this._w = total; // layout() owns the cached width: otherwise it re-runs forever
    this.orbit = this.interactive && total >= 760;

    if (!this.orbit) {
      this.restore(wrap);
      stages.forEach(st => {
        this.restore(st);
        this.restore(st.closest('[data-group]'));
        st.querySelectorAll('[data-ring],[data-spoke],[data-hub]').forEach(el => { el.style.display = 'none'; });
      });
      allRows.forEach((r, i) => {
        this.restore(r);
        this.restore(r.querySelector('[data-orb-title]'));
        const p = this.textFor(r, i);
        if (p) { if (p.parentNode !== r) r.insertBefore(p, null); this.restore(p); }
      });
      return;
    }

    // Two orbits side by side, each in its own square stage.
    const gap = 180;
    const stageW = Math.min(Math.floor((total - gap * (stages.length - 1)) / stages.length), 420);
    const panelW = Math.min(460, Math.max(320, Math.round(total * 0.44)));

    wrap.style.flexDirection = 'row';
    wrap.style.flexWrap = 'nowrap';
    wrap.style.alignItems = 'flex-start';
    wrap.style.justifyContent = 'center';
    wrap.style.gap = gap + 'px';

    stages.forEach(st => {
      const grp = st.closest('[data-group]');
      if (grp) { grp.style.flex = '0 0 auto'; grp.style.width = stageW + 'px'; }
      st.style.flex = '0 0 auto';
      st.style.width = stageW + 'px';
      st.style.height = stageW + 'px';
      st.style.maxWidth = 'none';
      st.style.margin = '0';
      st.style.display = 'block';

      const R = stageW * 0.30;
      const D = Math.round(stageW * 0.40);
      st.dataset.r = R.toFixed(2);
      st.dataset.d = D;
      st.dataset.c = (stageW / 2).toFixed(2);

      Array.from(st.querySelectorAll('[data-orb-row]')).forEach(r => {
      r.style.position = 'absolute';
      r.style.transform = 'none';
      r.style.width = D + 'px';
      r.style.height = D + 'px';
      r.style.padding = '14px';
      r.style.border = '1px solid var(--line)';
      r.style.borderRadius = '50%';
      r.style.background = 'var(--bg)';
      r.style.display = 'flex';
      r.style.alignItems = 'center';
      r.style.justifyContent = 'center';
      r.style.textAlign = 'center';
      r.style.zIndex = '2';
      r.style.transition = 'border-color .5s ease,background .6s ease,box-shadow .6s ease,opacity 1s cubic-bezier(.16,1,.3,1)';

      const t = r.querySelector('[data-orb-title]');
      if (t) {
        t.style.margin = '0';
        t.style.width = '100%';
        t.style.textAlign = 'center';
        t.style.textWrap = 'balance';
        t.style.hyphens = 'none';
        t.style.fontSize = this.fitFont(t.textContent, D - 30) + 'px';
        t.style.lineHeight = '1.1';
      }
      const p = this.textFor(r);
      const sect = r.closest('section');
      if (p) {
        // Absolute inside the (untransformed) section: no fixed-position clipping
        // from ancestors, and it still paints over later sections via z-index.
        if (sect && p.parentNode !== sect) sect.appendChild(p);
        if (sect && getComputedStyle(sect).position === 'static') sect.style.position = 'relative';
        p.style.position = 'absolute';
        p.style.left = '0px';
        p.style.top = '0px';
        p.style.width = panelW + 'px';
        p.style.maxWidth = 'none';
        p.style.textAlign = 'left';
        p.style.fontSize = '14px';
        p.style.lineHeight = '1.6';
        p.style.color = 'var(--dim)';
        // The frame is drawn with four gradient edges (top, left, right, bottom)
        // so it can grow from the top-left corner round to the bottom-right.
        p.style.border = 'none';
        p.style.backgroundColor = 'var(--bg)';
        p.style.backgroundImage = 'linear-gradient(var(--acc),var(--acc)),linear-gradient(var(--acc),var(--acc)),linear-gradient(var(--acc),var(--acc)),linear-gradient(var(--acc),var(--acc))';
        p.style.backgroundRepeat = 'no-repeat';
        p.style.backgroundPosition = 'left top,left top,right top,left bottom';
        p.style.backgroundSize = '0 1px,1px 0,1px 0,0 1px';
        p.style.padding = '18px 20px';
        p.style.pointerEvents = 'none';
        p.style.zIndex = '9500';
        p.style.transform = 'none';
        p.style.clipPath = 'none';
        // Hide instantly on (re)layout — a transition here would flash all six
        // paragraphs stacked at the section's top-left corner.
        p.style.transition = 'none';
        p.style.opacity = '0';
        void p.offsetWidth;
        p.style.transition = 'opacity .35s ease .12s';
      }
      });

      const d = Math.round(R * 2);
      const ring = st.querySelector('[data-ring]');
      if (ring) {
        ring.style.display = 'block';
        ring.style.width = d + 'px';
        ring.style.height = d + 'px';
        ring.style.margin = (-d / 2) + 'px 0 0 ' + (-d / 2) + 'px';
      }
      const spoke = st.querySelector('[data-spoke]');
      if (spoke) {
        spoke.style.display = 'block';
        spoke.style.width = Math.round(R - D / 2) + 'px';
      }
      const hub = st.querySelector('[data-hub]');
      if (hub) hub.style.display = 'block';
    });
  }

  // Continuous drift only. Discrete state lives in placeRows/applyPanels so it
  // is correct even if not a single frame ever runs.
  orbitTick() {
    const wrap = document.querySelector('[data-wrap]');
    if (!wrap) return;
    const total = wrap.clientWidth;
    if (total !== this._w) { this._w = total; this.layout(); }
    if (!this.orbit) return;

    const anyOn = !!document.querySelector('[data-orb-on]');
    const target = anyOn ? 0 : 0.0016;
    this.speed += (target - this.speed) * 0.05;
    this.angle += this.speed;
    this.placeRows();
  }

  placeRows() {
    if (!this.orbit) return;
    const breath = 1 + Math.sin(Date.now() / 2600) * 0.018;
    Array.from(document.querySelectorAll('[data-stage]')).forEach((st, s) => {
      const R = parseFloat(st.dataset.r || 0);
      const D = parseFloat(st.dataset.d || 0);
      const c = parseFloat(st.dataset.c || 0);
      if (!R) return;
      const dir = s % 2 ? -1 : 1; // the second orbit turns the other way
      Array.from(st.querySelectorAll('[data-orb-row]')).forEach((r, i) => {
        const a = dir * this.angle + i * (Math.PI * 2 / 3) + (s ? Math.PI / 6 : 0);
        r.dataset.ang = a.toFixed(4);
        r.style.left = (c + Math.cos(a) * R * breath - D / 2).toFixed(1) + 'px';
        r.style.top = (c + Math.sin(a) * R * breath - D / 2).toFixed(1) + 'px';
      });
      const spoke = st.querySelector('[data-spoke]');
      const on = st.querySelector('[data-orb-on]');
      if (spoke && on && on.dataset.ang) spoke.style.transform = 'rotate(' + on.dataset.ang + 'rad)';
    });
  }

  applyPanels() {
    const rows = Array.from(document.querySelectorAll('[data-orb-row]'));
    if (!rows.length) return;
    const anyOn = !!document.querySelector('[data-orb-on]');

    rows.forEach((r, i) => {
      const on = r.hasAttribute('data-orb-on');
      if (this.orbit) {
        r.style.borderColor = on ? 'var(--acc)' : 'var(--line)';
        r.style.background = on ? 'color-mix(in oklab,var(--acc),#08080a 88%)' : 'var(--bg)';
        r.style.boxShadow = on ? '0 0 0 8px color-mix(in oklab,var(--acc),transparent 84%)' : 'none';
      }
      const t = r.querySelector('[data-orb-title]');
      if (t) t.style.color = on ? 'var(--acc)' : (anyOn && this.orbit ? 'var(--dim)' : '');

      const p = this.textFor(r, i);
      if (!p || !this.orbit) return;
      if (!on) {
        p.style.opacity = '0';
        p.style.animation = 'none';
        p.style.backgroundSize = '0 1px,1px 0,1px 0,0 1px';
        return;
      }
      // A corner always stays on the cursor: the box flips instead of sliding.
      const sect = r.closest('section');
      const sr = sect ? sect.getBoundingClientRect() : { left: 0, top: 0 };
      const pw = p.offsetWidth || 320;
      const ph = p.offsetHeight || 200;
      const ax = parseFloat(r.dataset.ax || 0);
      const ay = parseFloat(r.dataset.ay || 0);
      const vw = window.innerWidth;
      const vh2 = window.innerHeight;
      const cxv = sr.left + ax;
      const cyv = sr.top + ay;

      let x = cxv + pw + 12 <= vw ? ax : ax - pw;
      let y = cyv + ph + 12 <= vh2 ? ay : ay - ph;
      if (sr.left + x < 12) x = 12 - sr.left;
      if (sr.left + x + pw > vw - 12) x = vw - 12 - pw - sr.left;
      if (sr.top + y < 12) y = 12 - sr.top;

      p.style.transformOrigin = (x < ax ? 'right' : 'left') + ' ' + (y < ay ? 'bottom' : 'top');
      p.style.left = Math.round(x) + 'px';
      p.style.top = Math.round(y) + 'px';
      p.style.opacity = '1';
      if (p.style.animationName !== 'draw-frame') {
        p.style.animation = 'none';
        void p.offsetWidth; // restart the draw on every open
        p.style.animation = 'draw-frame 1.9s cubic-bezier(.22,1,.3,1) forwards';
      }
    });

    Array.from(document.querySelectorAll('[data-stage]')).forEach(st => {
      const stOn = !!st.querySelector('[data-orb-on]');
      const ring = st.querySelector('[data-ring]');
      if (ring && this.orbit) ring.style.borderColor = stOn ? 'color-mix(in oklab,var(--acc),transparent 55%)' : 'var(--line)';
      const spoke = st.querySelector('[data-spoke]');
      if (spoke) spoke.style.opacity = stOn && this.orbit ? '1' : '0';
    });
  }

  setupReveal() {
    const vh = window.innerHeight || 800;
    document.querySelectorAll('[data-reveal]').forEach(el => {
      if (this.revealed.has(el)) { this.paint(el); return; }
      if (this.reduced || !this.io || el.getBoundingClientRect().top < vh * 0.9) {
        this.revealed.add(el); this.paint(el); return;
      }
      el.style.opacity = '0';
      el.style.transform = 'translateY(34px)';
      this.io.observe(el);
    });
  }

  q(key, sel) {
    this._c = this._c || {};
    const hit = this._c[key];
    if (hit && hit.isConnected) return hit;
    return (this._c[key] = document.querySelector(sel));
  }

  // One bad frame must never stop the page's motion.
  owner() { return window.__orbToken === this.token; }

  setDemo(demo, on) {
    const veil = demo.querySelector('[data-demo-veil]');
    if (veil) veil.style.opacity = on ? '1' : '0';
    const wrap = demo.querySelector('[data-demo-actions]');
    if (wrap) wrap.style.pointerEvents = on ? 'auto' : 'none';
    demo.querySelectorAll('[data-demo-btn]').forEach((b, i) => {
      b.style.transitionDelay = on ? (120 + i * 90) + 'ms' : '0ms';
      b.style.opacity = on ? '1' : '0';
      b.style.transform = on ? 'none' : 'translateY(14px)';
    });
  }

  tick() {
    if (!this.owner()) return; // stale instance: let its loop end
    try { this.frame(); }
    catch (err) {
      if (!this._logged) { this._logged = true; console.warn('frame error', err); }
    }
    this.raf = requestAnimationFrame(this.tick);
  }

  frame() {
    const vh = window.innerHeight;
    const y = window.scrollY || document.documentElement.scrollTop;

    const title = this.q('title', '[data-title]');
    if (title) title.style.transform = 'translate3d(0,' + (-y * 0.12).toFixed(1) + 'px,0)';

    const halo = this.q('halo', '[data-halo]');
    if (halo) halo.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)';

    const haloEnd = this.q('haloEnd', '[data-halo-end]');
    if (haloEnd) {
      const r = haloEnd.getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, (vh - r.top) / vh));
      haloEnd.style.transform = 'translate3d(0,' + (-p * 60).toFixed(1) + 'px,0)';
    }

    const bar = this.q('bar', '[data-bar]');
    if (bar) {
      const max = document.documentElement.scrollHeight - vh;
      bar.style.width = (max > 0 ? (y / max) * 100 : 0).toFixed(2) + '%';
    }

    try { this.orbitTick(); }
    catch (err) {
      if (!this._orbLogged) { this._orbLogged = true; console.warn('orbit error', err); }
    }

    document.querySelectorAll('[data-reveal]').forEach(el => {
      if (!this.revealed.has(el) && el.getBoundingClientRect().top < vh * 0.9) this.revealed.add(el);
      if (this.revealed.has(el) && el.style.opacity !== '1') this.paint(el);
    });

    const cur = this.q('cursor', '[data-cursor]');
    if (cur) {
      if (this.fine && !this.reduced && (this.props.customCursor ?? true) && this.tx > -50) {
        this.cx += (this.tx - this.cx) * 0.18;
        this.cy += (this.ty - this.cy) * 0.18;
        const s = this.cursorSize / 2;
        cur.style.opacity = '1';
        cur.style.width = this.cursorSize + 'px';
        cur.style.height = this.cursorSize + 'px';
        cur.style.transform = 'translate3d(' + (this.cx - s) + 'px,' + (this.cy - s) + 'px,0)';
      } else cur.style.opacity = '0';
    }
  }

  componentDidUpdate() {
    this.applyTheme();
    this.setupReveal();
    this._w = 0;
    this.ensureLayout();
  }

  applyTheme() {
    const s = document.documentElement.style;
    s.setProperty('--acc', this.props.accentColor ?? '#ff4d1f');
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.safety);
    if (this.io) this.io.disconnect();
    if (this.ro) this.ro.disconnect();
    if (this.mo) this.mo.disconnect();
    clearTimeout(this._moT);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('pointerover', this.onOver);
    document.removeEventListener('pointerout', this.onOut);
    document.removeEventListener('focusin', this.onOver);
    document.removeEventListener('focusout', this.onOut);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var c = new Component({});
  if (c.componentDidMount) c.componentDidMount();
  window.addEventListener('pagehide', function () { if (c.componentWillUnmount) c.componentWillUnmount(); });
});

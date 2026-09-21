/* Puente mínimo: la clase original se escribió como componente; aquí se
   instancia una sola vez sobre el documento ya renderizado. */
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(next) { Object.assign(this.state, typeof next === 'function' ? next(this.state) : next); }
  forceUpdate() {}
}

class Component extends DCLogic {
  componentDidMount() {
    this.token = window.__lumToken = (window.__lumToken || 0) + 1;
    this.applyTheme();
    this.revealed = new WeakSet();
    this.cx = this.cy = this.tx = this.ty = -100;
    this.cursorSize = 14;
    this.fine = window.matchMedia('(pointer:fine)').matches;
    this.reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    this.onMove = e => { this.tx = e.clientX; this.ty = e.clientY; };
    window.addEventListener('pointermove', this.onMove, { passive: true });

    this.onOver = e => {
      const t = e.target;
      if (!t.closest || !this.owner()) return;
      if (t.closest('a')) this.cursorSize = 46;
      const sw = t.closest('[data-swatch]');
      if (sw) sw.style.transform = 'translateY(-6px)';
      const an = t.closest('[data-anat]');
      if (an) { an.setAttribute('data-anat-on', ''); this.setAnat(an, true); }
      const demo = t.closest('[data-demo]');
      if (demo) { demo.setAttribute('data-demo-on', ''); this.setDemo(demo, true); }
      const b = t.closest('[data-btn]');
      if (b) { b.style.background = 'var(--acc)'; b.style.color = '#fff'; b.style.borderColor = 'var(--acc)'; }
      const n = t.closest('[data-next]');
      if (n) { n.style.paddingLeft = '18px'; n.style.color = 'var(--acc)'; }
    };

    this.onOut = e => {
      const t = e.target;
      if (!t.closest || !this.owner()) return;
      if (t.closest('a')) this.cursorSize = 14;
      const sw = t.closest('[data-swatch]');
      if (sw) sw.style.transform = 'none';
      const an = t.closest('[data-anat]');
      if (an && !(e.relatedTarget && an.contains(e.relatedTarget))) { an.removeAttribute('data-anat-on'); this.setAnat(an, false); }
      const demo = t.closest('[data-demo]');
      if (demo && !(e.relatedTarget && demo.contains(e.relatedTarget))) { demo.removeAttribute('data-demo-on'); this.setDemo(demo, false); }
      const b = t.closest('[data-btn]');
      if (b) { b.style.background = 'var(--surf-ink)'; b.style.color = 'var(--surf)'; b.style.borderColor = 'var(--surf-ink)'; }
      const n = t.closest('[data-next]');
      if (n && !(e.relatedTarget && n.contains(e.relatedTarget))) { n.style.paddingLeft = '0px'; n.style.color = ''; }
    };

    document.addEventListener('pointerover', this.onOver);
    document.addEventListener('pointerout', this.onOut);
    document.addEventListener('focusin', this.onOver);
    document.addEventListener('focusout', this.onOut);

    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) { this.revealed.add(e.target); this.paint(e.target); this.io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    }
    this.setupReveal();
    this.safety = setTimeout(() => {
      document.querySelectorAll('[data-reveal]').forEach(el => { this.revealed.add(el); this.paint(el); });
    }, 2000);

    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  owner() { return window.__lumToken === this.token; }

  // Hover state lives in the DOM and is re-asserted every frame: React
  // re-reconciles the template's shorthands over one-shot style writes.
  applyHover() {
    document.querySelectorAll('[data-anat]').forEach(card => {
      this.setAnat(card, card.hasAttribute('data-anat-on'));
    });
    document.querySelectorAll('[data-demo]').forEach(demo => {
      this.setDemo(demo, demo.hasAttribute('data-demo-on'));
    });
  }

  // Wireframe cells light up together, as one diagram rather than one box.
  setAnat(card, on) {
    card.style.border = '1px solid ' + (on ? 'var(--acc)' : 'var(--line)');
    const code = card.querySelector('[data-anat-code]');
    if (code) code.style.color = on ? 'var(--acc)' : 'var(--dim)';
    card.querySelectorAll('[data-anat-cell]').forEach((cell, i) => {
      cell.style.transitionDelay = on ? (i * 70) + 'ms' : '0ms';
      cell.style.border = '1px dashed ' + (on ? 'color-mix(in oklab,var(--acc),transparent 40%)' : 'var(--line)');
      cell.style.background = on ? 'color-mix(in oklab,var(--acc),transparent 93%)' : 'transparent';
    });
    const img = card.querySelector('img');
    if (img) { img.style.opacity = on ? '1' : '.62'; img.style.filter = on ? 'grayscale(0)' : 'grayscale(1)'; }
  }

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

  paint(el) { el.style.opacity = '1'; el.style.transform = 'none'; }

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

  tick() {
    if (!this.owner()) return;
    try { this.frame(); } catch (err) {
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

    document.querySelectorAll('[data-reveal]').forEach(el => {
      if (!this.revealed.has(el) && el.getBoundingClientRect().top < vh * 0.9) this.revealed.add(el);
      if (this.revealed.has(el) && el.style.opacity !== '1') this.paint(el);
    });

    this.applyHover();

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

  componentDidUpdate() { this.applyTheme(); this.setupReveal(); }

  applyTheme() {
    document.documentElement.style.setProperty('--acc', this.props.accentColor ?? '#ff4d1f');
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.safety);
    if (this.io) this.io.disconnect();
    window.removeEventListener('pointermove', this.onMove);
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

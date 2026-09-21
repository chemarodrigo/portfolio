/* Puente mínimo: la clase original se escribió como componente; aquí se
   instancia una sola vez sobre el documento ya renderizado. */
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(next) { Object.assign(this.state, typeof next === 'function' ? next(this.state) : next); }
  forceUpdate() {}
}

class Component extends DCLogic {
  componentDidMount() {
    this.applyTheme();
    this.revealed = new WeakSet();
    this.portraitOpen = false;
    this.cx = this.cy = this.tx = this.ty = -100;
    this.cursorSize = 14;
    this.fine = window.matchMedia('(pointer:fine)').matches;

    this.onMove = e => { this.tx = e.clientX; this.ty = e.clientY; };
    window.addEventListener('pointermove', this.onMove, { passive: true });

    // Delegated hover — survives any re-render that replaces DOM nodes
    this.onOver = e => {
      const t = e.target;
      if (t.closest && t.closest('[data-title]')) this.portraitOpen = true;
      if (t.closest && t.closest('a')) this.cursorSize = 46;
      const m = t.closest && t.closest('[data-media]');
      if (m) { const i = m.querySelector('img'); if (i) { i.style.transform = 'scale(1.045)'; i.style.filter = 'grayscale(0)'; } }
      const r = t.closest && t.closest('[data-row]');
      if (r) { this.openMeta.add(r); this.setMeta(r, true); }
    };
    this.onOut = e => {
      const t = e.target;
      if (t.closest && t.closest('[data-title]')) this.portraitOpen = false;
      if (t.closest && t.closest('a')) this.cursorSize = 14;
      const m = t.closest && t.closest('[data-media]');
      if (m) { const i = m.querySelector('img'); if (i) { i.style.transform = 'none'; i.style.filter = 'grayscale(.55)'; } }
      const r = t.closest && t.closest('[data-row]');
      if (r && !(e.relatedTarget && r.contains(e.relatedTarget))) { this.openMeta.delete(r); this.setMeta(r, false); }
    };
    document.addEventListener('pointerover', this.onOver);
    document.addEventListener('pointerout', this.onOut);

    setTimeout(() => { this.portraitOpen = true; }, 1300);
    setTimeout(() => { this.portraitOpen = false; }, 3300);

    this.reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    // Expandable rows (Formación / Habilidades). Open by default in markup;
    // JS collapses them only when it can also re-open them.
    this.openRows = new WeakSet();
    this.openMeta = new WeakSet();
    if (this.fine && !this.reduced) document.querySelectorAll('[data-row]').forEach(r => this.setMeta(r, false));
    if (this.fine && !this.reduced) document.querySelectorAll('[data-open-row]').forEach(r => this.setRow(r, false));
    else document.querySelectorAll('[data-open-row]').forEach(r => { r.style.cursor = 'pointer'; });
    this.onRowOver = e => {
      const row = e.target.closest && e.target.closest('[data-open-row]');
      if (row && this.fine && !this.reduced) { this.openRows.add(row); this.setRow(row, true); }
    };
    this.onRowOut = e => {
      const row = e.target.closest && e.target.closest('[data-open-row]');
      if (!row || !this.fine || this.reduced) return;
      if (e.relatedTarget && row.contains(e.relatedTarget)) return;
      this.openRows.delete(row); this.setRow(row, false);
    };
    this.onRowTap = e => {
      if (this.fine && !this.reduced) return; // hover owns the state on desktop
      const row = e.target.closest && e.target.closest('[data-open-row]');
      if (!row) return;
      const open = !this.openRows.has(row);
      open ? this.openRows.add(row) : this.openRows.delete(row);
      this.setRow(row, open);
    };
    document.addEventListener('pointerover', this.onRowOver);
    document.addEventListener('pointerout', this.onRowOut);
    document.addEventListener('click', this.onRowTap);
    document.addEventListener('focusin', this.onRowOver);
    document.addEventListener('focusout', this.onRowOut);
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { this.revealed.add(e.target); this.paint(e.target); this.io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    }
    this.setupReveal();

    this.safety = setTimeout(() => {
      document.querySelectorAll('[data-reveal]').forEach(el => { this.revealed.add(el); this.paint(el); });
    }, 2000);

    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  paint(el) { el.style.opacity = '1'; el.style.transform = 'none'; }

  setMeta(row, open) {
    const meta = row.querySelector('[data-meta]');
    if (meta) {
      meta.style.opacity = open ? '1' : '0';
      meta.style.transform = open ? 'none' : 'translateX(-34px)';
      meta.style.clipPath = open ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)';
    }
    row.style.paddingLeft = open ? '18px' : '0px';
    row.style.color = open ? 'var(--acc)' : '';
  }

  applyMeta() {
    document.querySelectorAll('[data-row]').forEach(row => {
      const open = this.openMeta.has(row) || !this.fine || this.reduced;
      const meta = row.querySelector('[data-meta]');
      const want = open ? '1' : '0';
      if (meta && meta.style.opacity !== want) this.setMeta(row, open);
    });
  }

  setRow(row, open) {
    const panel = row.querySelector('[data-panel]');
    if (panel) panel.style.gridTemplateRows = open ? '1fr' : '0fr';
    const head = row.querySelector('[data-head]');
    if (head) {
      head.style.color = open ? 'var(--acc)' : '';
      head.style.transform = open ? 'translateX(10px)' : 'none';
    }
    const plus = row.querySelector('[data-plus]');
    if (plus) plus.style.transform = open ? 'rotate(45deg) scale(1.15)' : 'none';
    row.querySelectorAll('[data-stag]').forEach((el, i) => {
      el.style.transitionDelay = open ? (60 + i * 70) + 'ms' : '0ms';
      el.style.opacity = open ? '1' : '0';
      el.style.transform = open ? 'none' : 'translateY(16px)';
    });
  }

  applyRows() {
    document.querySelectorAll('[data-open-row]').forEach(row => {
      const open = this.openRows.has(row) || !this.fine || this.reduced;
      const panel = row.querySelector('[data-panel]');
      const want = open ? '1fr' : '0fr';
      if (panel && panel.style.gridTemplateRows !== want) this.setRow(row, open);
    });
  }

  // Content starts visible in the template; JS opts into the hidden state,
  // so a throttled rAF or a blocked observer can never hide the page.
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
    const vh = window.innerHeight;
    const y = window.scrollY || document.documentElement.scrollTop;

    const title = this.q('title', '[data-title]');
    if (title) {
      const p = Math.min(1, y / (vh * 0.9));
      title.style.transform = 'translate3d(0,' + (-y * 0.18).toFixed(1) + 'px,0)';
      title.style.opacity = (1 - p * 0.85).toFixed(3);
    }
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

    this.applyRows();
    this.applyMeta();


    const portrait = this.q('portrait', '[data-portrait]');
    if (portrait) {
      const w = this.portraitOpen ? '1.25em' : '.62em';
      if (portrait.style.width !== w) {
        portrait.style.width = w;
        portrait.style.borderRadius = this.portraitOpen ? '6px' : '999px';
      }
    }

    // Stacked project cards
    const cards = Array.from(document.querySelectorAll('[data-card]'));
    const top = Math.min(104, Math.max(70, vh * 0.09));
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) { card.style.transform = 'none'; card.style.filter = 'none'; card.style.opacity = '1'; return; }
      const dist = next.getBoundingClientRect().top - top;
      const span = card.getBoundingClientRect().height || 1;
      const p = Math.max(0, Math.min(1, 1 - dist / span));
      card.style.transform = 'scale(' + (1 - p * 0.07).toFixed(4) + ') translate3d(0,' + (-p * 22).toFixed(1) + 'px,0)';
      card.style.filter = 'blur(' + (p * 2.4).toFixed(2) + 'px)';
      card.style.opacity = (1 - p * 0.35).toFixed(3);
    });

    const cur = this.q('cursor', '[data-cursor]');
    if (cur) {
      if (this.fine && (this.props.customCursor ?? true) && this.tx > -50) {
        this.cx += (this.tx - this.cx) * 0.18;
        this.cy += (this.ty - this.cy) * 0.18;
        const s = this.cursorSize / 2;
        cur.style.opacity = '1';
        cur.style.width = this.cursorSize + 'px';
        cur.style.height = this.cursorSize + 'px';
        cur.style.transform = 'translate3d(' + (this.cx - s) + 'px,' + (this.cy - s) + 'px,0)';
      } else cur.style.opacity = '0';
    }

    this.raf = requestAnimationFrame(this.tick);
  }

  componentDidUpdate() { this.applyTheme(); this.setupReveal(); this.applyRows(); this.applyMeta(); }

  applyTheme() {
    const s = document.documentElement.style;
    s.setProperty('--acc', this.props.accentColor ?? '#ff4d1f');
    const light = this.props.lightProjects ?? true;
    s.setProperty('--surf', light ? '#eae7e0' : '#0f0f12');
    s.setProperty('--surf-ink', light ? '#08080a' : '#edecea');
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.safety);
    if (this.io) this.io.disconnect();
    window.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('pointerover', this.onOver);
    document.removeEventListener('pointerout', this.onOut);
    document.removeEventListener('pointerover', this.onRowOver);
    document.removeEventListener('pointerout', this.onRowOut);
    document.removeEventListener('click', this.onRowTap);
    document.removeEventListener('focusin', this.onRowOver);
    document.removeEventListener('focusout', this.onRowOut);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var c = new Component({});
  if (c.componentDidMount) c.componentDidMount();
  window.addEventListener('pagehide', function () { if (c.componentWillUnmount) c.componentWillUnmount(); });
});

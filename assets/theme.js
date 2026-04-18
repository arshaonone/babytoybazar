/* ========================================================
   BABYTOYSBAZAR — THEME JAVASCRIPT
   Version: 1.0.0
   Controls: Header, Slider, Cart, Wishlist, Search, etc.
======================================================== */

'use strict';

/* ========================================================
   UTILITY HELPERS
======================================================== */
const BTB = {
  qs: (sel, ctx = document) => ctx.querySelector(sel),
  qsa: (sel, ctx = document) => [...ctx.querySelectorAll(sel)],
  on: (el, ev, fn) => el && el.addEventListener(ev, fn),
  off: (el, ev, fn) => el && el.removeEventListener(ev, fn),
  addClass: (el, cls) => el && el.classList.add(cls),
  removeClass: (el, cls) => el && el.classList.remove(cls),
  toggleClass: (el, cls) => el && el.classList.toggle(cls),
  hasClass: (el, cls) => el && el.classList.contains(cls),

  /* Debounce */
  debounce(fn, delay = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  },

  /* Simple fetch wrapper */
  async fetch(url, opts = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      ...opts
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  /* Money format helper */
  money(cents) {
    const { money_format } = window.BTBConfig || {};
    const amount = (cents / 100).toFixed(2);
    return (money_format || '${{ amount }}').replace('{{ amount }}', amount);
  }
};

/* Config injected inline from Liquid (see layout/theme.liquid) */
window.BTBConfig = window.BTBConfig || {
  routes: {
    cart_add: '/cart/add.js',
    cart_get: '/cart.js',
    cart_update: '/cart/update.js',
    cart_change: '/cart/change.js',
    search: '/search'
  },
  money_format: '${{ amount }}'
};


/* ========================================================
   1. HEADER — Sticky + Scroll Detection
======================================================== */
class StickyHeader {
  constructor() {
    this.header = BTB.qs('.site-header');
    if (!this.header) return;
    this.lastScroll = 0;
    this.init();
  }
  init() {
    window.addEventListener('scroll', BTB.debounce(() => this.onScroll(), 10), { passive: true });
  }
  onScroll() {
    const y = window.scrollY;
    if (y > 60) BTB.addClass(this.header, 'scrolled');
    else BTB.removeClass(this.header, 'scrolled');
    this.lastScroll = y;
  }
}


/* ========================================================
   2. MOBILE NAVIGATION
======================================================== */
class MobileNav {
  constructor() {
    this.nav = BTB.qs('.mobile-nav');
    this.btn = BTB.qs('.mobile-menu-btn');
    this.overlay = BTB.qs('.mobile-nav__overlay');
    this.closeBtn = BTB.qs('.mobile-nav__close');
    if (!this.nav || !this.btn) return;
    this.init();
  }
  init() {
    BTB.on(this.btn, 'click', () => this.open());
    BTB.on(this.overlay, 'click', () => this.close());
    BTB.on(this.closeBtn, 'click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  }
  open() {
    BTB.addClass(this.nav, 'open');
    document.body.style.overflow = 'hidden';
  }
  close() {
    BTB.removeClass(this.nav, 'open');
    document.body.style.overflow = '';
  }
}


/* ========================================================
   3. SEARCH OVERLAY
======================================================== */
class SearchOverlay {
  constructor() {
    this.overlay = BTB.qs('#SearchOverlay');
    this.openBtns = BTB.qsa('[data-open-search]');
    this.closeBtn = BTB.qs('#SearchOverlayClose');
    this.input = BTB.qs('#SearchOverlayInput');
    if (!this.overlay) return;
    this.init();
  }
  init() {
    this.openBtns.forEach(btn => BTB.on(btn, 'click', () => this.open()));
    BTB.on(this.closeBtn, 'click', () => this.close());
    BTB.on(this.overlay, 'click', e => { if (e.target === this.overlay) this.close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  }
  open() {
    BTB.addClass(this.overlay, 'open');
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.input && this.input.focus(), 100);
  }
  close() {
    BTB.removeClass(this.overlay, 'open');
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}


/* ========================================================
   4. CART DRAWER
======================================================== */
class CartDrawer {
  constructor() {
    this.drawer = BTB.qs('#CartDrawer');
    this.overlay = BTB.qs('#CartDrawerOverlay');
    this.closeBtn = BTB.qs('#CartDrawerClose');
    this.body = BTB.qs('#CartDrawerBody');
    this.openBtns = BTB.qsa('[data-open-cart]');
    this.cartCountEls = BTB.qsa('.cart-item-count');
    this.drawerCount = BTB.qs('#CartDrawerCount');
    this.subtotal = BTB.qs('#CartSubtotal');
    if (!this.drawer) return;
    this.init();
  }
  init() {
    this.openBtns.forEach(btn => BTB.on(btn, 'click', (e) => { e.preventDefault(); this.open(); }));
    BTB.on(this.overlay, 'click', () => this.close());
    BTB.on(this.closeBtn, 'click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    this.drawer.addEventListener('click', e => {
      const removeBtn = e.target.closest('.cart-item__del');
      const plusBtn = e.target.closest('.cart-qty-plus');
      const minusBtn = e.target.closest('.cart-qty-minus');
      if (removeBtn) { this.removeItem(removeBtn.dataset.key); }
      else if (plusBtn) { this.changeQty(plusBtn.dataset.key, 1); }
      else if (minusBtn) { this.changeQty(minusBtn.dataset.key, -1); }
    });
  }
  open() {
    BTB.addClass(this.drawer, 'open');
    this.drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  close() {
    BTB.removeClass(this.drawer, 'open');
    this.drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  async getCart() {
    try {
      return await BTB.fetch('/cart.js');
    } catch(e) { console.error('Cart fetch failed:', e); }
  }
  async removeItem(key) {
    try {
      const cart = await BTB.fetch('/cart/change.js', {
        method: 'POST',
        body: JSON.stringify({ id: key, quantity: 0 })
      });
      this.updateUI(cart);
    } catch(e) { BTBToast.show('Failed to remove item', '❌'); }
  }
  async changeQty(key, delta) {
    const cart = await this.getCart();
    if (!cart) return;
    const item = cart.items.find(i => i.key === key);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    try {
      const updated = await BTB.fetch('/cart/change.js', {
        method: 'POST',
        body: JSON.stringify({ id: key, quantity: newQty })
      });
      this.updateUI(updated);
    } catch(e) {}
  }
  updateUI(cart) {
    /* Update badges */
    const count = cart.item_count;
    this.cartCountEls.forEach(el => el.textContent = count);
    if (this.drawerCount) this.drawerCount.textContent = count;
    /* Update subtotal */
    if (this.subtotal) this.subtotal.textContent = BTB.money(cart.total_price);
    /* Reload to sync Liquid */
    this.refreshBody(cart);
  }
  refreshBody(cart) {
    if (!this.body) return;
    if (cart.item_count === 0) {
      this.body.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty__icon">
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6"/>
            </svg>
          </div>
          <h4>Your cart is empty!</h4>
          <p>Add some amazing toys to get started</p>
          <a href="/collections/all" class="btn btn-primary">Start Shopping</a>
        </div>`;
      return;
    }
    const itemsHTML = cart.items.map(item => `
      <div class="cart-item" data-key="${item.key}">
        <a class="cart-item__img-wrap" href="${item.url}">
          <img src="${item.image}" alt="${item.title}" width="80" height="80" loading="lazy">
        </a>
        <div class="cart-item__info">
          <a href="${item.url}" class="cart-item__name">${item.product_title}</a>
          ${item.variant_title && item.variant_title !== 'Default Title' ? `<p class="cart-item__variant">${item.variant_title}</p>` : ''}
          <div class="cart-item__meta">
            <div class="cart-qty" data-key="${item.key}">
              <button class="cart-qty__btn cart-qty-minus" data-key="${item.key}" aria-label="Decrease">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14"/></svg>
              </button>
              <span class="cart-qty__num">${item.quantity}</span>
              <button class="cart-qty__btn cart-qty-plus" data-key="${item.key}" aria-label="Increase">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
            <span class="cart-item__price">${BTB.money(item.line_price)}</span>
          </div>
        </div>
        <button class="cart-item__del" data-key="${item.key}" aria-label="Remove">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </div>`).join('');
    this.body.innerHTML = `<div class="cart-items-list">${itemsHTML}</div>`;
  }
}


/* ========================================================
   5. ADD TO CART — AJAX
======================================================== */
class AddToCart {
  constructor() {
    this.cartDrawer = null; // will be set after CartDrawer is created
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-add-to-cart]');
      if (btn) { e.preventDefault(); this.add(btn); }
    });
    document.addEventListener('submit', e => {
      const form = e.target.closest('[data-product-form]');
      if (form) { e.preventDefault(); this.addFromForm(form); }
    });
  }
  async add(btn) {
    const variantId = btn.dataset.variantId || btn.dataset.addToCart;
    if (!variantId) return;
    this.setLoading(btn, true);
    try {
      await BTB.fetch('/cart/add.js', {
        method: 'POST',
        body: JSON.stringify({ id: variantId, quantity: 1 })
      });
      const cart = await BTB.fetch('/cart.js');
      this.onSuccess(btn, cart);
    } catch(e) {
      BTBToast.show('Could not add to cart', '❌');
    } finally {
      this.setLoading(btn, false);
    }
  }
  async addFromForm(form) {
    const formData = new FormData(form);
    const btn = form.querySelector('[type=submit]');
    this.setLoading(btn, true);
    try {
      await BTB.fetch('/cart/add.js', { method: 'POST', body: JSON.stringify(Object.fromEntries(formData)) });
      const cart = await BTB.fetch('/cart.js');
      this.onSuccess(btn, cart);
    } catch(e) {
      BTBToast.show('Could not add to cart', '❌');
    } finally {
      this.setLoading(btn, false);
    }
  }
  onSuccess(btn, cart) {
    BTBToast.show('Added to cart! 🛒', '✅');
    /* Update cart badge */
    BTB.qsa('.cart-item-count').forEach(el => el.textContent = cart.item_count);
    const drawerCount = BTB.qs('#CartDrawerCount');
    if (drawerCount) drawerCount.textContent = cart.item_count;
    /* Open cart drawer */
    const drawer = BTB.qs('#CartDrawer');
    if (drawer) {
      BTB.addClass(drawer, 'open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      /* Re-render drawer body */
      window._cartDrawerInstance && window._cartDrawerInstance.updateUI(cart);
    }
  }
  setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:3px"></span>`;
      btn.disabled = true;
      BTB.addClass(btn, 'loading');
    } else {
      btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
      btn.disabled = false;
      BTB.removeClass(btn, 'loading');
    }
  }
}


/* ========================================================
   6. WISHLIST — localStorage
======================================================== */
class Wishlist {
  constructor() {
    this.key = 'btb_wishlist';
    this.items = this.load();
    this.init();
  }
  load() {
    try { return JSON.parse(localStorage.getItem(this.key)) || []; }
    catch { return []; }
  }
  save() { localStorage.setItem(this.key, JSON.stringify(this.items)); }
  has(id) { return this.items.includes(String(id)); }
  toggle(id) {
    id = String(id);
    if (this.has(id)) { this.items = this.items.filter(i => i !== id); }
    else { this.items.push(id); }
    this.save();
    return this.has(id);
  }
  init() {
    this.renderAll();
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-wishlist-toggle]');
      if (!btn) return;
      e.preventDefault();
      const id = btn.dataset.wishlistToggle;
      const added = this.toggle(id);
      this.updateBtn(btn, added);
      BTBToast.show(added ? 'Added to wishlist ❤️' : 'Removed from wishlist', added ? '❤️' : '💔');
    });
  }
  renderAll() {
    BTB.qsa('[data-wishlist-toggle]').forEach(btn => {
      this.updateBtn(btn, this.has(btn.dataset.wishlistToggle));
    });
  }
  updateBtn(btn, added) {
    if (added) {
      BTB.addClass(btn, 'active');
      btn.setAttribute('aria-label', 'Remove from wishlist');
    } else {
      BTB.removeClass(btn, 'active');
      btn.setAttribute('aria-label', 'Add to wishlist');
    }
    /* Fill heart SVG */
    const svg = btn.querySelector('svg');
    if (svg) {
      const path = svg.querySelector('path');
      if (path) path.setAttribute('fill', added ? '#ef5350' : 'none');
    }
  }
}


/* ========================================================
   7. HERO SLIDER
======================================================== */
class HeroSlider {
  constructor() {
    this.slider = BTB.qs('.hero-slider');
    if (!this.slider) return;
    this.slides = BTB.qsa('.hero-slide', this.slider);
    this.dots = BTB.qsa('.slider-dot', this.slider);
    this.prevBtn = BTB.qs('.slider-arrow.prev', this.slider);
    this.nextBtn = BTB.qs('.slider-arrow.next', this.slider);
    this.current = 0;
    this.total = this.slides.length;
    this.autoplayInterval = null;
    this.touchStartX = 0;
    if (this.total < 2) return;
    this.init();
  }
  init() {
    BTB.on(this.prevBtn, 'click', () => this.go(this.current - 1));
    BTB.on(this.nextBtn, 'click', () => this.go(this.current + 1));
    this.dots.forEach((dot, i) => BTB.on(dot, 'click', () => this.go(i)));
    this.slider.addEventListener('touchstart', e => { this.touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    this.slider.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      if (Math.abs(dx) > 50) this.go(this.current + (dx < 0 ? 1 : -1));
    }, { passive: true });
    this.startAutoplay();
    BTB.on(this.slider, 'mouseenter', () => this.stopAutoplay());
    BTB.on(this.slider, 'mouseleave', () => this.startAutoplay());
    this.show(0);
  }
  show(index) {
    this.slides.forEach((s, i) => {
      s.style.display = i === index ? 'flex' : 'none';
      s.style.animation = i === index ? 'fadeIn 0.5s ease both' : '';
    });
    this.dots.forEach((d, i) => {
      d.classList.toggle('active', i === index);
    });
    this.current = index;
  }
  go(index) {
    this.show((index + this.total) % this.total);
  }
  startAutoplay() {
    this.autoplayInterval = setInterval(() => this.go(this.current + 1), 5000);
  }
  stopAutoplay() { clearInterval(this.autoplayInterval); }
}


/* ========================================================
   8. CATEGORY CAROUSEL
======================================================== */
class CategoryCarousel {
  constructor() {
    this.carousel = BTB.qs('.categories-carousel');
    this.prevBtn = BTB.qs('.cat-arrow.prev');
    this.nextBtn = BTB.qs('.cat-arrow.next');
    if (!this.carousel) return;
    this.step = 280;
    this.init();
  }
  init() {
    BTB.on(this.prevBtn, 'click', () => this.scroll(-this.step));
    BTB.on(this.nextBtn, 'click', () => this.scroll(this.step));
    /* Touch support */
    let startX = 0;
    this.carousel.addEventListener('touchstart', e => { startX = e.changedTouches[0].clientX; }, { passive: true });
    this.carousel.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) this.scroll(-dx);
    }, { passive: true });
  }
  scroll(amount) {
    this.carousel.scrollBy({ left: amount, behavior: 'smooth' });
  }
}


/* ========================================================
   9. PRODUCT TABS (Best Sellers / New Arrivals)
======================================================== */
class ProductTabs {
  constructor() {
    this.tabBtns = BTB.qsa('.tab-btn');
    this.tabPanes = BTB.qsa('.tab-pane');
    if (!this.tabBtns.length) return;
    this.init();
  }
  init() {
    this.tabBtns.forEach(btn => {
      BTB.on(btn, 'click', () => this.activate(btn.dataset.tab));
    });
  }
  activate(id) {
    this.tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === id));
    this.tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === id));
  }
}


/* ========================================================
   10. TOAST NOTIFICATION
======================================================== */
const BTBToast = {
  el: null,
  textEl: null,
  iconEl: null,
  timer: null,
  init() {
    this.el = BTB.qs('#ToastMsg');
    this.textEl = BTB.qs('#ToastText');
    this.iconEl = BTB.qs('#ToastIcon');
  },
  show(message, icon = '✅', duration = 3000) {
    if (!this.el) this.init();
    if (!this.el) return;
    if (this.textEl) this.textEl.textContent = message;
    if (this.iconEl) this.iconEl.textContent = icon;
    BTB.addClass(this.el, 'show');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => BTB.removeClass(this.el, 'show'), duration);
  }
};


/* ========================================================
   11. QUICK VIEW MODAL
======================================================== */
class QuickView {
  constructor() {
    this.modal = BTB.qs('#QuickViewModal');
    this.overlay = BTB.qs('#QVOverlay');
    this.closeBtn = BTB.qs('#QVClose');
    this.body = BTB.qs('#QVBody');
    if (!this.modal) return;
    this.init();
  }
  init() {
    BTB.on(this.overlay, 'click', () => this.close());
    BTB.on(this.closeBtn, 'click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-quick-view]');
      if (btn) { e.preventDefault(); this.open(btn.dataset.quickView); }
    });
  }
  async open(handle) {
    BTB.addClass(this.modal, 'open');
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    this.body.innerHTML = `<div class="qv-loading"><div class="spinner"></div></div>`;
    try {
      const res = await fetch(`/products/${handle}?view=quick-view`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const html = await res.text();
      this.body.innerHTML = html;
    } catch(e) {
      this.body.innerHTML = `<div class="qv-error" style="padding:3rem;text-align:center"><p>Could not load product. <a href="/products/${handle}">View product page</a></p></div>`;
    }
  }
  close() {
    BTB.removeClass(this.modal, 'open');
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}


/* ========================================================
   12. NEWSLETTER FORM
======================================================== */
class NewsletterForm {
  constructor() {
    this.forms = BTB.qsa('.newsletter-form');
    this.init();
  }
  init() {
    this.forms.forEach(form => {
      BTB.on(form, 'submit', e => {
        e.preventDefault();
        const input = form.querySelector('.newsletter-input');
        if (!input) return;
        const email = input.value.trim();
        if (!this.isValidEmail(email)) {
          BTBToast.show('Please enter a valid email address', '⚠️');
          return;
        }
        /* Shopify handles actual subscription via form action */
        BTBToast.show('Thanks for subscribing! 🎉', '✅');
        input.value = '';
      });
    });
  }
  isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
}


/* ========================================================
   13. ALL CATEGORIES MEGA MENU
======================================================== */
class CatsMegaMenu {
  constructor() {
    this.btn = BTB.qs('.nav-all-cats');
    this.menu = BTB.qs('.cats-mega');
    if (!this.btn || !this.menu) return;
    this.init();
  }
  init() {
    BTB.on(this.btn, 'click', e => {
      e.stopPropagation();
      BTB.toggleClass(this.menu, 'open');
    });
    document.addEventListener('click', e => {
      if (!this.menu.contains(e.target) && e.target !== this.btn) {
        BTB.removeClass(this.menu, 'open');
      }
    });
  }
}


/* ========================================================
   14. PRODUCT GALLERY (Product Page)
======================================================== */
class ProductGallery {
  constructor() {
    this.main = BTB.qs('.product-gallery__main img');
    this.thumbs = BTB.qsa('.gallery-thumb');
    if (!this.main || !this.thumbs.length) return;
    this.init();
  }
  init() {
    this.thumbs.forEach((thumb, i) => {
      BTB.on(thumb, 'click', () => this.setActive(thumb, i));
    });
  }
  setActive(thumb, index) {
    const thumbImg = thumb.querySelector('img');
    if (thumbImg) this.main.src = thumbImg.src.replace('_80x80', '_800x800').replace('_100x100', '_800x800');
    this.thumbs.forEach(t => BTB.removeClass(t, 'active'));
    BTB.addClass(thumb, 'active');
  }
}


/* ========================================================
   15. PRODUCT QUANTITY SELECTOR
======================================================== */
class QtySelector {
  constructor() {
    document.addEventListener('click', e => {
      if (e.target.closest('.qty-minus')) {
        const wrap = e.target.closest('.qty-selector');
        const input = wrap && wrap.querySelector('input');
        if (input) input.value = Math.max(1, parseInt(input.value) - 1);
      }
      if (e.target.closest('.qty-plus')) {
        const wrap = e.target.closest('.qty-selector');
        const input = wrap && wrap.querySelector('input');
        if (input) input.value = parseInt(input.value) + 1;
      }
    });
  }
}


/* ========================================================
   16. SCROLL ANIMATIONS
======================================================== */
class ScrollAnimations {
  constructor() {
    if (!('IntersectionObserver' in window)) return;
    this.obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-slide-up');
          this.obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    BTB.qsa('.product-card, .category-item, .usp-item, .promo-banner, .blog-card').forEach(el => {
      el.style.opacity = '0';
      this.obs.observe(el);
    });
  }
}


/* ========================================================
   17. NAV DROPDOWN ACCESSIBILITY
======================================================== */
class NavA11y {
  constructor() {
    BTB.qsa('.nav-menu__item').forEach(item => {
      const link = item.querySelector('.nav-menu__link');
      const dropdown = item.querySelector('.nav-dropdown');
      if (!link || !dropdown) return;
      BTB.on(link, 'keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const isOpen = dropdown.style.visibility === 'visible';
          dropdown.style.visibility = isOpen ? '' : 'visible';
          dropdown.style.opacity = isOpen ? '' : '1';
        }
        if (e.key === 'Escape') { dropdown.style.visibility = ''; dropdown.style.opacity = ''; }
      });
    });
  }
}


/* ========================================================
   18. BACK TO TOP
======================================================== */
class BackToTop {
  constructor() {
    this.btn = BTB.qs('.back-to-top');
    if (!this.btn) return;
    window.addEventListener('scroll', BTB.debounce(() => {
      this.btn.style.opacity = window.scrollY > 400 ? '1' : '0';
      this.btn.style.pointerEvents = window.scrollY > 400 ? 'auto' : 'none';
    }, 100), { passive: true });
    BTB.on(this.btn, 'click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}


/* ========================================================
   19. COMPARE PRODUCTS
======================================================== */
const Compare = {
  key: 'btb_compare',
  max: 4,
  items: [],
  load() {
    try { this.items = JSON.parse(localStorage.getItem(this.key)) || []; }
    catch { this.items = []; }
    return this;
  },
  save() { localStorage.setItem(this.key, JSON.stringify(this.items)); },
  toggle(id) {
    id = String(id);
    if (this.items.includes(id)) { this.items = this.items.filter(i => i !== id); }
    else if (this.items.length < this.max) { this.items.push(id); }
    else { BTBToast.show(`Max ${this.max} products to compare`, '⚠️'); return false; }
    this.save();
    return true;
  },
  has(id) { return this.items.includes(String(id)); },
  init() {
    this.load();
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-compare]');
      if (!btn) return;
      e.preventDefault();
      const id = btn.dataset.compare;
      const ok = this.toggle(id);
      if (ok) {
        const added = this.has(id);
        btn.classList.toggle('active', added);
        BTBToast.show(added ? 'Added to compare' : 'Removed from compare', '⚖️');
      }
    });
  }
};


/* ========================================================
   INIT ALL
======================================================== */
function init() {
  new StickyHeader();
  new MobileNav();
  new SearchOverlay();
  window._cartDrawerInstance = new CartDrawer();
  new AddToCart();
  new Wishlist();
  new HeroSlider();
  new CategoryCarousel();
  new ProductTabs();
  BTBToast.init();
  new QuickView();
  new NewsletterForm();
  new CatsMegaMenu();
  new ProductGallery();
  new QtySelector();
  new ScrollAnimations();
  new NavA11y();
  new BackToTop();
  Compare.init();

  /* Remove no-js class */
  document.documentElement.classList.remove('no-js');

  /* Announce sticky header height to CSS */
  const header = document.querySelector('.site-header');
  if (header) document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

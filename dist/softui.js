/*! SoftUI v1.16.0 — Interactive Behaviors */

// Works as a classic <script> (window.SoftUI), a CommonJS/bundler import
// (module.exports, with .default for ESM interop) and on the server (no-op).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;
    module.exports.default = api;
  }
  if (root && typeof window !== 'undefined') root.SoftUI = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  const VERSION = '1.16.0';

  // SSR: importing on the server is a no-op (nothing touches document)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const noop = function () { return null; };
    return {
      init: noop, modal: noop, sheet: noop, toast: noop, carousel: noop, sidebar: noop, tour: noop, reveal: noop,
      theme: { get: noop, set: noop, toggle: noop, clear: noop, system: noop },
      version: VERSION
    };
  }

  // Loaded twice (e.g. a <script> tag plus a bundler import): reuse the first
  // copy instead of registering every document listener again.
  if (window.SoftUI && typeof window.SoftUI.init === 'function') return window.SoftUI;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // Reduced motion (checked live so OS toggles apply without reload)
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function scrollBehavior() { return prefersReducedMotion() ? 'auto' : 'smooth'; }

  // Component events: always bubble, so you can listen on document
  function emit(el, name, detail) {
    el.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true }));
  }

  // Init helpers: safe() isolates failures, once() binds document listeners
  // a single time, each() runs a per-element setup once per element.
  const _bound = {};
  const _seen = {};
  function safe(name, fn, arg) {
    try {
      return fn(arg);
    } catch (err) {
      if (typeof console !== 'undefined') console.error('[SoftUI] ' + name + ' failed:', err);
    }
  }
  function once(key) {
    if (_bound[key]) return false;
    _bound[key] = true;
    return true;
  }
  function each(root, selector, key, fn) {
    const r = root || document;
    const seen = _seen[key] || (_seen[key] = new WeakSet());
    const list = [];
    if (r.nodeType === 1 && r.matches(selector)) list.push(r);
    if (r.querySelectorAll) r.querySelectorAll(selector).forEach(function(el) { list.push(el); });
    list.forEach(function(el) {
      if (seen.has(el)) return;
      seen.add(el);
      safe(key, fn, el);
    });
  }

  // Accepts a selector string or an Element
  function resolveEl(target) {
    if (typeof target === 'string') return document.querySelector(target);
    return target && target.nodeType === 1 ? target : null;
  }

  // =========================================
  // Overlays (modal + sheet) — shared open/close with focus restore
  // =========================================
  const openerMap = new WeakMap(); // backdrop -> element focused when it opened
  const OPEN_OVERLAYS = '.sui-modal-backdrop.sui-modal-open, .sui-sheet-backdrop.sui-sheet-open';

  function anyOverlayOpen() {
    return !!document.querySelector(OPEN_OVERLAYS);
  }

  function openOverlay(backdrop, openClass, panelSel) {
    if (backdrop.classList.contains(openClass)) return;
    const active = document.activeElement;
    if (active && active !== document.body && !backdrop.contains(active)) openerMap.set(backdrop, active);
    backdrop.classList.add(openClass);
    document.body.style.overflow = 'hidden';
    const panel = backdrop.querySelector(panelSel);
    if (panel) focusInto(backdrop, panel, function() { return backdrop.classList.contains(openClass); }, 0);
  }

  function closeOverlay(backdrop, openClass) {
    if (!backdrop || !backdrop.classList.contains(openClass)) return;
    backdrop.classList.remove(openClass);
    if (!anyOverlayOpen()) document.body.style.overflow = '';
    const opener = openerMap.get(backdrop);
    openerMap.delete(backdrop);
    if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
  }

  function shake(el, cls) {
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 200);
  }

  // =========================================
  // Modal
  // =========================================
  function modal(target) {
    const backdrop = resolveEl(target);
    if (!backdrop) return null;
    return {
      open() { openOverlay(backdrop, 'sui-modal-open', '.sui-modal'); },
      close() { closeOverlay(backdrop, 'sui-modal-open'); },
      isOpen() { return backdrop.classList.contains('sui-modal-open'); }
    };
  }

  // =========================================
  // Sheet / Drawer
  // =========================================
  function sheet(target) {
    const backdrop = resolveEl(target);
    if (!backdrop) return null;
    return {
      open() { openOverlay(backdrop, 'sui-sheet-open', '.sui-sheet'); },
      close() { closeOverlay(backdrop, 'sui-sheet-open'); },
      isOpen() { return backdrop.classList.contains('sui-sheet-open'); }
    };
  }

  // =========================================
  // Focus trap helper
  // =========================================
  function getFocusable(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
  }

  function visibleFocusable(container) {
    return getFocusable(container).filter(function(f) { return f.offsetParent !== null; });
  }

  // Overlays fade in by transitioning visibility from hidden, so their contents
  // can't take focus in the tick they open. Finish those visibility transitions
  // now; where that isn't supported, retry for up to ~0.5s. animRoot is the
  // element whose subtree animates (the backdrop); panel receives focus.
  function focusInto(animRoot, panel, isOpen, tries) {
    if (!isOpen() || panel.contains(document.activeElement)) return;
    const first = visibleFocusable(panel)[0]; // also flushes styles, creating the transitions
    if (animRoot.getAnimations) {
      animRoot.getAnimations({ subtree: true }).forEach(function(a) {
        if (a.transitionProperty === 'visibility') a.finish();
      });
    }
    if (first) {
      first.focus();
    } else {
      if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
      panel.focus();
    }
    if (!panel.contains(document.activeElement) && tries < 30) {
      setTimeout(function() { focusInto(animRoot, panel, isOpen, tries + 1); }, 16);
    }
  }

  // Tab / Shift+Tab wrap inside panel, and pull focus back in if it escaped
  function trapTab(e, panel) {
    const focusable = visibleFocusable(panel);
    if (!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const inside = panel.contains(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || !inside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  }

  // =========================================
  // Global listeners (bound once, on first init)
  // =========================================
  function bindGlobal() {
    if (!once('global')) return;

    // Escape closes the topmost open modal or sheet (static ones shake instead).
    // Modal and sheet backdrops share z-index 1000, so the last open backdrop
    // in document order is the one painted on top. Bound on window so it runs
    // after the document-level popup handlers: an Escape that closed a
    // dropdown, popover, menu etc. (they preventDefault) leaves the overlay open.
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const open = document.querySelectorAll(OPEN_OVERLAYS);
      const top = open[open.length - 1];
      if (!top) return;
      // Handled: other window-level layers (e.g. an open sidebar drawer) skip it
      e.preventDefault();
      if (top.classList.contains('sui-modal-backdrop')) {
        if (top.classList.contains('sui-modal-static')) shake(top, 'sui-modal-shake');
        else closeOverlay(top, 'sui-modal-open');
      } else if (top.classList.contains('sui-sheet-static')) {
        shake(top, 'sui-sheet-shake');
      } else {
        closeOverlay(top, 'sui-sheet-open');
      }
    });

    // Click backdrop to close (or shake if static)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('sui-modal-backdrop') && e.target.classList.contains('sui-modal-open')) {
        if (e.target.classList.contains('sui-modal-static')) {
          shake(e.target, 'sui-modal-shake');
        } else {
          closeOverlay(e.target, 'sui-modal-open');
        }
      }
    });

    // Focus trap inside open modals
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      const backdrop = document.querySelector('.sui-modal-backdrop.sui-modal-open');
      if (!backdrop) return;

      const modal = backdrop.querySelector('.sui-modal');
      if (modal) trapTab(e, modal);
    });

    // Close button handler (any .sui-modal-close inside a backdrop)
    document.addEventListener('click', (e) => {
      if (!e.target.closest) return;
      const closeBtn = e.target.closest('.sui-modal-close');
      if (!closeBtn) return;

      const backdrop = closeBtn.closest('.sui-modal-backdrop');
      if (backdrop) closeOverlay(backdrop, 'sui-modal-open');
    });

    // Sheet backdrop click to close (or shake if static)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('sui-sheet-backdrop') && e.target.classList.contains('sui-sheet-open')) {
        if (e.target.classList.contains('sui-sheet-static')) {
          shake(e.target, 'sui-sheet-shake');
        } else {
          closeOverlay(e.target, 'sui-sheet-open');
        }
      }
    });

    // Sheet close button handler
    document.addEventListener('click', (e) => {
      if (!e.target.closest) return;
      const closeBtn = e.target.closest('.sui-sheet-close');
      if (!closeBtn) return;

      const backdrop = closeBtn.closest('.sui-sheet-backdrop');
      if (backdrop) closeOverlay(backdrop, 'sui-sheet-open');
    });

    // Focus trap inside open sheets
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      const sheetBackdrop = document.querySelector('.sui-sheet-backdrop.sui-sheet-open');
      if (!sheetBackdrop) return;

      const panel = sheetBackdrop.querySelector('.sui-sheet');
      if (panel) trapTab(e, panel);
    });

    // Dismissible alerts
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('.sui-alert-close');
      if (!closeBtn) return;

      const alert = closeBtn.closest('.sui-alert');
      if (alert) {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(20px)';
        alert.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        setTimeout(() => alert.remove(), 300);
      }
    });

    // Dismissible chips
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('.sui-chip-close');
      if (!closeBtn) return;

      const chip = closeBtn.closest('.sui-chip');
      if (chip) {
        chip.classList.add('sui-chip-removing');
        setTimeout(() => chip.remove(), 250);
      }
    });

    // Tooltip auto-positioning
    document.addEventListener('mouseenter', (e) => {
      if (!e.target.closest) return;
      const tip = e.target.closest('.sui-tooltip');
      if (!tip) return;

      const rect = tip.getBoundingClientRect();
      const margin = 80; // space needed for tooltip

      // Store original direction so we can restore on leave
      const original = tip.dataset.suiTooltipDir;
      if (original === undefined) {
        if (tip.classList.contains('sui-tooltip-bottom')) tip.dataset.suiTooltipDir = 'bottom';
        else if (tip.classList.contains('sui-tooltip-left')) tip.dataset.suiTooltipDir = 'left';
        else if (tip.classList.contains('sui-tooltip-right')) tip.dataset.suiTooltipDir = 'right';
        else tip.dataset.suiTooltipDir = 'top';
      }

      // Remove all direction classes
      tip.classList.remove('sui-tooltip-bottom', 'sui-tooltip-left', 'sui-tooltip-right');

      // Determine best direction
      const dir = tip.dataset.suiTooltipDir;
      let best = dir;

      if (dir === 'top' && rect.top < margin) best = 'bottom';
      else if (dir === 'bottom' && rect.bottom + margin > window.innerHeight) best = 'top';
      else if (dir === 'left' && rect.left < margin) best = 'right';
      else if (dir === 'right' && rect.right + margin > window.innerWidth) best = 'left';

      // Apply direction (top is default, no class needed)
      if (best !== 'top') {
        tip.classList.add('sui-tooltip-' + best);
      }
    }, true);

    document.addEventListener('mouseleave', (e) => {
      if (!e.target.closest) return;
      const tip = e.target.closest('.sui-tooltip');
      if (!tip || !tip.dataset.suiTooltipDir) return;

      // Delay restore until after fade-out transition completes
      setTimeout(() => {
        if (tip.matches(':hover')) return;
        tip.classList.remove('sui-tooltip-bottom', 'sui-tooltip-left', 'sui-tooltip-right');
        const dir = tip.dataset.suiTooltipDir;
        if (dir !== 'top') {
          tip.classList.add('sui-tooltip-' + dir);
        }
      }, 200);
    }, true);

    // Hover Card auto-repositioning
    document.addEventListener('mouseenter', (e) => {
      if (!e.target.closest) return;
      const hc = e.target.closest('.sui-hover-card');
      if (!hc) return;
      autoReposition(hc, 'sui-hover-card');
    }, true);

    document.addEventListener('mouseleave', (e) => {
      if (!e.target.closest) return;
      const hc = e.target.closest('.sui-hover-card');
      if (!hc || !hc.dataset.suiOrigDir) return;
      // Delay restore until after fade-out transition completes
      setTimeout(() => {
        if (!hc.matches(':hover')) restorePosition(hc, 'sui-hover-card');
      }, 200);
    }, true);
  }

  // Shared auto-reposition logic for popovers and hover cards
  function autoReposition(el, prefix) {
    const dirClasses = [prefix + '-top', prefix + '-left', prefix + '-right'];

    // Store original direction on first interaction
    if (el.dataset.suiOrigDir === undefined) {
      if (el.classList.contains(prefix + '-top')) el.dataset.suiOrigDir = 'top';
      else if (el.classList.contains(prefix + '-left')) el.dataset.suiOrigDir = 'left';
      else if (el.classList.contains(prefix + '-right')) el.dataset.suiOrigDir = 'right';
      else el.dataset.suiOrigDir = 'bottom';
    }

    const rect = el.getBoundingClientRect();
    const content = el.querySelector('.' + prefix + '-content');
    const cw = content ? content.offsetWidth : 280;
    const ch = content ? content.offsetHeight : 120;
    const pad = 16;

    const dir = el.dataset.suiOrigDir;
    let best = dir;

    if (dir === 'bottom' && rect.bottom + ch + pad > window.innerHeight) best = 'top';
    else if (dir === 'top' && rect.top - ch - pad < 0) best = 'bottom';
    else if (dir === 'left' && rect.left - cw - pad < 0) best = 'right';
    else if (dir === 'right' && rect.right + cw + pad > window.innerWidth) best = 'left';

    // Also check horizontal overflow for top/bottom placements
    if (best === 'bottom' || best === 'top') {
      const centerX = rect.left + rect.width / 2;
      if (centerX - cw / 2 < pad) {
        el.classList.add(prefix + '-start');
      } else if (centerX + cw / 2 > window.innerWidth - pad) {
        el.classList.add(prefix + '-end');
      }
    }

    dirClasses.forEach(c => el.classList.remove(c));
    if (best !== 'bottom') {
      el.classList.add(prefix + '-' + best);
    }
  }

  function restorePosition(el, prefix) {
    const dirClasses = [prefix + '-top', prefix + '-left', prefix + '-right', prefix + '-start', prefix + '-end'];
    dirClasses.forEach(c => el.classList.remove(c));
    const dir = el.dataset.suiOrigDir;
    if (dir !== 'bottom') {
      el.classList.add(prefix + '-' + dir);
    }
  }

  function delayedRestore(el, prefix) {
    setTimeout(() => restorePosition(el, prefix), 200);
  }

  // =========================================
  // Tabs
  // =========================================
  function initTabs() {
    if (!once('tabs')) return;
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('.sui-tab');
      if (!tab) return;

      const tabList = tab.closest('.sui-tab-list, .sui-tab-list-pill, .sui-tab-list-underlined, .sui-tab-list-boxed');
      if (!tabList) return;

      const container = tabList.closest('.sui-tabs');
      if (!container) return;

      // Deactivate all tabs
      tabList.querySelectorAll('.sui-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      // Switch panels
      const target = tab.getAttribute('data-sui-tab');
      if (target) {
        container.querySelectorAll('.sui-tab-panel').forEach(p => p.classList.remove('active'));
        const panel = container.querySelector('#' + target);
        if (panel) panel.classList.add('active');
      }
    });
  }

  // =========================================
  // Accordion
  // =========================================
  function initAccordion(root) {
    // Set accurate max-height on initially active items
    each(root, '.sui-accordion-item.active .sui-accordion-body', 'accordion', body => {
      body.style.setProperty('--sui-accordion-height', body.scrollHeight + 'px');
    });

    if (!once('accordion')) return;
    document.addEventListener('click', (e) => {
      const header = e.target.closest('.sui-accordion-header');
      if (!header) return;

      const item = header.closest('.sui-accordion-item');
      if (!item) return;

      const accordion = item.closest('.sui-accordion');
      const isActive = item.classList.contains('active');

      // Close siblings (single-open mode, unless data-sui-multi is set)
      if (accordion && !accordion.hasAttribute('data-sui-multi')) {
        accordion.querySelectorAll('.sui-accordion-item.active').forEach(i => {
          if (i !== item) {
            i.classList.remove('active');
            const h = i.querySelector('.sui-accordion-header');
            if (h) h.setAttribute('aria-expanded', 'false');
            const b = i.querySelector('.sui-accordion-body');
            if (b) b.style.removeProperty('--sui-accordion-height');
          }
        });
      }

      if (isActive) {
        item.classList.remove('active');
        header.setAttribute('aria-expanded', 'false');
        const body = item.querySelector('.sui-accordion-body');
        if (body) body.style.removeProperty('--sui-accordion-height');
      } else {
        const body = item.querySelector('.sui-accordion-body');
        if (body) body.style.setProperty('--sui-accordion-height', body.scrollHeight + 'px');
        item.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // =========================================
  // Collapsible
  // =========================================
  function initCollapsible(root) {
    // Set height on initially open collapsibles
    each(root, '.sui-collapsible.open .sui-collapsible-content', 'collapsible', function(content) {
      content.style.setProperty('--sui-collapsible-height', content.scrollHeight + 'px');
    });

    if (!once('collapsible')) return;
    document.addEventListener('click', function(e) {
      const trigger = e.target.closest('.sui-collapsible-trigger');
      if (!trigger) return;

      const collapsible = trigger.closest('.sui-collapsible');
      if (!collapsible) return;

      const content = collapsible.querySelector('.sui-collapsible-content');
      if (!content) return;

      const isOpen = collapsible.classList.contains('open');

      if (isOpen) {
        collapsible.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        content.style.removeProperty('--sui-collapsible-height');
      } else {
        content.style.setProperty('--sui-collapsible-height', content.scrollHeight + 'px');
        collapsible.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // =========================================
  // Toast
  // =========================================
  const TOAST_POSITIONS = ['tr', 'tl', 'br', 'bl', 'tc', 'bc'];

  function getToastContainer(position) {
    const pos = TOAST_POSITIONS.indexOf(position) !== -1 ? position : 'tr';
    const cls = 'sui-toast-container sui-toast-' + pos;
    let container = document.querySelector('.sui-toast-container.sui-toast-' + pos);
    if (!container) {
      container = document.createElement('div');
      container.className = cls;
      document.body.appendChild(container);
    }
    return container;
  }

  function toast(options) {
    const opts = Object.assign({
      title: '',
      message: '',
      variant: '',
      duration: 4000,
      position: 'tr',
      closable: true,
      html: false // true renders title/message as HTML — trusted content only
    }, options);

    const container = getToastContainer(opts.position);

    const el = document.createElement('div');
    let cls = 'sui-toast';
    if (opts.variant) cls += ' sui-toast-' + opts.variant;
    el.className = cls;
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');

    // Text by default; HTML only when explicitly opted in
    function part(className, value) {
      const node = document.createElement('div');
      node.className = className;
      if (opts.html) node.innerHTML = value;
      else node.textContent = String(value);
      return node;
    }

    const body = document.createElement('div');
    body.className = 'sui-toast-body';
    if (opts.title) body.appendChild(part('sui-toast-title', opts.title));
    if (opts.message) body.appendChild(part('sui-toast-message', opts.message));
    el.appendChild(body);
    if (opts.closable) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'sui-toast-close';
      close.setAttribute('aria-label', 'Close notification');
      el.appendChild(close);
    }
    if (opts.duration > 0) {
      const progress = document.createElement('div');
      progress.className = 'sui-toast-progress';
      el.appendChild(progress);
    }

    container.appendChild(el);

    // Trigger slide-in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add('sui-toast-show');
      });
    });

    // Progress bar + auto-dismiss
    let timer = null;
    if (opts.duration > 0) {
      const bar = el.querySelector('.sui-toast-progress');
      if (bar) {
        bar.style.width = '100%';
        requestAnimationFrame(() => {
          bar.style.transitionDuration = opts.duration + 'ms';
          bar.style.width = '0%';
        });
      }
      timer = setTimeout(() => dismiss(el), opts.duration);
    }

    // Close button
    const closeBtn = el.querySelector('.sui-toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (timer) clearTimeout(timer);
        dismiss(el);
      });
    }

    return el;
  }

  function dismiss(el) {
    el.classList.remove('sui-toast-show');
    el.addEventListener('transitionend', () => {
      el.remove();
    }, { once: true });
    // Fallback in case transitionend doesn't fire
    setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
  }

  // =========================================
  // Dropdown
  // =========================================
  function initDropdown() {
    if (!once('dropdown')) return;
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-sui-dropdown], .sui-dropdown-toggle');
      if (toggle) {
        const dropdown = toggle.closest('.sui-dropdown, .sui-dropdown-split');
        if (!dropdown) return;

        // Close all other open dropdowns
        document.querySelectorAll('.sui-dropdown.open, .sui-dropdown-split.open').forEach(d => {
          if (d !== dropdown) {
            d.classList.remove('open');
            const t = d.querySelector('[data-sui-dropdown], .sui-dropdown-toggle');
            if (t) t.setAttribute('aria-expanded', 'false');
          }
        });

        dropdown.classList.toggle('open');
        const isNowOpen = dropdown.classList.contains('open');
        toggle.setAttribute('aria-expanded', isNowOpen ? 'true' : 'false');
        e.stopPropagation();
        return;
      }

      // Click on a dropdown item closes the menu
      const item = e.target.closest('.sui-dropdown-item');
      if (item) {
        const dropdown = item.closest('.sui-dropdown, .sui-dropdown-split');
        if (dropdown) {
          dropdown.classList.remove('open');
          const t = dropdown.querySelector('[data-sui-dropdown], .sui-dropdown-toggle');
          if (t) t.setAttribute('aria-expanded', 'false');
        }
        return;
      }

      // Click outside closes all dropdowns
      document.querySelectorAll('.sui-dropdown.open, .sui-dropdown-split.open').forEach(d => {
        d.classList.remove('open');
        const t = d.querySelector('[data-sui-dropdown], .sui-dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    });

    // Escape closes dropdowns, arrow keys navigate items
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.sui-dropdown.open, .sui-dropdown-split.open').forEach(d => {
          e.preventDefault();
          d.classList.remove('open');
          const t = d.querySelector('[data-sui-dropdown], .sui-dropdown-toggle');
          if (t) { t.setAttribute('aria-expanded', 'false'); t.focus(); }
        });
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const openDD = document.querySelector('.sui-dropdown.open, .sui-dropdown-split.open');
        if (!openDD) return;
        const items = Array.from(openDD.querySelectorAll('.sui-dropdown-item:not(.disabled)'));
        if (!items.length) return;
        e.preventDefault();
        const cur = items.indexOf(document.activeElement);
        let next;
        if (e.key === 'ArrowDown') {
          next = cur < items.length - 1 ? cur + 1 : 0;
        } else {
          next = cur > 0 ? cur - 1 : items.length - 1;
        }
        items[next].focus();
      }
    });
  }

  // =========================================
  // Context Menu
  // =========================================
  function initContextMenu() {
    if (!once('context-menu')) return;
    let openMenu = null;

    function closeAll() {
      if (openMenu) {
        openMenu.classList.remove('open');
        openMenu.querySelectorAll('.sui-context-sub.open').forEach(function(s) {
          s.classList.remove('open');
        });
        openMenu = null;
      }
    }

    function positionMenu(menu, x, y) {
      menu.style.left = '0px';
      menu.style.top = '0px';
      menu.classList.add('open');

      const rect = menu.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (x + rect.width > vw) x = vw - rect.width - 4;
      if (y + rect.height > vh) y = vh - rect.height - 4;
      if (x < 0) x = 4;
      if (y < 0) y = 4;

      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
    }

    // Right-click triggers
    document.addEventListener('contextmenu', function(e) {
      const trigger = e.target.closest('[data-sui-context]');
      if (!trigger) return;

      e.preventDefault();
      closeAll();

      const menuId = trigger.getAttribute('data-sui-context');
      const menu = document.getElementById(menuId);
      if (!menu) return;

      positionMenu(menu, e.clientX, e.clientY);
      openMenu = menu;

      // Focus first item for keyboard nav
      const firstItem = menu.querySelector('.sui-context-item:not(.disabled), .sui-context-sub-trigger');
      if (firstItem) firstItem.focus();
    });

    // Click outside closes
    document.addEventListener('click', function(e) {
      if (openMenu && !e.target.closest('.sui-context-menu')) {
        closeAll();
      }
    });

    // Click on item closes (unless checkbox/radio)
    document.addEventListener('click', function(e) {
      const item = e.target.closest('.sui-context-item');
      if (!item || !openMenu) return;
      if (!item.closest('.sui-context-menu')) return;

      // Checkbox toggle
      if (item.hasAttribute('data-sui-context-check')) {
        const check = item.querySelector('.sui-context-check');
        if (check) {
          const isChecked = check.textContent.trim() !== '';
          check.textContent = isChecked ? '' : '\u2713';
        }
        return; // Don't close on checkbox click
      }

      // Radio toggle
      if (item.hasAttribute('data-sui-context-radio')) {
        const group = item.getAttribute('data-sui-context-radio');
        openMenu.querySelectorAll('[data-sui-context-radio="' + group + '"] .sui-context-check').forEach(function(c) {
          c.textContent = '';
        });
        const radio = item.querySelector('.sui-context-check');
        if (radio) radio.textContent = '\u2022';
        return; // Don't close on radio click
      }

      // Normal item — close
      if (!item.classList.contains('disabled')) {
        closeAll();
      }
    });

    // Submenu hover
    document.addEventListener('mouseenter', function(e) {
      const subTrigger = e.target.closest && e.target.closest('.sui-context-sub-trigger');
      if (!subTrigger) return;
      const sub = subTrigger.closest('.sui-context-sub');
      if (!sub) return;

      // Close sibling subs
      const parent = sub.parentElement;
      if (parent) {
        parent.querySelectorAll(':scope > .sui-context-sub.open').forEach(function(s) {
          if (s !== sub) s.classList.remove('open');
        });
      }
      sub.classList.add('open');
    }, true);

    document.addEventListener('mouseleave', function(e) {
      const sub = e.target.closest && e.target.closest('.sui-context-sub');
      if (!sub) return;
      // Only close if not moving into the sub-content
      setTimeout(function() {
        if (!sub.matches(':hover')) {
          sub.classList.remove('open');
        }
      }, 100);
    }, true);

    // Escape closes
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && openMenu) {
        e.preventDefault();
        // If a sub is open, close it first
        const openSub = openMenu.querySelector('.sui-context-sub.open');
        if (openSub) {
          openSub.classList.remove('open');
          openSub.querySelector('.sui-context-sub-trigger').focus();
        } else {
          closeAll();
        }
      }

      if (!openMenu) return;

      // Arrow key navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const activeContainer = openMenu.querySelector('.sui-context-sub.open > .sui-context-sub-content') || openMenu;
        const items = Array.from(activeContainer.querySelectorAll(':scope > .sui-context-item:not(.disabled), :scope > .sui-context-sub > .sui-context-sub-trigger'));
        if (items.length === 0) return;

        let current = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
          current = current < items.length - 1 ? current + 1 : 0;
        } else {
          current = current > 0 ? current - 1 : items.length - 1;
        }
        items[current].focus();
      }

      // ArrowRight opens submenu
      if (e.key === 'ArrowRight') {
        const focused = document.activeElement;
        if (focused && focused.classList.contains('sui-context-sub-trigger')) {
          const sub = focused.closest('.sui-context-sub');
          if (sub) {
            sub.classList.add('open');
            const first = sub.querySelector('.sui-context-sub-content .sui-context-item:not(.disabled), .sui-context-sub-content .sui-context-sub-trigger');
            if (first) first.focus();
          }
        }
      }

      // ArrowLeft closes submenu
      if (e.key === 'ArrowLeft') {
        const openSub = document.activeElement && document.activeElement.closest('.sui-context-sub.open');
        if (openSub && openSub.closest('.sui-context-menu') === openMenu) {
          openSub.classList.remove('open');
          openSub.querySelector('.sui-context-sub-trigger').focus();
        }
      }

      // Enter activates
      if (e.key === 'Enter') {
        const focused = document.activeElement;
        if (focused && (focused.classList.contains('sui-context-item') || focused.classList.contains('sui-context-sub-trigger'))) {
          focused.click();
        }
      }
    });

    // Scroll / resize closes
    window.addEventListener('scroll', closeAll, true);
    window.addEventListener('resize', closeAll);
  }

  // =========================================
  // Command Palette
  // =========================================
  const commandDialogs = new WeakMap(); // dialog -> { open, close }

  function initCommand(root) {
    each(root, '.sui-command[data-sui-command]', 'command', function(cmd) {
      const input = cmd.querySelector('.sui-command-input');
      const list = cmd.querySelector('.sui-command-list');
      const empty = cmd.querySelector('.sui-command-empty');
      if (!input || !list) return;

      const items = list.querySelectorAll('.sui-command-item');
      const groups = list.querySelectorAll('.sui-command-group');
      const separators = list.querySelectorAll('.sui-command-separator');
      let focusedIndex = -1;

      function getVisibleItems() {
        // Disabled items are skipped by arrow keys, Enter and hover
        return Array.from(list.querySelectorAll('.sui-command-item:not([hidden]):not(.disabled):not([disabled]):not([aria-disabled="true"])'));
      }

      function updateFocus(visibleItems) {
        items.forEach(function(it) { it.classList.remove('focused'); });
        if (focusedIndex >= 0 && focusedIndex < visibleItems.length) {
          visibleItems[focusedIndex].classList.add('focused');
          visibleItems[focusedIndex].scrollIntoView({ block: 'nearest' });
        }
      }

      function filter() {
        const query = input.value.toLowerCase().trim();
        let anyVisible = false;

        items.forEach(function(item) {
          const text = item.textContent.toLowerCase();
          const keywords = (item.getAttribute('data-keywords') || '').toLowerCase();
          const match = !query || text.indexOf(query) !== -1 || keywords.indexOf(query) !== -1;
          item.hidden = !match;
          if (match) anyVisible = true;
        });

        // Hide groups with no visible items
        groups.forEach(function(group) {
          const hasVisible = group.querySelector('.sui-command-item:not([hidden])');
          group.hidden = !hasVisible;
        });

        // Hide separators between hidden groups
        separators.forEach(function(sep) {
          const next = sep.nextElementSibling;
          const prev = sep.previousElementSibling;
          const nextHidden = next && next.hidden;
          const prevHidden = prev && prev.hidden;
          sep.hidden = nextHidden || prevHidden;
        });

        if (empty) {
          empty.classList.toggle('visible', !anyVisible);
        }

        focusedIndex = anyVisible ? 0 : -1;
        updateFocus(getVisibleItems());
      }

      input.addEventListener('input', filter);

      // Keyboard nav
      cmd.addEventListener('keydown', function(e) {
        const visibleItems = getVisibleItems();

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (visibleItems.length > 0) {
            focusedIndex = focusedIndex < visibleItems.length - 1 ? focusedIndex + 1 : 0;
            updateFocus(visibleItems);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (visibleItems.length > 0) {
            focusedIndex = focusedIndex > 0 ? focusedIndex - 1 : visibleItems.length - 1;
            updateFocus(visibleItems);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < visibleItems.length) {
            visibleItems[focusedIndex].click();
          }
        }
      });

      // Mouse hover updates focus
      items.forEach(function(item) {
        item.addEventListener('mouseenter', function() {
          const visibleItems = getVisibleItems();
          focusedIndex = visibleItems.indexOf(item);
          updateFocus(visibleItems);
        });
      });

      // Initial focus on first item
      const initial = getVisibleItems();
      if (initial.length > 0) {
        focusedIndex = 0;
        updateFocus(initial);
      }
    });

    // Dialog mode — Cmd+K / Ctrl+K
    each(root, '.sui-command-dialog', 'command-dialog', function(dialog) {
      const cmd = dialog.querySelector('.sui-command');
      const input = cmd ? cmd.querySelector('.sui-command-input') : null;

      function openDialog() {
        dialog.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (input) {
          input.value = '';
          input.dispatchEvent(new Event('input'));
          setTimeout(function() { input.focus(); }, 50);
        }
      }

      function closeDialog() {
        dialog.classList.remove('open');
        document.body.style.overflow = '';
      }

      // Cmd+K / Ctrl+K to open
      const shortcut = dialog.dataset.suiCommandKey || 'k';
      document.addEventListener('keydown', function(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === shortcut) {
          e.preventDefault();
          if (dialog.classList.contains('open')) {
            closeDialog();
          } else {
            openDialog();
          }
        }
      });

      // Escape to close
      dialog.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeDialog();
        }
      });

      // Click backdrop to close
      dialog.addEventListener('click', function(e) {
        if (e.target === dialog) {
          closeDialog();
        }
      });

      commandDialogs.set(dialog, { open: openDialog, close: closeDialog });
    });

    // Trigger buttons — delegated, so triggers added later work too
    if (!once('command-open')) return;
    document.addEventListener('click', function(e) {
      const t = e.target.closest && e.target.closest('[data-sui-command-open]');
      if (!t) return;
      const d = document.getElementById(t.getAttribute('data-sui-command-open'));
      const api = d && commandDialogs.get(d);
      if (api) api.open();
    });
  }

  // =========================================
  // Calendar
  // =========================================
  function initCalendar(root) {
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

    function daysInMonth(year, month) {
      return new Date(year, month + 1, 0).getDate();
    }

    function sameDay(a, b) {
      return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function between(d, start, end) {
      if (!start || !end) return false;
      const t = d.getTime(), s = Math.min(start.getTime(), end.getTime()), e = Math.max(start.getTime(), end.getTime());
      return t > s && t < e;
    }

    function parseDate(str) {
      if (!str) return null;
      if (str === 'today') return new Date(new Date().setHours(0,0,0,0));
      const parts = str.split('-');
      if (parts.length === 3) return new Date(+parts[0], +parts[1] - 1, +parts[2]);
      return null;
    }

    function formatDate(d, includeTime, hour, minute, period) {
      let str = MONTHS[d.getMonth()].substring(0, 3) + ' ' + d.getDate() + ', ' + d.getFullYear();
      if (includeTime) {
        const hh = (hour !== undefined && hour !== null) ? hour : 12;
        const mm = (minute !== undefined && minute !== null) ? minute : 0;
        str += ' ' + pad(hh) + ':' + pad(mm);
        if (period) str += ' ' + period;
      }
      return str;
    }

    each(root, '.sui-calendar[data-sui-calendar]', 'calendar', function(cal) {
      const mode = cal.dataset.suiCalendar || 'single';
      const today = new Date();
      today.setHours(0,0,0,0);

      const minDate = parseDate(cal.dataset.suiMin);
      const maxDate = parseDate(cal.dataset.suiMax);

      const disabledDays = [];
      if (cal.dataset.suiDisabled) {
        cal.dataset.suiDisabled.split(',').forEach(function(s) {
          const d = parseDate(s.trim());
          if (d) disabledDays.push(d);
        });
      }

      function isDisabled(d) {
        for (let i = 0; i < disabledDays.length; i++) {
          if (sameDay(d, disabledDays[i])) return true;
        }
        if (minDate && d < minDate) return true;
        if (maxDate && d > maxDate) return true;
        return false;
      }

      let selected = null;
      let rangeStart = null;
      let rangeEnd = null;
      let defaultPlaceholder = '';
      let viewMode = 'days'; // 'days', 'months', 'years'
      let yearPageStart = 0;

      // Time picker
      const hasTime = cal.hasAttribute('data-sui-calendar-time');
      const is24h = cal.getAttribute('data-sui-calendar-time') === '24h';
      let timeHour = is24h ? 0 : 12, timeMinute = 0, timePeriod = 'AM';
      let timeRow = null, hourInput = null, minuteInput = null, periodBtn = null;

      if (hasTime) {
        timeRow = cal.querySelector('.sui-calendar-time');
        if (!timeRow) {
          timeRow = document.createElement('div');
          timeRow.className = 'sui-calendar-time';

          const label = document.createElement('span');
          label.className = 'sui-calendar-time-label';
          label.textContent = 'Time';
          timeRow.appendChild(label);

          hourInput = document.createElement('input');
          hourInput.type = 'text';
          hourInput.className = 'sui-calendar-time-input';
          hourInput.value = pad(timeHour);
          hourInput.maxLength = 2;
          hourInput.setAttribute('aria-label', 'Hour');
          timeRow.appendChild(hourInput);

          const sep = document.createElement('span');
          sep.className = 'sui-calendar-time-sep';
          sep.textContent = ':';
          timeRow.appendChild(sep);

          minuteInput = document.createElement('input');
          minuteInput.type = 'text';
          minuteInput.className = 'sui-calendar-time-input';
          minuteInput.value = pad(timeMinute);
          minuteInput.maxLength = 2;
          minuteInput.setAttribute('aria-label', 'Minute');
          timeRow.appendChild(minuteInput);

          if (!is24h) {
            periodBtn = document.createElement('button');
            periodBtn.type = 'button';
            periodBtn.className = 'sui-calendar-time-period';
            periodBtn.textContent = timePeriod;
            timeRow.appendChild(periodBtn);
          }

          // Insert before clear button or append
          const clearBtn = cal.querySelector('[data-sui-calendar-clear]');
          if (clearBtn) {
            cal.insertBefore(timeRow, clearBtn);
          } else {
            cal.appendChild(timeRow);
          }
        } else {
          hourInput = timeRow.querySelectorAll('.sui-calendar-time-input')[0];
          minuteInput = timeRow.querySelectorAll('.sui-calendar-time-input')[1];
          periodBtn = timeRow.querySelector('.sui-calendar-time-period');
        }

        const hourMax = is24h ? 23 : 12;
        const hourMin = is24h ? 0 : 1;

        function parseHour(v) {
          let n = parseInt(v, 10);
          if (isNaN(n) || n < 0) n = 0;
          if (n > 23) n = 23;
          if (is24h) return { hour: n };
          // Convert 24h input to 12h + period
          if (n === 0) return { hour: 12, period: 'AM' };
          if (n < 12) return { hour: n, period: 'AM' };
          if (n === 12) return { hour: 12, period: 'PM' };
          return { hour: n - 12, period: 'PM' };
        }
        function clampMinute(v) { const n = parseInt(v, 10); if (isNaN(n) || n < 0) return 0; if (n > 59) return 59; return n; }

        hourInput.addEventListener('blur', function() {
          const result = parseHour(this.value);
          timeHour = result.hour;
          if (!is24h && result.period) {
            timePeriod = result.period;
            if (periodBtn) periodBtn.textContent = timePeriod;
          }
          this.value = pad(timeHour);
          fireTimeUpdate();
        });
        hourInput.addEventListener('keydown', function(e) {
          if (e.key === 'ArrowUp') { e.preventDefault(); timeHour = timeHour >= hourMax ? hourMin : timeHour + 1; this.value = pad(timeHour); fireTimeUpdate(); }
          if (e.key === 'ArrowDown') { e.preventDefault(); timeHour = timeHour <= hourMin ? hourMax : timeHour - 1; this.value = pad(timeHour); fireTimeUpdate(); }
          if (e.key === 'Enter') { this.blur(); }
        });

        minuteInput.addEventListener('blur', function() {
          timeMinute = clampMinute(this.value);
          this.value = pad(timeMinute);
          fireTimeUpdate();
        });
        minuteInput.addEventListener('keydown', function(e) {
          if (e.key === 'ArrowUp') { e.preventDefault(); timeMinute = timeMinute >= 59 ? 0 : timeMinute + 1; this.value = pad(timeMinute); fireTimeUpdate(); }
          if (e.key === 'ArrowDown') { e.preventDefault(); timeMinute = timeMinute <= 0 ? 59 : timeMinute - 1; this.value = pad(timeMinute); fireTimeUpdate(); }
          if (e.key === 'Enter') { this.blur(); }
        });

        if (periodBtn) {
          periodBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            timePeriod = timePeriod === 'AM' ? 'PM' : 'AM';
            this.textContent = timePeriod;
            fireTimeUpdate();
          });
        }
      }

      function fireTimeUpdate() {
        if (!hasTime) return;
        if (mode === 'single' && selected) {
          emit(cal, 'sui-date-select', { date: selected, hour: timeHour, minute: timeMinute, period: is24h ? null : timePeriod, is24h: is24h });
        }
      }

      let monthContainers = cal.querySelectorAll('.sui-calendar-month');
      const isMultiMonth = monthContainers.length > 0;
      if (!isMultiMonth) monthContainers = [cal];

      const viewOffsets = [];
      monthContainers.forEach(function(mc, i) { viewOffsets.push(i); });

      let viewYear = today.getFullYear();
      let viewMonth = today.getMonth();

      const prevBtn = cal.querySelector('[data-sui-calendar-prev]');
      const nextBtn = cal.querySelector('[data-sui-calendar-next]');
      const titleEl = cal.querySelector('.sui-calendar-header .sui-calendar-title');

      function renderDays() {
        viewMode = 'days';
        if (timeRow) timeRow.style.display = '';
        monthContainers.forEach(function(mc, idx) {
          let m = viewMonth + viewOffsets[idx];
          let y = viewYear;
          while (m > 11) { m -= 12; y++; }
          while (m < 0) { m += 12; y--; }

          // Title
          const t = mc.querySelector('.sui-calendar-title');
          if (t) {
            if (idx === 0 && !isMultiMonth && t === titleEl) {
              t.textContent = MONTHS[m] + ' ' + y;
              t.style.cursor = 'pointer';
            } else {
              t.textContent = MONTHS[m] + ' ' + y;
            }
          }

          const grid = mc.querySelector('.sui-calendar-grid');
          if (!grid) return;
          grid.innerHTML = '';
          grid.style.gridTemplateColumns = 'repeat(7, 1fr)';

          DAYS.forEach(function(d) {
            const lbl = document.createElement('div');
            lbl.className = 'sui-calendar-day-label';
            lbl.textContent = d;
            grid.appendChild(lbl);
          });

          const firstDay = new Date(y, m, 1).getDay();
          const total = daysInMonth(y, m);

          const prevTotal = daysInMonth(y, m - 1);
          for (let p = firstDay - 1; p >= 0; p--) {
            const btn = document.createElement('button');
            btn.className = 'sui-calendar-day outside';
            btn.textContent = prevTotal - p;
            btn.type = 'button';
            btn.disabled = true;
            grid.appendChild(btn);
          }

          for (let d = 1; d <= total; d++) {
            const date = new Date(y, m, d);
            const btn = document.createElement('button');
            btn.className = 'sui-calendar-day';
            btn.textContent = d;
            btn.type = 'button';

            if (sameDay(date, today)) btn.classList.add('today');
            if (isDisabled(date)) btn.classList.add('disabled');

            if (mode === 'single' && sameDay(date, selected)) btn.classList.add('selected');

            if (mode === 'range') {
              if (sameDay(date, rangeStart)) btn.classList.add('range-start');
              if (sameDay(date, rangeEnd)) btn.classList.add('range-end');
              if (rangeStart && rangeEnd && between(date, rangeStart, rangeEnd)) btn.classList.add('in-range');
            }

            (function(dt) {
              btn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (mode === 'single') {
                  selected = dt;
                  const detail = { date: dt };
                  if (hasTime) { detail.hour = timeHour; detail.minute = timeMinute; detail.period = is24h ? null : timePeriod; detail.is24h = is24h; }
                  emit(cal, 'sui-date-select', detail);
                } else if (mode === 'range') {
                  if (!rangeStart || rangeEnd) {
                    rangeStart = dt;
                    rangeEnd = null;
                  } else {
                    if (dt < rangeStart) { rangeEnd = rangeStart; rangeStart = dt; }
                    else { rangeEnd = dt; }
                    emit(cal, 'sui-date-select', { start: rangeStart, end: rangeEnd });
                  }
                }
                renderDays();
              });
            })(date);

            grid.appendChild(btn);
          }

          const totalCells = firstDay + total;
          const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
          for (let n = 1; n <= remaining; n++) {
            const btn = document.createElement('button');
            btn.className = 'sui-calendar-day outside';
            btn.textContent = n;
            btn.type = 'button';
            btn.disabled = true;
            grid.appendChild(btn);
          }
        });

        updateClear();
      }

      function renderMonths() {
        viewMode = 'months';
        if (timeRow) timeRow.style.display = 'none';
        if (titleEl) {
          titleEl.textContent = viewYear;
          titleEl.style.cursor = 'pointer';
        }

        // Only render in first (or only) grid
        const grid = monthContainers[0].querySelector('.sui-calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';

        for (let m = 0; m < 12; m++) {
          const btn = document.createElement('button');
          btn.className = 'sui-calendar-day';
          btn.textContent = MONTHS_SHORT[m];
          btn.type = 'button';

          if (m === viewMonth && viewYear === today.getFullYear()) btn.classList.add('today');
          if (m === viewMonth) btn.classList.add('selected');

          (function(month) {
            btn.addEventListener('click', function(e) {
              e.stopPropagation();
              viewMonth = month;
              renderDays();
            });
          })(m);

          grid.appendChild(btn);
        }
      }

      function renderYears() {
        viewMode = 'years';
        if (timeRow) timeRow.style.display = 'none';
        const start = yearPageStart;
        const end = start + 11;
        if (titleEl) {
          titleEl.textContent = start + ' – ' + end;
          titleEl.style.cursor = 'default';
        }

        const grid = monthContainers[0].querySelector('.sui-calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';

        for (let yr = start; yr <= end; yr++) {
          const btn = document.createElement('button');
          btn.className = 'sui-calendar-day';
          btn.textContent = yr;
          btn.type = 'button';

          if (yr === today.getFullYear()) btn.classList.add('today');
          if (yr === viewYear) btn.classList.add('selected');

          (function(year) {
            btn.addEventListener('click', function(e) {
              e.stopPropagation();
              viewYear = year;
              renderMonths();
            });
          })(yr);

          grid.appendChild(btn);
        }
      }

      function updateClear() {
        const clearBtn = cal.querySelector('[data-sui-calendar-clear]');
        if (clearBtn) {
          const hasSelection = mode === 'single' ? !!selected : !!(rangeStart || rangeEnd);
          clearBtn.style.display = hasSelection ? '' : 'none';
        }
      }

      // Nav buttons
      if (prevBtn) {
        prevBtn.addEventListener('click', function() {
          if (viewMode === 'days') {
            viewMonth--;
            if (viewMonth < 0) { viewMonth = 11; viewYear--; }
            renderDays();
          } else if (viewMode === 'months') {
            viewYear--;
            renderMonths();
          } else if (viewMode === 'years') {
            yearPageStart -= 12;
            renderYears();
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', function() {
          if (viewMode === 'days') {
            viewMonth++;
            if (viewMonth > 11) { viewMonth = 0; viewYear++; }
            renderDays();
          } else if (viewMode === 'months') {
            viewYear++;
            renderMonths();
          } else if (viewMode === 'years') {
            yearPageStart += 12;
            renderYears();
          }
        });
      }

      // Title click: days → months → years
      if (titleEl && !isMultiMonth) {
        titleEl.addEventListener('click', function() {
          if (viewMode === 'days') {
            renderMonths();
          } else if (viewMode === 'months') {
            yearPageStart = viewYear - (viewYear % 12);
            renderYears();
          }
        });
      }

      // Clear button
      cal.querySelectorAll('[data-sui-calendar-clear]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          selected = null;
          rangeStart = null;
          rangeEnd = null;
          if (hasTime) {
            timeHour = is24h ? 0 : 12; timeMinute = 0; timePeriod = 'AM';
            if (hourInput) hourInput.value = pad(timeHour);
            if (minuteInput) minuteInput.value = pad(timeMinute);
            if (periodBtn) periodBtn.textContent = timePeriod;
          }
          emit(cal, 'sui-date-clear');
          renderDays();
        });
      });

      renderDays();

      // Date Picker integration
      const picker = cal.closest('.sui-datepicker');
      if (picker) {
        const trigger = picker.querySelector('.sui-datepicker-trigger');
        const popover = picker.querySelector('.sui-datepicker-popover');
        const placeholderEl = trigger ? trigger.querySelector('.sui-datepicker-placeholder') : null;
        if (placeholderEl) defaultPlaceholder = placeholderEl.textContent;

        if (trigger && popover) {
          trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            popover.classList.toggle('open');
          });

          document.addEventListener('mousedown', function(e) {
            if (!picker.contains(e.target)) {
              popover.classList.remove('open');
            }
          });
        }

        cal.addEventListener('sui-date-select', function(e) {
          if (!trigger) return;
          const span = trigger.querySelector('.sui-datepicker-value') || trigger.querySelector('.sui-datepicker-placeholder');
          if (mode === 'single' && e.detail.date) {
            const text = formatDate(e.detail.date, hasTime, e.detail.hour, e.detail.minute, e.detail.is24h ? null : e.detail.period);
            if (span) { span.textContent = text; span.className = 'sui-datepicker-value'; }
            if (!hasTime && popover) popover.classList.remove('open');
          } else if (mode === 'range' && e.detail.start && e.detail.end) {
            const text = formatDate(e.detail.start) + ' – ' + formatDate(e.detail.end);
            if (span) { span.textContent = text; span.className = 'sui-datepicker-value'; }
            if (popover) popover.classList.remove('open');
          }
          updateClear();
        });

        cal.addEventListener('sui-date-clear', function() {
          const span = trigger.querySelector('.sui-datepicker-value') || trigger.querySelector('.sui-datepicker-placeholder');
          if (span) { span.textContent = defaultPlaceholder; span.className = 'sui-datepicker-placeholder'; }
          updateClear();
        });
      }
    });
  }

  // =========================================
  // Standalone Time Picker
  // =========================================
  function initTimePicker(root) {
    each(root, '.sui-timepicker[data-sui-timepicker]', 'timepicker', function(tp) {
      const is24h = tp.getAttribute('data-sui-timepicker') === '24h';
      const hourMax = is24h ? 23 : 12;
      const hourMin = is24h ? 0 : 1;
      let tHour = is24h ? 0 : 12, tMinute = 0, tPeriod = 'AM';

      let hInput = tp.querySelectorAll('.sui-calendar-time-input')[0];
      let mInput = tp.querySelectorAll('.sui-calendar-time-input')[1];
      let pBtn = tp.querySelector('.sui-calendar-time-period');

      if (!hInput || !mInput) {
        // Auto-build the UI
        const label = document.createElement('span');
        label.className = 'sui-calendar-time-label';
        label.textContent = 'Time';
        tp.appendChild(label);

        hInput = document.createElement('input');
        hInput.type = 'text';
        hInput.className = 'sui-calendar-time-input';
        hInput.value = pad(tHour);
        hInput.maxLength = 2;
        hInput.setAttribute('aria-label', 'Hour');
        tp.appendChild(hInput);

        const sep = document.createElement('span');
        sep.className = 'sui-calendar-time-sep';
        sep.textContent = ':';
        tp.appendChild(sep);

        mInput = document.createElement('input');
        mInput.type = 'text';
        mInput.className = 'sui-calendar-time-input';
        mInput.value = pad(tMinute);
        mInput.maxLength = 2;
        mInput.setAttribute('aria-label', 'Minute');
        tp.appendChild(mInput);

        if (!is24h) {
          pBtn = document.createElement('button');
          pBtn.type = 'button';
          pBtn.className = 'sui-calendar-time-period';
          pBtn.textContent = tPeriod;
          tp.appendChild(pBtn);
        }
      }

      function parseH(v) {
        let n = parseInt(v, 10);
        if (isNaN(n) || n < 0) n = 0;
        if (n > 23) n = 23;
        if (is24h) return { hour: n };
        if (n === 0) return { hour: 12, period: 'AM' };
        if (n < 12) return { hour: n, period: 'AM' };
        if (n === 12) return { hour: 12, period: 'PM' };
        return { hour: n - 12, period: 'PM' };
      }
      function clampM(v) { const n = parseInt(v, 10); if (isNaN(n) || n < 0) return 0; if (n > 59) return 59; return n; }

      function fireChange() {
        emit(tp, 'sui-time-change', { hour: tHour, minute: tMinute, period: is24h ? null : tPeriod, is24h: is24h });
      }

      hInput.addEventListener('blur', function() {
        const result = parseH(this.value);
        tHour = result.hour;
        if (!is24h && result.period) { tPeriod = result.period; if (pBtn) pBtn.textContent = tPeriod; }
        this.value = pad(tHour);
        fireChange();
      });
      hInput.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowUp') { e.preventDefault(); tHour = tHour >= hourMax ? hourMin : tHour + 1; this.value = pad(tHour); fireChange(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); tHour = tHour <= hourMin ? hourMax : tHour - 1; this.value = pad(tHour); fireChange(); }
        if (e.key === 'Enter') this.blur();
      });

      mInput.addEventListener('blur', function() { tMinute = clampM(this.value); this.value = pad(tMinute); fireChange(); });
      mInput.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowUp') { e.preventDefault(); tMinute = tMinute >= 59 ? 0 : tMinute + 1; this.value = pad(tMinute); fireChange(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); tMinute = tMinute <= 0 ? 59 : tMinute - 1; this.value = pad(tMinute); fireChange(); }
        if (e.key === 'Enter') this.blur();
      });

      if (pBtn) {
        pBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          tPeriod = tPeriod === 'AM' ? 'PM' : 'AM';
          this.textContent = tPeriod;
          fireChange();
        });
      }
    });
  }

  // =========================================
  // Menubar
  // =========================================
  function initMenubar(root) {
    // Hover to open submenus
    each(root, '.sui-menubar-sub', 'menubar-sub', function(sub) {
      sub.addEventListener('mouseenter', function() {
        sub.parentElement.querySelectorAll('.sui-menubar-sub.open').forEach(function(s) {
          if (s !== sub) s.classList.remove('open');
        });
        sub.classList.add('open');
      });
      sub.addEventListener('mouseleave', function() {
        sub.classList.remove('open');
      });
    });

    if (!once('menubar')) return;
    let menubarOpen = false;

    function closeAllMenus(bar) {
      bar.querySelectorAll('.sui-menubar-menu.open').forEach(function(m) {
        m.classList.remove('open');
        m.querySelector('.sui-menubar-trigger').classList.remove('active');
      });
      bar.querySelectorAll('.sui-menubar-sub.open').forEach(function(s) {
        s.classList.remove('open');
      });
      menubarOpen = false;
    }

    function openMenu(menu) {
      // Close all menubars on the page, not just the current one
      document.querySelectorAll('.sui-menubar').forEach(function(bar) {
        closeAllMenus(bar);
      });
      menu.classList.add('open');
      menu.querySelector('.sui-menubar-trigger').classList.add('active');
      menubarOpen = true;
    }

    document.addEventListener('click', function(e) {
      const trigger = e.target.closest('.sui-menubar-trigger');
      if (trigger) {
        const menu = trigger.closest('.sui-menubar-menu');
        if (menu.classList.contains('open')) {
          closeAllMenus(menu.closest('.sui-menubar'));
        } else {
          openMenu(menu);
        }
        e.stopPropagation();
        return;
      }

      // Submenu triggers
      const subTrigger = e.target.closest('.sui-menubar-sub-trigger');
      if (subTrigger) {
        const sub = subTrigger.closest('.sui-menubar-sub');
        const isOpen = sub.classList.contains('open');
        // Close sibling subs
        sub.parentElement.querySelectorAll('.sui-menubar-sub.open').forEach(function(s) {
          s.classList.remove('open');
        });
        if (!isOpen) sub.classList.add('open');
        e.stopPropagation();
        return;
      }

      // Clicking a menubar item closes the menu
      const item = e.target.closest('.sui-menubar-item');
      if (item && item.closest('.sui-menubar')) {
        const bar = item.closest('.sui-menubar');
        closeAllMenus(bar);
        return;
      }

      // Click outside
      document.querySelectorAll('.sui-menubar').forEach(function(bar) {
        closeAllMenus(bar);
      });
    });

    // Hover to switch menus when one is already open
    document.addEventListener('mouseenter', function(e) {
      if (!menubarOpen) return;
      const trigger = e.target.closest ? e.target.closest('.sui-menubar-trigger') : null;
      if (!trigger) return;
      const menu = trigger.closest('.sui-menubar-menu');
      if (menu && !menu.classList.contains('open')) {
        openMenu(menu);
      }
    }, true);

    // Escape closes menubar
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (document.querySelector('.sui-menubar-menu.open')) e.preventDefault();
        document.querySelectorAll('.sui-menubar').forEach(function(bar) {
          closeAllMenus(bar);
        });
      }
    });
  }

  // =========================================
  // Combobox
  // =========================================
  function initCombobox(root) {
    each(root, '.sui-combobox', 'combobox', function(combo) {
      const trigger = combo.querySelector('.sui-combobox-trigger');
      const content = combo.querySelector('.sui-combobox-content');
      const input = combo.querySelector('.sui-combobox-input');
      const items = combo.querySelectorAll('.sui-combobox-item');
      const valueEl = combo.querySelector('.sui-combobox-value');
      const chipsEl = combo.querySelector('.sui-combobox-chips');
      const emptyEl = combo.querySelector('.sui-combobox-empty');
      const clearBtn = combo.querySelector('.sui-combobox-clear');
      const isMultiple = combo.classList.contains('sui-combobox-multiple');
      let placeholder = valueEl ? valueEl.textContent : '';
      if (chipsEl) placeholder = chipsEl.textContent.trim();

      if (!trigger || !content) return;
      if (combo.classList.contains('sui-combobox-disabled')) return;

      function open() {
        // Close other comboboxes
        document.querySelectorAll('.sui-combobox.open').forEach(function(c) {
          if (c !== combo) c.classList.remove('open');
        });
        combo.classList.add('open');
        if (input) {
          input.value = '';
          input.focus();
          filterItems('');
        }
      }

      function close() {
        combo.classList.remove('open');
      }

      function filterItems(query) {
        const q = query.toLowerCase();
        let visibleCount = 0;
        items.forEach(function(item) {
          const text = item.textContent.toLowerCase();
          const match = !q || text.indexOf(q) !== -1;
          item.style.display = match ? '' : 'none';
          if (match) visibleCount++;
        });
        // Show/hide groups based on visible children
        combo.querySelectorAll('.sui-combobox-label').forEach(function(label) {
          let next = label.nextElementSibling;
          let hasVisible = false;
          while (next && !next.classList.contains('sui-combobox-label') && !next.classList.contains('sui-combobox-separator')) {
            if (next.classList.contains('sui-combobox-item') && next.style.display !== 'none') hasVisible = true;
            next = next.nextElementSibling;
          }
          label.style.display = hasVisible ? '' : 'none';
        });
        combo.querySelectorAll('.sui-combobox-separator').forEach(function(sep) {
          sep.style.display = q ? 'none' : '';
        });
        if (emptyEl) {
          emptyEl.classList.toggle('visible', visibleCount === 0);
        }
      }

      function updateClear() {
        if (!clearBtn) return;
        const hasSelection = combo.querySelectorAll('.sui-combobox-item.selected').length > 0;
        clearBtn.classList.toggle('visible', hasSelection);
      }

      function clearAll() {
        items.forEach(function(i) { i.classList.remove('selected'); });
        if (valueEl) {
          valueEl.textContent = placeholder;
          valueEl.classList.add('placeholder');
        }
        if (chipsEl) updateChips();
        updateClear();
      }

      function updateChips() {
        if (!chipsEl) return;
        chipsEl.innerHTML = '';
        const selectedItems = combo.querySelectorAll('.sui-combobox-item.selected');
        if (selectedItems.length === 0) {
          const ph = document.createElement('span');
          ph.className = 'placeholder';
          ph.textContent = placeholder;
          chipsEl.appendChild(ph);
          updateClear();
          return;
        }
        selectedItems.forEach(function(item) {
          const chip = document.createElement('span');
          chip.className = 'sui-combobox-chip';
          chip.textContent = item.getAttribute('data-value') || item.textContent.trim();
          const remove = document.createElement('span');
          remove.className = 'sui-combobox-chip-remove';
          remove.innerHTML = '&#10005;';
          remove.addEventListener('click', function(e) {
            e.stopPropagation();
            item.classList.remove('selected');
            updateChips();
          });
          chip.appendChild(remove);
          chipsEl.appendChild(chip);
        });
        updateClear();
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          clearAll();
        });
      }

      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        if (combo.classList.contains('open')) {
          close();
        } else {
          open();
        }
      });

      if (input) {
        input.addEventListener('input', function() {
          filterItems(input.value);
        });
        input.addEventListener('click', function(e) {
          e.stopPropagation();
        });
      }

      items.forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          if (isMultiple) {
            item.classList.toggle('selected');
            updateChips();
          } else {
            items.forEach(function(i) { i.classList.remove('selected'); });
            item.classList.add('selected');
            if (valueEl) {
              valueEl.textContent = item.getAttribute('data-value') || item.textContent.trim();
              valueEl.classList.remove('placeholder');
            }
            updateClear();
            close();
          }
        });
      });

      // Click outside closes
      document.addEventListener('click', function(e) {
        if (!combo.contains(e.target)) {
          close();
        }
      });

      // Escape closes
      combo.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && combo.classList.contains('open')) {
          e.preventDefault();
          close();
        }
      });

      // Initialize clear button visibility for pre-selected items
      updateClear();
    });
  }

  // =========================================
  // Resizable
  // =========================================
  function initResizable(root) {
    each(root, '.sui-resizable', 'resizable', function(container) {
      const isVertical = container.classList.contains('sui-resizable-vertical');
      const handles = container.querySelectorAll(':scope > .sui-resizable-handle');

      // Initialize panels with flex-grow from data-size or equal split
      const panels = Array.from(container.querySelectorAll(':scope > .sui-resizable-panel'));
      panels.forEach(function(p) {
        const size = parseFloat(p.getAttribute('data-size')) || (100 / panels.length);
        p.style.flexGrow = size;
      });

      handles.forEach(function(handle) {
        const prevPanel = handle.previousElementSibling;
        const nextPanel = handle.nextElementSibling;
        if (!prevPanel || !nextPanel) return;

        handle.setAttribute('tabindex', '0');
        handle.setAttribute('role', 'separator');
        handle.setAttribute('aria-orientation', isVertical ? 'horizontal' : 'vertical');

        function getGrow(panel) {
          return parseFloat(panel.style.flexGrow) || 0;
        }

        function getMin(panel) {
          return parseFloat(panel.getAttribute('data-min-size')) || 0;
        }

        function resize(delta) {
          const prevG = getGrow(prevPanel);
          const nextG = getGrow(nextPanel);
          const total = prevG + nextG;
          const prevMin = getMin(prevPanel);
          const nextMin = getMin(nextPanel);
          const newPrev = Math.max(prevMin, Math.min(total - nextMin, prevG + delta));
          const newNext = total - newPrev;
          prevPanel.style.flexGrow = newPrev;
          nextPanel.style.flexGrow = newNext;
        }

        function onPointerDown(e) {
          e.preventDefault();
          handle.focus();
          handle.classList.add('dragging');

          const prevG = getGrow(prevPanel);
          const nextG = getGrow(nextPanel);
          const totalG = prevG + nextG;

          // Measure actual pixel sizes of the two panels
          const prevPx = isVertical ? prevPanel.offsetHeight : prevPanel.offsetWidth;
          const nextPx = isVertical ? nextPanel.offsetHeight : nextPanel.offsetWidth;
          const pairPx = prevPx + nextPx;
          const startPos = isVertical ? e.clientY : e.clientX;

          const prevMin = getMin(prevPanel);
          const nextMin = getMin(nextPanel);

          function onPointerMove(ev) {
            const pos = isVertical ? ev.clientY : ev.clientX;
            let delta = pos - startPos;
            // Clamp delta so panels stay within 0..pairPx range
            delta = Math.max(-prevPx, Math.min(nextPx, delta));
            const ratio = pairPx > 0 ? delta / pairPx : 0;
            const newPrev = Math.max(prevMin, Math.min(totalG - nextMin, prevG + ratio * totalG));
            const newNext = totalG - newPrev;
            prevPanel.style.flexGrow = newPrev;
            nextPanel.style.flexGrow = newNext;
          }

          function onPointerUp() {
            handle.classList.remove('dragging');
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
          }

          document.addEventListener('pointermove', onPointerMove);
          document.addEventListener('pointerup', onPointerUp);
        }

        handle.addEventListener('pointerdown', onPointerDown);

        // Keyboard: Arrow keys resize, Home/End for extremes
        handle.addEventListener('keydown', function(e) {
          const step = e.shiftKey ? 10 : 2;
          const growKey = isVertical ? 'ArrowDown' : 'ArrowRight';
          const shrinkKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

          if (e.key === growKey) {
            e.preventDefault();
            resize(step);
          } else if (e.key === shrinkKey) {
            e.preventDefault();
            resize(-step);
          } else if (e.key === 'Home') {
            e.preventDefault();
            resize(-getGrow(prevPanel));
          } else if (e.key === 'End') {
            e.preventDefault();
            resize(getGrow(nextPanel));
          }
        });
      });
    });
  }

  // =========================================
  // Popover
  // =========================================
  function initPopover() {
    if (!once('popover')) return;
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-sui-popover]');
      if (trigger) {
        const popover = trigger.closest('.sui-popover');
        if (!popover) return;

        // Close all other open popovers
        document.querySelectorAll('.sui-popover.open').forEach(p => {
          if (p !== popover) {
            p.classList.remove('open');
            delayedRestore(p, 'sui-popover');
            const t = p.querySelector('[data-sui-popover]');
            if (t) t.setAttribute('aria-expanded', 'false');
          }
        });

        const wasOpen = popover.classList.contains('open');
        if (!wasOpen) {
          autoReposition(popover, 'sui-popover');
        }
        popover.classList.toggle('open');
        const isNowOpen = popover.classList.contains('open');
        if (!isNowOpen) {
          delayedRestore(popover, 'sui-popover');
        }
        trigger.setAttribute('aria-expanded', isNowOpen ? 'true' : 'false');
        e.stopPropagation();
        return;
      }

      // Close button inside popover
      const closeBtn = e.target.closest('.sui-popover-close');
      if (closeBtn) {
        const popover = closeBtn.closest('.sui-popover');
        if (popover) {
          popover.classList.remove('open');
          delayedRestore(popover, 'sui-popover');
          const t = popover.querySelector('[data-sui-popover]');
          if (t) {
            t.setAttribute('aria-expanded', 'false');
            t.focus();
          }
        }
        return;
      }

      // Click inside popover content — do nothing
      if (e.target.closest('.sui-popover-content')) return;

      // Click outside closes all popovers
      document.querySelectorAll('.sui-popover.open').forEach(p => {
        p.classList.remove('open');
        delayedRestore(p, 'sui-popover');
        const t = p.querySelector('[data-sui-popover]');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    });

    // Escape closes popovers
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.sui-popover.open').forEach(p => {
          e.preventDefault();
          p.classList.remove('open');
          delayedRestore(p, 'sui-popover');
          const t = p.querySelector('[data-sui-popover]');
          if (t) {
            t.setAttribute('aria-expanded', 'false');
            t.focus();
          }
        });
      }
    });
  }

  // =========================================
  // Slider
  // =========================================
  function initSliders(root) {
    each(root, '.sui-slider', 'slider', slider => {
      const input = slider.querySelector('input[type="range"]');
      const display = slider.querySelector('.sui-slider-value');
      if (!input || !display) return;

      // Set initial value
      display.textContent = input.value;

      // Update on input
      input.addEventListener('input', () => {
        display.textContent = input.value;
      });
    });
  }

  // =========================================
  // Input OTP
  // =========================================
  function initOtp(root) {
    each(root, '.sui-otp[data-sui-otp]', 'otp', function(otp) {
      if (otp.dataset.suiOtpDisabled !== undefined) return;

      const slots = otp.querySelectorAll('.sui-otp-slot');
      const len = slots.length;
      const pattern = otp.dataset.suiOtpPattern || 'digits'; // "digits" or "alphanumeric"
      const regex = pattern === 'alphanumeric' ? /^[a-zA-Z0-9]$/ : /^[0-9]$/;

      // Create hidden input
      const input = document.createElement('input');
      input.className = 'sui-otp-input';
      input.setAttribute('inputmode', pattern === 'alphanumeric' ? 'text' : 'numeric');
      input.setAttribute('autocomplete', 'one-time-code');
      input.setAttribute('maxlength', len);
      input.setAttribute('aria-label', 'One-time code');
      otp.appendChild(input);

      function updateSlots() {
        const val = input.value;
        slots.forEach(function(slot, i) {
          slot.textContent = val[i] || '';
          slot.classList.toggle('sui-otp-filled', !!val[i]);
          slot.classList.remove('sui-otp-active');
        });
        // Show cursor on current slot
        const pos = Math.min(val.length, len - 1);
        if (document.activeElement === input && val.length < len) {
          slots[pos].classList.add('sui-otp-active');
        } else if (document.activeElement === input && val.length === len) {
          slots[len - 1].classList.add('sui-otp-active');
        }
      }

      input.addEventListener('input', function() {
        // Filter to allowed characters
        let filtered = '';
        for (let i = 0; i < input.value.length && filtered.length < len; i++) {
          if (regex.test(input.value[i])) {
            filtered += pattern === 'alphanumeric' ? input.value[i].toUpperCase() : input.value[i];
          }
        }
        input.value = filtered;
        updateSlots();

        // Dispatch event when complete
        if (filtered.length === len) {
          emit(otp, 'sui-otp-complete', { value: filtered });
        }
      });

      input.addEventListener('focus', updateSlots);
      input.addEventListener('blur', function() {
        slots.forEach(function(s) { s.classList.remove('sui-otp-active'); });
      });

      // Click on OTP area or individual slot focuses input
      otp.addEventListener('click', function(e) {
        input.focus();
      });

      // Click on a specific slot positions cursor there
      slots.forEach(function(slot, i) {
        slot.addEventListener('click', function(e) {
          e.stopPropagation();
          input.focus();
          // Set cursor position
          const pos = Math.min(i, input.value.length);
          input.setSelectionRange(pos, pos);
          updateSlots();
        });
      });

      updateSlots();
    });
  }

  // =========================================
  // Toggle Group
  // =========================================
  function initToggleGroups(root) {
    each(root, '.sui-toggle-group[data-sui-toggle]', 'toggle-group', function(group) {
      const mode = group.dataset.suiToggle; // "single" or "multi"
      const items = group.querySelectorAll('.sui-toggle-group-item:not([disabled])');

      items.forEach(function(item) {
        item.addEventListener('click', function() {
          if (mode === 'single') {
            const wasActive = item.classList.contains('active');
            items.forEach(function(it) {
              it.classList.remove('active');
              it.setAttribute('aria-pressed', 'false');
            });
            if (!wasActive) {
              item.classList.add('active');
              item.setAttribute('aria-pressed', 'true');
            }
          } else {
            item.classList.toggle('active');
            item.setAttribute('aria-pressed', item.classList.contains('active') ? 'true' : 'false');
          }
        });
      });
    });
  }

  // =========================================
  // Carousel
  // =========================================
  // One controller per element: SoftUI.carousel() returns the auto-init instance
  const carouselInstances = new WeakMap();

  function carousel(selector) {
    const el = resolveEl(selector);
    if (!el) return null;
    const existing = carouselInstances.get(el);
    if (existing) return existing;

    const track = el.querySelector('.sui-carousel-track');
    if (!track) return null;

    // Auto-wrap track in viewport
    if (!track.parentElement.classList.contains('sui-carousel-viewport')) {
      const viewport = document.createElement('div');
      viewport.className = 'sui-carousel-viewport';
      track.parentElement.insertBefore(viewport, track);
      viewport.appendChild(track);
    }

    const realItems = Array.from(track.children);
    const isVertical = el.classList.contains('sui-carousel-vertical');
    const loopMode = el.hasAttribute('data-sui-loop') ? (el.dataset.suiLoop || 'seamless') : false;
    const isLoop = !!loopMode;
    const isSeamless = loopMode === 'seamless';
    const autoplayMs = parseInt(el.dataset.suiAutoplay) || 0;

    let visible = 1;
    if (el.classList.contains('sui-carousel-4')) visible = 4;
    else if (el.classList.contains('sui-carousel-3')) visible = 3;
    else if (el.classList.contains('sui-carousel-2')) visible = 2;

    const totalReal = realItems.length;
    const maxIndex = Math.max(0, totalReal - visible);
    let current = 0;
    let autoplayTimer = null;
    let jumping = false;

    const prevBtn = el.querySelector('.sui-carousel-prev');
    const nextBtn = el.querySelector('.sui-carousel-next');
    const dots = el.querySelectorAll('.sui-carousel-dot');

    // Seamless loop: clone slides at both ends
    let cloneCount = 0;
    if (isSeamless && totalReal > visible) {
      for (let i = totalReal - 1; i >= totalReal - visible; i--) {
        const clone = realItems[i].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.insertBefore(clone, track.firstChild);
      }
      for (let i = 0; i < visible; i++) {
        const clone = realItems[i].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      }
      cloneCount = visible;
    }
    // Seamless only applies when clones exist; with no more slides than are
    // visible it falls back to the rewind branch (maxIndex 0, so it stays put)
    const seamlessActive = isSeamless && cloneCount > 0;

    const allItems = Array.from(track.children);

    function moveTo(displayIndex, animate) {
      if (animate === false) track.style.transition = 'none';

      if (isVertical) {
        const vh = track.parentElement.offsetHeight;
        const itemH = vh / visible;
        allItems.forEach(function(it) { it.style.height = itemH + 'px'; });
        track.style.transform = 'translateY(-' + (displayIndex * itemH) + 'px)';
      } else {
        const item = allItems[displayIndex];
        const base = allItems[0];
        const px = (item && base) ? item.offsetLeft - base.offsetLeft : 0;
        track.style.transform = 'translateX(-' + px + 'px)';
      }

      if (animate === false) {
        track.offsetHeight; // force reflow
        track.style.transition = '';
      }
    }

    function update(animate) {
      const displayIndex = current + cloneCount;
      moveTo(displayIndex, animate);

      const dotIndex = ((current % totalReal) + totalReal) % totalReal;
      dots.forEach(function(d, i) { d.classList.toggle('active', i === dotIndex); });

      if (!isLoop) {
        if (prevBtn) prevBtn.disabled = current <= 0;
        if (nextBtn) nextBtn.disabled = current >= maxIndex;
      }

      // Seamless jump after transition ends
      if (seamlessActive && !jumping) {
        if (current >= totalReal) {
          jumping = true;
          setTimeout(function() {
            current -= totalReal;
            moveTo(current + cloneCount, false);
            jumping = false;
          }, 420);
        } else if (current <= -visible) {
          jumping = true;
          setTimeout(function() {
            current += totalReal;
            moveTo(current + cloneCount, false);
            jumping = false;
          }, 420);
        }
      }
    }

    function goTo(index) {
      if (jumping) return;
      if (seamlessActive) {
        current = ((index % totalReal) + totalReal) % totalReal;
      } else if (isLoop) {
        // rewind: wrap out-of-range indices, then clamp to the last full page
        const wrapped = ((index % totalReal) + totalReal) % totalReal;
        current = Math.min(wrapped, maxIndex);
      } else {
        current = Math.max(0, Math.min(index, maxIndex));
      }
      update(true);
    }

    function next() {
      if (jumping) return;
      if (seamlessActive) {
        current++;
      } else if (isLoop) {
        current = (current + 1) > maxIndex ? 0 : current + 1;
      } else {
        if (current >= maxIndex) return;
        current++;
      }
      update(true);
    }

    function prev() {
      if (jumping) return;
      if (seamlessActive) {
        current--;
      } else if (isLoop) {
        current = (current - 1) < 0 ? maxIndex : current - 1;
      } else {
        if (current <= 0) return;
        current--;
      }
      update(true);
    }

    if (prevBtn) prevBtn.addEventListener('click', function() { prev(); resetAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', function() { next(); resetAutoplay(); });
    dots.forEach(function(d, i) { d.addEventListener('click', function() { goTo(i); resetAutoplay(); }); });

    // Autoplay — off under prefers-reduced-motion, paused while hovered.
    // startAutoplay always clears first so intervals can never stack.
    let hovering = false;
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }
    function startAutoplay() {
      stopAutoplay();
      if (autoplayMs > 0 && !hovering && !prefersReducedMotion()) {
        autoplayTimer = setInterval(function() { if (!prefersReducedMotion()) next(); }, autoplayMs);
      }
    }
    function resetAutoplay() { startAutoplay(); }

    if (autoplayMs > 0) {
      el.addEventListener('mouseenter', function() { hovering = true; stopAutoplay(); });
      el.addEventListener('mouseleave', function() { hovering = false; startAutoplay(); });
    }

    update(false);
    startAutoplay();

    const api = { next: next, prev: prev, goTo: goTo, current: function() { return current; } };
    carouselInstances.set(el, api);
    return api;
  }

  function initCarousels(root) {
    each(root, '.sui-carousel', 'carousel', el => {
      if (!el.id) return;
      carousel(el);
    });
  }

  // =========================================
  // Charts
  // =========================================
  function initCharts(root) {
    // Bar charts — set heights from data-value
    each(root, '.sui-chart-bar-col', 'chart-bar-col', function(col) {
      // Skip grouped bars (handled separately)
      if (col.querySelector('.sui-chart-bar-group')) return;
      const fill = col.querySelector('.sui-chart-bar-fill');
      if (!fill) return;
      const val = parseFloat(fill.getAttribute('data-value'));
      if (isNaN(val)) return;
      const max = parseFloat(fill.getAttribute('data-max')) || 100;
      const pct = Math.min(100, Math.max(0, (val / max) * 100));
      fill.style.height = pct + '%';
    });

    // Grouped bars — set heights for each fill in a group
    each(root, '.sui-chart-bar-group', 'chart-bar-group', function(group) {
      group.querySelectorAll('.sui-chart-bar-fill').forEach(function(fill) {
        const val = parseFloat(fill.getAttribute('data-value'));
        if (isNaN(val)) return;
        const max = parseFloat(fill.getAttribute('data-max')) || 100;
        const pct = Math.min(100, Math.max(0, (val / max) * 100));
        fill.style.height = pct + '%';
      });
    });

    // Horizontal bars
    each(root, '.sui-chart-bar-row', 'chart-bar-row', function(row) {
      const fill = row.querySelector('.sui-chart-bar-fill');
      if (!fill) return;
      const val = parseFloat(fill.getAttribute('data-value'));
      if (isNaN(val)) return;
      const max = parseFloat(fill.getAttribute('data-max')) || 100;
      const pct = Math.min(100, Math.max(0, (val / max) * 100));
      fill.style.width = pct + '%';
    });

    // Stacked bars
    each(root, '.sui-chart-bar-track-stacked', 'chart-bar-stacked', function(track) {
      const fills = track.querySelectorAll('.sui-chart-bar-fill');
      let total = 0;
      fills.forEach(function(f) { total += parseFloat(f.getAttribute('data-value')) || 0; });
      const max = parseFloat(track.getAttribute('data-max')) || total || 100;
      fills.forEach(function(f) {
        const v = parseFloat(f.getAttribute('data-value')) || 0;
        f.style.height = ((v / max) * 100) + '%';
      });
    });

    // Donut / Pie charts — build conic-gradient from data-segments
    each(root, '.sui-chart-donut[data-segments]', 'chart-donut', function(donut) {
      try {
        const segments = JSON.parse(donut.getAttribute('data-segments'));
        let total = 0;
        segments.forEach(function(s) { total += s.value; });
        const stops = [];
        let cumulative = 0;
        segments.forEach(function(s) {
          const start = (cumulative / total) * 100;
          cumulative += s.value;
          const end = (cumulative / total) * 100;
          stops.push(s.color + ' ' + start + '% ' + end + '%');
        });
        donut.style.background = 'conic-gradient(' + stops.join(', ') + ')';
      } catch(_) {}
    });

    // Line / Area charts — measure path length for animation
    each(root, '.sui-chart-line-wrap .chart-line, .sui-chart-line-wrap .sui-chart-line', 'chart-line', function(path) {
      if (path.getTotalLength) {
        const len = path.getTotalLength();
        path.style.setProperty('--line-length', len);
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
      }
    });

    // SVG dot tooltips
    each(root, '.sui-chart-line-wrap', 'chart-line-wrap', function(wrap) {
      const dots = wrap.querySelectorAll('.chart-dot[data-value], .sui-chart-dot[data-value]');
      if (!dots.length) return;

      const tip = document.createElement('div');
      tip.className = 'sui-chart-tooltip';
      wrap.appendChild(tip);

      dots.forEach(function(dot) {
        dot.addEventListener('mouseenter', function() {
          const val = dot.getAttribute('data-value');
          tip.textContent = val;
          const svg = wrap.querySelector('svg');
          const svgRect = svg.getBoundingClientRect();
          const wrapRect = wrap.getBoundingClientRect();
          const cx = parseFloat(dot.getAttribute('cx'));
          const cy = parseFloat(dot.getAttribute('cy'));
          const viewBox = svg.viewBox.baseVal;
          const scaleX = svgRect.width / viewBox.width;
          const scaleY = svgRect.height / viewBox.height;
          const px = (cx * scaleX) + (svgRect.left - wrapRect.left);
          const py = (cy * scaleY) + (svgRect.top - wrapRect.top);
          tip.style.left = px + 'px';
          tip.style.top = (py - 8) + 'px';
          tip.classList.add('visible');
        });
        dot.addEventListener('mouseleave', function() {
          tip.classList.remove('visible');
        });
      });
    });
  }

  function initSelectablePricing(root) {
    each(root, '.sui-pricing-selectable', 'pricing', function(container) {
      const cards = container.querySelectorAll('.sui-pricing-card');
      cards.forEach(function(card) {
        card.addEventListener('click', function() {
          cards.forEach(function(c) { c.classList.remove('selected'); });
          card.classList.add('selected');
          container.setAttribute('data-selected', card.getAttribute('data-plan') || '');
          container.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });
  }

  function initStyledSelects(root) {
    each(root, '.sui-styled-select', 'styled-select', function(sel) {
      const trigger = sel.querySelector('.sui-styled-select-trigger');
      const menu = sel.querySelector('.sui-styled-select-menu');
      const valueEl = sel.querySelector('.sui-styled-select-value');
      const options = sel.querySelectorAll('.sui-styled-select-option');
      const placeholder = sel.getAttribute('data-placeholder') || '';
      let focusIdx = -1;

      if (!trigger || !menu) return;

      // Set initial value
      const selected = sel.querySelector('.sui-styled-select-option.selected');
      if (selected && valueEl) {
        valueEl.textContent = selected.textContent;
        valueEl.classList.remove('sui-styled-select-placeholder');
      } else if (valueEl && placeholder) {
        valueEl.textContent = placeholder;
        valueEl.classList.add('sui-styled-select-placeholder');
      }

      // Toggle menu
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        // Close other open selects
        document.querySelectorAll('.sui-styled-select.open').forEach(function(s) {
          if (s !== sel) s.classList.remove('open');
        });
        sel.classList.toggle('open');
        if (sel.classList.contains('open')) {
          // Focus selected or first option
          focusIdx = -1;
          options.forEach(function(o, i) { if (o.classList.contains('selected')) focusIdx = i; });
        }
      });

      // Option click
      options.forEach(function(opt, i) {
        opt.addEventListener('click', function() {
          options.forEach(function(o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
          if (valueEl) {
            valueEl.textContent = opt.textContent;
            valueEl.classList.remove('sui-styled-select-placeholder');
          }
          sel.setAttribute('data-value', opt.getAttribute('data-value') || opt.textContent);
          sel.classList.remove('open');
          // Dispatch change event for datatable filter integration
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          trigger.focus();
        });
      });

      // Keyboard navigation
      trigger.addEventListener('keydown', function(e) {
        const isOpen = sel.classList.contains('open');
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (!isOpen) { sel.classList.add('open'); focusIdx = -1; }
          if (e.key === 'ArrowDown') focusIdx = Math.min(focusIdx + 1, options.length - 1);
          else focusIdx = Math.max(focusIdx - 1, 0);
          options.forEach(function(o) { o.classList.remove('focused'); });
          options[focusIdx].classList.add('focused');
          options[focusIdx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isOpen && focusIdx >= 0) {
            options[focusIdx].click();
          } else {
            sel.classList.toggle('open');
          }
        } else if (e.key === 'Escape' && isOpen) {
          e.preventDefault();
          sel.classList.remove('open');
          options.forEach(function(o) { o.classList.remove('focused'); });
        }
      });
    });

    // Close on outside click
    if (!once('styled-select')) return;
    document.addEventListener('click', function(e) {
      if (!e.target.closest) return;
      if (!e.target.closest('.sui-styled-select')) {
        document.querySelectorAll('.sui-styled-select.open').forEach(function(s) {
          s.classList.remove('open');
        });
      }
    });
  }

  function initEditable(root) {
    each(root, '.sui-editable', 'editable', function(el) {
      const valueEl = el.querySelector('.sui-editable-value');
      if (!valueEl) return;

      // Keyboard access: the wrapper is a button that turns into a text input
      const ownLabel = !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby');
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
      if (ownLabel) el.setAttribute('aria-label', 'Edit: ' + valueEl.textContent.trim());
      const iconEl = el.querySelector('.sui-editable-icon');
      if (iconEl && !iconEl.hasAttribute('aria-hidden')) iconEl.setAttribute('aria-hidden', 'true');
      const restTabindex = el.getAttribute('tabindex');

      function startEdit() {
        if (el.querySelector('.sui-editable-input')) return; // Already editing

        const currentText = valueEl.textContent;
        const input = document.createElement('input');
        input.className = 'sui-editable-input';
        input.type = 'text';
        input.value = currentText;
        input.style.fontSize = getComputedStyle(valueEl).fontSize;
        input.style.fontWeight = getComputedStyle(valueEl).fontWeight;
        input.setAttribute('aria-label', el.getAttribute('aria-label') || 'Edit text');

        valueEl.style.display = 'none';
        const icon = el.querySelector('.sui-editable-icon');
        if (icon) icon.style.display = 'none';

        // Shift+Tab from the input shouldn't land back on the wrapper
        el.setAttribute('tabindex', '-1');
        // A role=button must not contain the textbox: drop role/label while editing
        const restRole = el.getAttribute('role');
        const restLabel = el.getAttribute('aria-label');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
        el.insertBefore(input, valueEl);
        input.focus();
        input.select();

        let finished = false;

        function finish(byKey) {
          finished = true;
          valueEl.style.display = '';
          if (icon) icon.style.display = '';
          el.setAttribute('tabindex', restTabindex);
          if (restRole !== null) el.setAttribute('role', restRole);
          if (restLabel !== null && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', restLabel);
          input.remove();
          // Return focus only for keyboard endings; a blur-save must not steal focus
          if (byKey) el.focus();
        }

        function save(byKey) {
          if (finished) return;
          const newVal = input.value.trim() || currentText;
          valueEl.textContent = newVal;
          if (ownLabel) el.setAttribute('aria-label', 'Edit: ' + newVal);
          finish(byKey === true);
          const d = { value: newVal, previous: currentText };
          emit(el, 'editable:save', d); // legacy name
          emit(el, 'sui-editable-save', d);
        }

        function cancel() {
          if (finished) return;
          finish(true);
          emit(el, 'editable:cancel'); // legacy name
          emit(el, 'sui-editable-cancel');
        }

        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { e.preventDefault(); save(true); }
          if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        });

        input.addEventListener('blur', save);
      }

      el.addEventListener('click', startEdit);
      el.addEventListener('keydown', function(e) {
        if (e.target !== el) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'F2') {
          e.preventDefault();
          startEdit();
        }
      });
    });
  }

  function initScrollspy(root) {
    each(root, '[data-sui-scrollspy]', 'scrollspy', function(nav) {
      const links = nav.querySelectorAll('a[href^="#"]');
      if (!links.length) return;

      const targetIds = [];
      links.forEach(function(link) {
        const id = link.getAttribute('href').slice(1);
        if (id) targetIds.push(id);
      });

      // Find scroll container — either specified or auto-detect from first target's scrollable parent
      const firstTarget = document.getElementById(targetIds[0]);
      let scrollRoot = null;
      if (firstTarget) {
        let parent = firstTarget.parentElement;
        while (parent && parent !== document.body) {
          const style = getComputedStyle(parent);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            scrollRoot = parent;
            break;
          }
          parent = parent.parentElement;
        }
      }

      const visibleSections = new Set();
      let clickLock = false;

      const observer = new IntersectionObserver(function(entries) {
        if (clickLock) return;
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            visibleSections.add(entry.target.id);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });
        // Check if scrolled to bottom of container
        let atBottom = false;
        if (scrollRoot) {
          atBottom = scrollRoot.scrollTop + scrollRoot.clientHeight >= scrollRoot.scrollHeight - 5;
        } else {
          atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 5;
        }

        if (atBottom && visibleSections.size > 0) {
          // At bottom — pick the last visible section
          for (let i = targetIds.length - 1; i >= 0; i--) {
            if (visibleSections.has(targetIds[i])) {
              links.forEach(function(l) { l.classList.remove('active'); });
              const active = nav.querySelector('a[href="#' + targetIds[i] + '"]');
              if (active) active.classList.add('active');
              break;
            }
          }
        } else {
          // Pick the first visible section in document order
          for (let i = 0; i < targetIds.length; i++) {
            if (visibleSections.has(targetIds[i])) {
              links.forEach(function(l) { l.classList.remove('active'); });
              const active = nav.querySelector('a[href="#' + targetIds[i] + '"]');
              if (active) active.classList.add('active');
              break;
            }
          }
        }
      }, {
        root: scrollRoot,
        rootMargin: '0px 0px -30% 0px',
        threshold: 0
      });

      targetIds.forEach(function(id) {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });

      // Click to scroll and activate
      links.forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          const id = link.getAttribute('href').slice(1);
          const el = document.getElementById(id);
          if (!el) return;
          clickLock = true;
          links.forEach(function(l) { l.classList.remove('active'); });
          link.classList.add('active');
          if (scrollRoot) {
            scrollRoot.scrollTo({ top: el.offsetTop - scrollRoot.offsetTop, behavior: scrollBehavior() });
          } else {
            el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
          }
          setTimeout(function() { clickLock = false; }, 600);
        });
      });
    });
  }

  function initCountdowns(root) {
    each(root, '.sui-countdown[data-date]', 'countdown', function(el) {
      const dateStr = el.getAttribute('data-date');

      // Support relative dates: "+2y", "+30d", "+2y5d", "+6h30m", "+2y 5d"
      let target;
      if (dateStr.startsWith('+')) {
        if (!/^\+\s*(\d+\s*[ydhms]\s*)+$/.test(dateStr)) {
          target = NaN;
        } else {
          target = new Date();
          const parts = dateStr.slice(1).matchAll(/(\d+)\s*([ydhms])/g);
          for (const p of parts) {
            const val = parseInt(p[1], 10);
            const unit = p[2];
            if (unit === 'y') target.setFullYear(target.getFullYear() + val);
            else if (unit === 'd') target.setDate(target.getDate() + val);
            else if (unit === 'h') target.setHours(target.getHours() + val);
            else if (unit === 'm') target.setMinutes(target.getMinutes() + val);
            else if (unit === 's') target.setSeconds(target.getSeconds() + val);
          }
          target = target.getTime();
        }
      } else {
        target = new Date(dateStr).getTime();
      }

      // Invalid date: show placeholders, warn once, run no timer, fire no countdown:end
      if (!Number.isFinite(target)) {
        console.warn('[SoftUI] Countdown: invalid data-date "' + dateStr + '"', el);
        el.setAttribute('data-countdown-invalid', '');
        ['[data-years]', '[data-days]', '[data-hours]', '[data-minutes]', '[data-seconds]'].forEach(function(sel) {
          const n = el.querySelector(sel); if (n) n.textContent = '--';
        });
        return;
      }

      const yearsEl = el.querySelector('[data-years]');
      const daysEl = el.querySelector('[data-days]');
      const hoursEl = el.querySelector('[data-hours]');
      const minsEl = el.querySelector('[data-minutes]');
      const secsEl = el.querySelector('[data-seconds]');
      let timer = null;
      let ended = false;

      function update() {
        const now = Date.now();
        const diff = Math.max(0, target - now);
        let remaining = diff;
        const y = Math.floor(remaining / 31536000000);
        remaining %= 31536000000;
        const d = Math.floor(remaining / 86400000);
        remaining %= 86400000;
        const h = Math.floor(remaining / 3600000);
        remaining %= 3600000;
        const m = Math.floor(remaining / 60000);
        remaining %= 60000;
        const s = Math.floor(remaining / 1000);
        if (yearsEl) yearsEl.textContent = String(y).padStart(2, '0');
        if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
        if (minsEl) minsEl.textContent = String(m).padStart(2, '0');
        if (secsEl) secsEl.textContent = String(s).padStart(2, '0');
        if (!(diff > 0)) {
          ended = true;
          if (timer) clearInterval(timer);
          emit(el, 'countdown:end'); // legacy name
          emit(el, 'sui-countdown-end');
        }
      }

      update();
      if (!ended) timer = setInterval(update, 1000);
    });
  }

  function initSegmented(root) {
    each(root, '.sui-segmented', 'segmented', function(seg) {
      const indicator = seg.querySelector('.sui-segmented-indicator');
      if (!indicator) return;

      function updateIndicator() {
        const checked = seg.querySelector('input:checked');
        if (!checked) return;
        const label = checked.nextElementSibling;
        if (!label) return;
        indicator.style.left = label.offsetLeft + 'px';
        indicator.style.width = label.offsetWidth + 'px';
      }

      // Initial position
      updateIndicator();

      // Listen for changes
      seg.querySelectorAll('input').forEach(function(input) {
        input.addEventListener('change', updateIndicator);
      });

      // Recalculate on resize
      window.addEventListener('resize', updateIndicator);
    });
  }

  // Disclosure-navigation pattern: triggers / sub-parent links expose aria-expanded
  let navMenuPanelCount = 0;

  function navMenuControl(container) {
    if (container.classList.contains('sui-nav-menu-sub')) return container.querySelector(':scope > .sui-nav-menu-link');
    return container.querySelector(':scope > .sui-nav-menu-trigger:not([href])');
  }

  function navMenuPanel(container) {
    return container.querySelector(':scope > .sui-nav-menu-panel');
  }

  function navMenuPrimeOne(container) {
    const ctrl = navMenuControl(container);
    const panel = navMenuPanel(container);
    if (!ctrl || !panel) return;
    if (!ctrl.hasAttribute('aria-expanded')) ctrl.setAttribute('aria-expanded', container.classList.contains('open') ? 'true' : 'false');
    if (!ctrl.hasAttribute('aria-controls')) {
      if (!panel.id) panel.id = 'sui-navmenu-panel-' + (++navMenuPanelCount);
      ctrl.setAttribute('aria-controls', panel.id);
    }
  }

  function navMenuSetOpen(container, open) {
    container.classList.toggle('open', open);
    const ctrl = navMenuControl(container);
    if (ctrl && navMenuPanel(container)) ctrl.setAttribute('aria-expanded', open ? 'true' : 'false');
    // Closing also closes nested subs so stale state doesn't reappear on next open
    if (!open) {
      container.querySelectorAll('.sui-nav-menu-sub.open').forEach(function(sub) { navMenuSetOpen(sub, false); });
    }
  }

  function navMenuCloseAll(except) {
    document.querySelectorAll('.sui-nav-menu-item.open').forEach(function(i) {
      if (i !== except) navMenuSetOpen(i, false);
    });
  }

  // Close open subs in the same panel that aren't this sub, its ancestors or descendants
  function navMenuCloseSiblingSubs(sub) {
    const panel = sub.parentElement && sub.parentElement.closest('.sui-nav-menu-panel');
    if (!panel) return;
    panel.querySelectorAll('.sui-nav-menu-sub.open').forEach(function(s) {
      if (s !== sub && !s.contains(sub) && !sub.contains(s)) navMenuSetOpen(s, false);
    });
  }

  // Visible links that belong directly to this panel (not to nested sub panels)
  function navMenuLinks(panel) {
    return Array.from(panel.querySelectorAll('.sui-nav-menu-link')).filter(function(l) {
      return l.closest('.sui-nav-menu-panel') === panel && l.offsetParent !== null;
    });
  }

  function initNavMenu() {
    document.querySelectorAll('.sui-nav-menu-item, .sui-nav-menu-sub').forEach(navMenuPrimeOne);
    if (!once('nav-menu')) return;

    // Toggle on click
    document.addEventListener('click', function(e) {
      if (!e.target.closest) return;
      const trigger = e.target.closest('.sui-nav-menu-trigger');
      if (trigger && !trigger.hasAttribute('href')) {
        const item = trigger.closest('.sui-nav-menu-item');
        if (!item) return;
        navMenuPrimeOne(item);
        // Close other open items
        navMenuCloseAll(item);
        navMenuSetOpen(item, !item.classList.contains('open'));
        e.stopPropagation();
        return;
      }
      // Click (or Enter) on a sub-menu parent toggles it, in hover and click modes
      const subLink = e.target.closest('.sui-nav-menu-sub > .sui-nav-menu-link');
      if (subLink) {
        const sub = subLink.parentElement;
        e.preventDefault();
        e.stopPropagation();
        navMenuPrimeOne(sub);
        navMenuCloseSiblingSubs(sub);
        navMenuSetOpen(sub, !sub.classList.contains('open'));
        return;
      }

      // Click on a nav-menu link closes everything
      const link = e.target.closest('.sui-nav-menu-link');
      if (link && link.closest('.sui-nav-menu-item')) {
        navMenuCloseAll();
        return;
      }

      // Click outside closes all
      if (!e.target.closest('.sui-nav-menu-item')) {
        navMenuCloseAll();
      }
    });

    // Hover-mode subs: entering another sub closes a click/keyboard-opened sibling
    document.addEventListener('mouseover', function(e) {
      if (!e.target.closest) return;
      const sub = e.target.closest('.sui-nav-menu-sub');
      if (!sub || sub.closest('.sui-nav-menu-sub-click')) return;
      navMenuCloseSiblingSubs(sub);
    });

    // Keyboard
    document.addEventListener('keydown', function(e) {
      const t = e.target;
      if (e.key === 'Escape') {
        const container = t.closest && t.closest('.sui-nav-menu .sui-nav-menu-sub.open, .sui-nav-menu .sui-nav-menu-item.open');
        if (container) {
          e.preventDefault();
          navMenuSetOpen(container, false);
          const ctrl = navMenuControl(container);
          if (ctrl) ctrl.focus();
          return;
        }
        if (document.querySelector('.sui-nav-menu-item.open')) e.preventDefault();
        navMenuCloseAll();
        return;
      }
      if (!t.closest) return;
      const nav = t.closest('.sui-nav-menu');
      if (!nav) return;
      const rtl = getComputedStyle(nav).direction === 'rtl';
      const inward = rtl ? 'ArrowLeft' : 'ArrowRight';
      const outward = rtl ? 'ArrowRight' : 'ArrowLeft';

      // Top-level trigger: ArrowDown opens and focuses the first link
      if (t.matches('.sui-nav-menu-trigger:not([href])')) {
        if (e.key !== 'ArrowDown') return;
        const item = t.closest('.sui-nav-menu-item');
        const panel = item && navMenuPanel(item);
        if (!panel) return;
        e.preventDefault();
        navMenuPrimeOne(item);
        navMenuCloseAll(item);
        navMenuSetOpen(item, true);
        const first = navMenuLinks(panel)[0];
        if (first) first.focus();
        return;
      }

      if (!t.matches('.sui-nav-menu-link')) return;
      const panel = t.closest('.sui-nav-menu-panel');
      if (!panel) return;
      const sub = t.parentElement && t.parentElement.classList.contains('sui-nav-menu-sub') ? t.parentElement : null;

      // Sub-parent: inward arrow (or Space) opens the sub and focuses its first link
      if (sub && (e.key === inward || e.key === ' ')) {
        const subPanel = navMenuPanel(sub);
        if (!subPanel) return;
        e.preventDefault();
        navMenuPrimeOne(sub);
        navMenuCloseSiblingSubs(sub);
        navMenuSetOpen(sub, true);
        if (e.key === inward) {
          const first = navMenuLinks(subPanel)[0];
          if (first) first.focus();
        }
        return;
      }

      // Outward arrow inside a sub panel: close it and return to its parent link
      if (e.key === outward) {
        const owner = panel.parentElement;
        if (owner && owner.classList.contains('sui-nav-menu-sub')) {
          e.preventDefault();
          navMenuSetOpen(owner, false);
          const ctrl = navMenuControl(owner);
          if (ctrl) ctrl.focus();
        }
        return;
      }

      // ArrowUp / ArrowDown move between this panel's own links (wrapping)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const links = navMenuLinks(panel);
        const i = links.indexOf(t);
        if (i === -1 || !links.length) return;
        e.preventDefault();
        const next = e.key === 'ArrowDown' ? (i + 1) % links.length : (i - 1 + links.length) % links.length;
        links[next].focus();
      }
    });

    // Tabbing out of an open item/sub closes it. A null relatedTarget (click on a
    // non-focusable spot, or leaving the window) is ignored; outside clicks are
    // handled by the click listener above.
    document.addEventListener('focusout', function(e) {
      const rt = e.relatedTarget;
      if (!rt || !e.target.closest) return;
      document.querySelectorAll('.sui-nav-menu-item.open, .sui-nav-menu-sub.open').forEach(function(c) {
        if (c.contains(e.target) && !c.contains(rt)) navMenuSetOpen(c, false);
      });
    });
  }

  function initDrawers(root) {
    each(root, '.sui-drawer', 'drawer', function(backdrop) {
      const panel = backdrop.querySelector('.sui-sheet-bottom');
      const handle = backdrop.querySelector('.sui-drawer-handle');
      if (!panel || !handle) return;

      let startY = 0;
      let startHeight = 0;
      let dragging = false;

      function onStart(e) {
        dragging = true;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        startHeight = panel.getBoundingClientRect().height;
        panel.style.transition = 'none';
        document.body.style.userSelect = 'none';
      }

      function onMove(e) {
        if (!dragging) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const delta = startY - clientY;
        const newHeight = Math.max(0, startHeight + delta);
        const maxHeight = window.innerHeight * 0.85;
        panel.style.height = Math.min(newHeight, maxHeight) + 'px';
      }

      function onEnd() {
        if (!dragging) return;
        dragging = false;
        panel.style.transition = '';
        document.body.style.userSelect = '';

        const currentHeight = panel.getBoundingClientRect().height;
        const vh = window.innerHeight;

        // Snap points or dismiss
        const snapPoints = backdrop.getAttribute('data-snap');
        if (snapPoints) {
          const points = snapPoints.split(',').map(function(p) { return parseFloat(p) / 100 * vh; });
          points.push(0); // dismiss point
          let closest = points[0];
          let minDist = Math.abs(currentHeight - closest);
          points.forEach(function(p) {
            const dist = Math.abs(currentHeight - p);
            if (dist < minDist) { minDist = dist; closest = p; }
          });
          if (closest === 0) {
            panel.style.height = '';
            const s = sheet(backdrop);
            if (s) s.close();
          } else {
            panel.style.height = closest + 'px';
          }
        } else {
          // No snap points — dismiss if dragged below 30% of starting height
          if (currentHeight < startHeight * 0.3) {
            panel.style.height = '';
            const s = sheet(backdrop);
            if (s) s.close();
          }
        }
      }

      handle.addEventListener('mousedown', onStart);
      handle.addEventListener('touchstart', onStart, { passive: true });
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchend', onEnd);
    });
  }

  function initDataTables(root) {
    each(root, '.sui-datatable', 'datatable', function(dt) {
      const table = dt.querySelector('.sui-table');
      if (!table) return;

      const tbody = table.querySelector('tbody');
      if (!tbody) return;

      const allRows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
      let filteredRows = allRows.slice();
      let currentPage = 1;

      // Per-page selector (supports native <select> and .sui-styled-select)
      const perpageNative = dt.querySelector('.sui-datatable-perpage select');
      const perpageStyled = dt.querySelector('.sui-datatable-perpage .sui-styled-select');
      const perpageSelect = perpageNative || perpageStyled;
      function getPerpageValue() {
        if (perpageNative) return parseInt(perpageNative.value, 10);
        if (perpageStyled) return parseInt(perpageStyled.getAttribute('data-value') || '', 10);
        return allRows.length;
      }
      let perPage = perpageSelect ? getPerpageValue() : allRows.length;

      // Info & pagination elements
      const infoEl = dt.querySelector('.sui-datatable-info');
      const paginationEl = dt.querySelector('.sui-datatable-pagination');

      // Search input
      const searchInput = dt.querySelector('.sui-datatable-search input');

      function render() {
        const total = filteredRows.length;
        const totalPages = perPage > 0 ? Math.ceil(total / perPage) : 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const start = (currentPage - 1) * perPage;
        const end = Math.min(start + perPage, total);

        // Hide all rows, then show only current page
        allRows.forEach(function(row) { row.style.display = 'none'; });
        for (let i = start; i < end; i++) {
          filteredRows[i].style.display = '';
        }

        // Show empty message if no results
        let emptyRow = tbody.querySelector('.sui-datatable-empty-row');
        if (total === 0) {
          if (!emptyRow) {
            emptyRow = document.createElement('tr');
            emptyRow.className = 'sui-datatable-empty-row';
            const td = document.createElement('td');
            td.className = 'sui-datatable-empty';
            td.colSpan = table.querySelectorAll('thead th').length;
            td.textContent = 'No matching records found.';
            emptyRow.appendChild(td);
            tbody.appendChild(emptyRow);
          }
          emptyRow.style.display = '';
        } else if (emptyRow) {
          emptyRow.style.display = 'none';
        }

        // Update info text
        if (infoEl) {
          if (total === 0) {
            infoEl.textContent = 'No entries';
          } else {
            infoEl.textContent = 'Showing ' + (start + 1) + '–' + end + ' of ' + total;
          }
        }

        // Build pagination buttons
        if (paginationEl) {
          paginationEl.innerHTML = '';

          const prevBtn = document.createElement('button');
          prevBtn.textContent = '\u2039';
          prevBtn.disabled = currentPage <= 1;
          prevBtn.addEventListener('click', function() {
            if (currentPage > 1) { currentPage--; render(); }
          });
          paginationEl.appendChild(prevBtn);

          for (let p = 1; p <= totalPages; p++) {
            (function(page) {
              const btn = document.createElement('button');
              btn.textContent = page;
              if (page === currentPage) btn.className = 'active';
              btn.addEventListener('click', function() {
                currentPage = page;
                render();
              });
              paginationEl.appendChild(btn);
            })(p);
          }

          const nextBtn = document.createElement('button');
          nextBtn.textContent = '\u203A';
          nextBtn.disabled = currentPage >= totalPages;
          nextBtn.addEventListener('click', function() {
            if (currentPage < totalPages) { currentPage++; render(); }
          });
          paginationEl.appendChild(nextBtn);
        }
      }

      // Filter elements (supports <select> and .sui-dropdown)
      const filterEls = dt.querySelectorAll('.sui-datatable-filter');

      function getFilterValue(el) {
        if (el.tagName === 'SELECT') return el.value;
        // Dropdown-based filter: read from active item
        const active = el.querySelector('.sui-dropdown-item.active');
        return active ? (active.getAttribute('data-value') || '') : '';
      }

      function applyFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        filteredRows = allRows.filter(function(row) {
          if (query && row.textContent.toLowerCase().indexOf(query) === -1) return false;
          let pass = true;
          filterEls.forEach(function(el) {
            const attr = el.getAttribute('data-filter-attr') || 'data-status';
            const val = getFilterValue(el);
            if (val && row.getAttribute(attr) !== val) pass = false;
          });
          return pass;
        });
        currentPage = 1;
        render();
      }

      // Search input
      if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
      }

      // Wire up filters
      filterEls.forEach(function(el) {
        if (el.tagName === 'SELECT') {
          el.addEventListener('change', applyFilters);
        } else {
          // Dropdown-based filter
          el.querySelectorAll('.sui-dropdown-item').forEach(function(item) {
            item.addEventListener('click', function() {
              // Update active state
              el.querySelectorAll('.sui-dropdown-item').forEach(function(i) { i.classList.remove('active'); });
              item.classList.add('active');
              // Update label
              const label = el.querySelector('.sui-datatable-filter-label');
              if (label) label.textContent = item.textContent;
              // Close dropdown
              el.classList.remove('open');
              const toggle = el.querySelector('.sui-dropdown-toggle');
              if (toggle) toggle.setAttribute('aria-expanded', 'false');
              applyFilters();
            });
          });
        }
      });

      // Per-page change
      if (perpageSelect) {
        perpageSelect.addEventListener('change', function() {
          perPage = getPerpageValue();
          currentPage = 1;
          render();
        });
      }

      // Sortable headers (unsorted → asc → desc → unsorted)
      const ths = table.querySelectorAll('th[data-sort]');
      ths.forEach(function(th) {
        th.addEventListener('click', function() {
          const colIndex = Array.prototype.indexOf.call(th.parentElement.children, th);
          const type = th.getAttribute('data-sort');

          // Cycle: unsorted → asc → desc → unsorted
          let dir;
          if (th.classList.contains('sort-asc')) {
            dir = 'desc';
          } else if (th.classList.contains('sort-desc')) {
            dir = 'none';
          } else {
            dir = 'asc';
          }

          // Reset all headers
          ths.forEach(function(h) { h.classList.remove('sort-asc', 'sort-desc'); });

          if (dir === 'none') {
            // Restore original order within filtered set
            filteredRows = allRows.filter(function(row) { return filteredRows.indexOf(row) !== -1; });
          } else {
            th.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc');
            filteredRows.sort(function(a, b) {
              const aText = a.children[colIndex] ? a.children[colIndex].textContent.trim() : '';
              const bText = b.children[colIndex] ? b.children[colIndex].textContent.trim() : '';

              if (type === 'number') {
                const aNum = parseFloat(aText.replace(/[^0-9.\-]/g, '')) || 0;
                const bNum = parseFloat(bText.replace(/[^0-9.\-]/g, '')) || 0;
                return dir === 'asc' ? aNum - bNum : bNum - aNum;
              }

              return dir === 'asc' ? aText.localeCompare(bText) : bText.localeCompare(aText);
            });
          }

          // Re-append sorted rows to DOM
          filteredRows.forEach(function(row) { tbody.appendChild(row); });
          currentPage = 1;
          render();
        });
      });

      // Initial render
      render();
    });
  }

  function initDragDrop(root) {
    // ── Sortable Lists ──
    each(root, '.sui-sortable', 'sortable', function(list) {
      let dragItem = null;

      list.querySelectorAll('.sui-sortable-item').forEach(function(item) {
        const handle = item.querySelector('.sui-sortable-handle');
        const dragTarget = handle || item;

        dragTarget.setAttribute('draggable', 'true');
        if (handle) item.classList.add('has-handle');

        dragTarget.addEventListener('dragstart', function(e) {
          dragItem = item;
          item.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (item !== dragItem) {
            item.classList.add('drag-over');
          }
        });

        item.addEventListener('dragleave', function() {
          item.classList.remove('drag-over');
        });

        item.addEventListener('drop', function(e) {
          e.preventDefault();
          item.classList.remove('drag-over');
          if (!dragItem || dragItem === item) return;
          const items = Array.prototype.slice.call(list.children);
          const fromIndex = items.indexOf(dragItem);
          const toIndex = items.indexOf(item);
          if (fromIndex < toIndex) {
            list.insertBefore(dragItem, item.nextSibling);
          } else {
            list.insertBefore(dragItem, item);
          }
        });

        item.addEventListener('dragend', function() {
          item.classList.remove('dragging');
          list.querySelectorAll('.drag-over').forEach(function(el) {
            el.classList.remove('drag-over');
          });
          dragItem = null;
        });
      });
    });

    // ── Kanban ──
    each(root, '.sui-kanban', 'kanban', function(kanban) {
      let dragCard = null;

      kanban.querySelectorAll('.sui-kanban-card').forEach(function(card) {
        card.setAttribute('draggable', 'true');

        card.addEventListener('dragstart', function(e) {
          dragCard = card;
          card.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', function() {
          card.classList.remove('dragging');
          kanban.querySelectorAll('.drag-over').forEach(function(el) {
            el.classList.remove('drag-over');
          });
          dragCard = null;
        });
      });

      kanban.querySelectorAll('.sui-kanban-col-body').forEach(function(col) {
        col.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          col.classList.add('drag-over');

          // Position among siblings
          if (!dragCard) return;
          const afterEl = getDragAfterElement(col, e.clientY);
          if (afterEl) {
            col.insertBefore(dragCard, afterEl);
          } else {
            col.appendChild(dragCard);
          }
        });

        col.addEventListener('dragleave', function(e) {
          if (!col.contains(e.relatedTarget)) {
            col.classList.remove('drag-over');
          }
        });

        col.addEventListener('drop', function(e) {
          e.preventDefault();
          col.classList.remove('drag-over');
        });
      });
    });

    function getDragAfterElement(container, y) {
      const els = Array.prototype.slice.call(
        container.querySelectorAll('.sui-kanban-card:not(.dragging)')
      );
      let closest = null;
      let closestOffset = Number.NEGATIVE_INFINITY;
      els.forEach(function(el) {
        const box = el.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closestOffset) {
          closestOffset = offset;
          closest = el;
        }
      });
      return closest;
    }

    // ── Drop Zone ──
    // File names are user-controlled: always inserted as text
    function addDropzoneFiles(zone, files) {
      let fileList = zone.querySelector('.sui-dropzone-files');
      if (!fileList) {
        fileList = document.createElement('div');
        fileList.className = 'sui-dropzone-files';
        zone.appendChild(fileList);
      }
      Array.prototype.slice.call(files).forEach(function(file) {
        const item = document.createElement('div');
        item.className = 'sui-dropzone-file';
        const name = document.createElement('span');
        name.textContent = file.name;
        const remove = document.createElement('button');
        remove.className = 'sui-dropzone-file-remove';
        remove.type = 'button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', 'Remove ' + file.name);
        remove.addEventListener('click', function(ev) {
          ev.stopPropagation();
          item.remove();
        });
        item.appendChild(name);
        item.appendChild(remove);
        fileList.appendChild(item);
      });
    }

    each(root, '.sui-dropzone', 'dropzone', function(zone) {
      // Click-to-upload: create hidden file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.style.display = 'none';
      zone.appendChild(fileInput);

      zone.addEventListener('click', function(e) {
        if (e.target.closest('.sui-dropzone-file-remove')) return;
        fileInput.click();
      });

      fileInput.addEventListener('change', function() {
        const files = fileInput.files;
        if (!files.length) return;
        addDropzoneFiles(zone, files);
        fileInput.value = '';
      });

      zone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', function(e) {
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove('drag-over');
        }
      });

      zone.addEventListener('drop', function(e) {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (!files.length) return;
        addDropzoneFiles(zone, files);
      });
    });
  }

  // =========================================
  // Sidebar — collapsible toggle
  // =========================================
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-sidebar-toggle]');
    if (!btn) return;
    const sidebar = btn.closest('.sui-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('sui-sidebar-collapsed');
    }
  });

  // =========================================
  // Sidebar — off-canvas drawer (below 900px, or always with .sui-sidebar-drawer)
  // =========================================
  const sidebarState = new WeakMap(); // el -> { prevFocus }
  const sidebarMq = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;

  function sidebarIsDrawer(el) {
    if (el.classList.contains('sui-sidebar-drawer')) return true;
    if (el.classList.contains('sui-sidebar-static')) return false;
    return !!(sidebarMq && sidebarMq.matches);
  }

  function sidebarQuery(sel) {
    try { return document.querySelector(sel); } catch (_) { return null; }
  }

  function sidebarResolve(trigger) {
    const sel = trigger.getAttribute('data-sidebar-open');
    return sel ? sidebarQuery(sel) : document.querySelector('.sui-sidebar:not(.sui-sidebar-static)');
  }

  function sidebarTriggers(el) {
    return Array.from(document.querySelectorAll('[data-sidebar-open]')).filter(function(t) {
      return sidebarResolve(t) === el;
    });
  }

  function sidebarOverlay(el) {
    const next = el.nextElementSibling;
    if (next && next.classList.contains('sui-sidebar-overlay')) return next;
    const overlay = document.createElement('div');
    overlay.className = 'sui-sidebar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    el.parentNode.insertBefore(overlay, el.nextSibling);
    return overlay;
  }

  function sidebarIsOpen(el) {
    return el.classList.contains('sui-sidebar-mobile-open');
  }

  function sidebarOpen(el) {
    // Only opens when the sidebar is actually a drawer (mobile, or .sui-sidebar-drawer)
    if (!el || sidebarIsOpen(el) || !sidebarIsDrawer(el)) return;
    sidebarState.set(el, { prevFocus: document.activeElement });
    el.classList.add('sui-sidebar-mobile-open');
    sidebarOverlay(el).classList.add('open');
    document.body.style.overflow = 'hidden';
    sidebarTriggers(el).forEach(function(t) { t.setAttribute('aria-expanded', 'true'); });
    // Children with `transition: all` animate the inherited visibility
    focusInto(el, el, function() { return sidebarIsOpen(el); }, 0);
  }

  function sidebarClose(el) {
    if (!el || !sidebarIsOpen(el)) return;
    el.classList.remove('sui-sidebar-mobile-open');
    const next = el.nextElementSibling;
    if (next && next.classList.contains('sui-sidebar-overlay')) next.classList.remove('open');
    document.body.style.overflow = '';
    sidebarTriggers(el).forEach(function(t) { t.setAttribute('aria-expanded', 'false'); });
    const state = sidebarState.get(el);
    sidebarState.delete(el);
    const prev = state && state.prevFocus;
    const active = document.activeElement;
    // Return focus to the opener unless the user has already moved it elsewhere
    if (prev && prev.isConnected && typeof prev.focus === 'function' &&
        (!active || active === document.body || el.contains(active))) {
      prev.focus();
    }
  }

  // Sets aria-expanded / aria-controls on existing [data-sidebar-open] triggers.
  function initSidebars() {
    document.querySelectorAll('[data-sidebar-open]').forEach(function(t) {
      const target = sidebarResolve(t);
      if (!target) return;
      if (!t.hasAttribute('aria-expanded')) t.setAttribute('aria-expanded', sidebarIsOpen(target) ? 'true' : 'false');
      if (target.id && !t.hasAttribute('aria-controls')) t.setAttribute('aria-controls', target.id);
    });
  }

  document.addEventListener('click', function(e) {
    if (!e.target.closest) return;
    const opener = e.target.closest('[data-sidebar-open]');
    if (opener) {
      const target = sidebarResolve(opener);
      if (!target) return;
      e.preventDefault();
      if (sidebarIsOpen(target)) sidebarClose(target); else sidebarOpen(target);
      return;
    }
    const closer = e.target.closest('[data-sidebar-close]');
    if (closer) {
      const sel = closer.getAttribute('data-sidebar-close');
      sidebarClose((sel && sidebarQuery(sel)) || closer.closest('.sui-sidebar'));
      return;
    }
    if (e.target.classList.contains('sui-sidebar-overlay')) {
      const prev = e.target.previousElementSibling;
      if (prev && prev.classList.contains('sui-sidebar')) sidebarClose(prev);
      else document.querySelectorAll('.sui-sidebar.sui-sidebar-mobile-open').forEach(sidebarClose);
      return;
    }
    const navLink = e.target.closest('.sui-sidebar-mobile-open .sui-sidebar-nav a[href], .sui-sidebar-mobile-open .sui-sidebar-nav li > button:not([aria-expanded])');
    if (navLink) sidebarClose(navLink.closest('.sui-sidebar'));
  });

  // On window (after document-level handlers): skip keys a popup or another
  // overlay inside the drawer already handled
  window.addEventListener('keydown', function(e) {
    if ((e.key !== 'Escape' && e.key !== 'Tab') || e.defaultPrevented) return;
    const open = document.querySelectorAll('.sui-sidebar.sui-sidebar-mobile-open');
    if (!open.length) return;
    // A modal or sheet opened from the drawer sits on top and owns Tab/Escape
    if (document.querySelector(OPEN_OVERLAYS)) return;
    if (e.key === 'Escape') {
      open.forEach(sidebarClose);
      return;
    }
    // Tab: keep focus inside the (last) open drawer
    const el = open[open.length - 1];
    const focusable = visibleFocusable(el);
    if (!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const inside = el.contains(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || !inside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  });

  // Growing past 900px closes media-query drawers so body scroll isn't left locked
  if (sidebarMq) {
    const onSidebarMqChange = function(e) {
      if (!e.matches) document.querySelectorAll('.sui-sidebar.sui-sidebar-mobile-open:not(.sui-sidebar-drawer)').forEach(sidebarClose);
    };
    if (sidebarMq.addEventListener) sidebarMq.addEventListener('change', onSidebarMqChange);
    else if (sidebarMq.addListener) sidebarMq.addListener(onSidebarMqChange);
  }

  function sidebar(selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return null;

    function collapse() { el.classList.add('sui-sidebar-collapsed'); }
    function expand() { el.classList.remove('sui-sidebar-collapsed'); }
    function toggle() { el.classList.toggle('sui-sidebar-collapsed'); }
    function isCollapsed() { return el.classList.contains('sui-sidebar-collapsed'); }
    function open() { sidebarOpen(el); }
    function close() { sidebarClose(el); }
    function isOpen() { return sidebarIsOpen(el); }

    return { collapse: collapse, expand: expand, toggle: toggle, isCollapsed: isCollapsed, open: open, close: close, isOpen: isOpen, el: el };
  }

  // =========================================
  // Rating
  // =========================================
  function ratingIsHalf(star, e) {
    const rect = star.getBoundingClientRect();
    return e.clientX < rect.left + rect.width / 2;
  }

  function ratingEnsureDualSvg(star) {
    const svgs = star.querySelectorAll('svg');
    if (svgs.length < 2) {
      const clone = svgs[0].cloneNode(true);
      star.appendChild(clone);
    }
  }

  function ratingResetSvg(star) {
    const svgs = star.querySelectorAll('svg');
    if (svgs.length > 1) {
      for (let i = svgs.length - 1; i > 0; i--) { svgs[i].remove(); }
    }
  }

  function ratingMax(rating) {
    return rating.querySelectorAll('.sui-rating-star').length;
  }

  // data-value if present, otherwise count .active stars (+0.5 for a .half star)
  function ratingCurrent(rating) {
    const dv = parseFloat(rating.getAttribute('data-value'));
    if (!isNaN(dv)) return dv;
    let v = 0;
    rating.querySelectorAll('.sui-rating-star').forEach(function(s) {
      if (s.classList.contains('active')) v += 1;
      else if (s.classList.contains('half')) v += 0.5;
    });
    return v;
  }

  function ratingSyncAria(rating, v) {
    if (rating.getAttribute('role') !== 'slider') return;
    rating.setAttribute('aria-valuenow', v);
    rating.setAttribute('aria-valuetext', v + ' of ' + ratingMax(rating) + ' stars');
  }

  // Interactive ratings become a slider; read-only ratings an image with a label
  function ratingPrime(rating) {
    if (rating.dataset.suiKbd) return;
    rating.dataset.suiKbd = '1';
    const max = ratingMax(rating);
    const v = ratingCurrent(rating);
    const labelled = rating.hasAttribute('aria-label') || rating.hasAttribute('aria-labelledby');
    rating.querySelectorAll('.sui-rating-star').forEach(function(s) {
      if (!s.hasAttribute('aria-hidden')) s.setAttribute('aria-hidden', 'true');
    });
    if (rating.classList.contains('sui-rating-readonly')) {
      if (!rating.hasAttribute('role')) rating.setAttribute('role', 'img');
      if (!labelled) rating.setAttribute('aria-label', 'Rated ' + v + ' of ' + max);
      return;
    }
    if (!rating.hasAttribute('role')) rating.setAttribute('role', 'slider');
    if (!rating.hasAttribute('tabindex')) rating.setAttribute('tabindex', '0');
    if (!labelled) rating.setAttribute('aria-label', 'Rating');
    if (!rating.hasAttribute('aria-valuemin')) rating.setAttribute('aria-valuemin', '0');
    if (!rating.hasAttribute('aria-valuemax')) rating.setAttribute('aria-valuemax', max);
    ratingSyncAria(rating, v);
  }

  // Shared by click and keyboard: v is a whole or .5 value
  function setRating(rating, v) {
    const stars = Array.from(rating.querySelectorAll('.sui-rating-star'));
    const full = Math.floor(v);
    const half = v - full >= 0.5;
    stars.forEach(function(s, i) {
      s.classList.remove('active', 'half', 'hover', 'hover-half');
      ratingResetSvg(s);
      if (i < full) {
        s.classList.add('active');
      } else if (i === full && half) {
        ratingEnsureDualSvg(s);
        s.classList.add('half');
      }
    });
    rating.setAttribute('data-value', v);
    ratingSyncAria(rating, v);
    emit(rating, 'sui-rating-change', { value: v });
  }

  document.addEventListener('click', function(e) {
    const star = e.target.closest('.sui-rating:not(.sui-rating-readonly) .sui-rating-star');
    if (!star) return;
    const rating = star.closest('.sui-rating');
    const stars = Array.from(rating.querySelectorAll('.sui-rating-star'));
    const index = stars.indexOf(star);
    const allowHalf = rating.classList.contains('sui-rating-half');
    const isHalf = allowHalf && ratingIsHalf(star, e);
    setRating(rating, isHalf ? index + 0.5 : index + 1);
  });

  // Keyboard: arrows step (0.5 with .sui-rating-half), Home/End, digit keys
  document.addEventListener('keydown', function(e) {
    if (!e.target.closest || e.altKey || e.ctrlKey || e.metaKey) return;
    const rating = e.target.closest('.sui-rating:not(.sui-rating-readonly)');
    if (!rating || e.target !== rating) return;
    const max = ratingMax(rating);
    const step = rating.classList.contains('sui-rating-half') ? 0.5 : 1;
    const rtl = getComputedStyle(rating).direction === 'rtl';
    const cur = ratingCurrent(rating);
    let v = null;
    if (e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) v = cur + step;
    else if (e.key === 'ArrowDown' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) v = cur - step;
    else if (e.key === 'Home') v = 0;
    else if (e.key === 'End') v = max;
    else if (/^[0-9]$/.test(e.key) && parseInt(e.key, 10) <= max) v = parseInt(e.key, 10);
    if (v === null) return;
    e.preventDefault();
    v = Math.max(0, Math.min(max, v));
    if (v !== cur) setRating(rating, v);
  });

  document.addEventListener('mousemove', function(e) {
    const star = e.target.closest('.sui-rating:not(.sui-rating-readonly) .sui-rating-star');
    if (!star) return;
    const rating = star.closest('.sui-rating');
    const stars = Array.from(rating.querySelectorAll('.sui-rating-star'));
    const index = stars.indexOf(star);
    const allowHalf = rating.classList.contains('sui-rating-half');
    const isHalf = allowHalf && ratingIsHalf(star, e);
    stars.forEach(function(s, i) {
      s.classList.remove('hover', 'hover-half');
      ratingResetSvg(s);
      if (i < index) {
        s.classList.add('hover');
      } else if (i === index) {
        if (isHalf) {
          ratingEnsureDualSvg(s);
          s.classList.add('hover-half');
        } else {
          s.classList.add('hover');
        }
      }
    });
  });

  document.addEventListener('mouseout', function(e) {
    const star = e.target.closest('.sui-rating:not(.sui-rating-readonly) .sui-rating-star');
    if (!star) return;
    const rating = star.closest('.sui-rating');
    const stars = Array.from(rating.querySelectorAll('.sui-rating-star'));
    stars.forEach(function(s) {
      s.classList.remove('hover', 'hover-half');
      if (!s.classList.contains('half')) { ratingResetSvg(s); }
    });
  });

  // =========================================
  // Color Picker
  // =========================================
  // Swatch pickers are a radiogroup with a roving tabindex
  function swatchPrime(picker) {
    if (picker.dataset.suiKbd) return;
    picker.dataset.suiKbd = '1';
    if (!picker.hasAttribute('role')) picker.setAttribute('role', 'radiogroup');
    if (!picker.hasAttribute('aria-label') && !picker.hasAttribute('aria-labelledby')) picker.setAttribute('aria-label', 'Color');
    const list = Array.from(picker.querySelectorAll('.sui-color-swatch'));
    const current = list.find(function(s) { return s.classList.contains('active'); }) || list[0];
    list.forEach(function(s) {
      if (!s.hasAttribute('role')) s.setAttribute('role', 'radio');
      s.setAttribute('aria-checked', s.classList.contains('active') ? 'true' : 'false');
      if (!s.hasAttribute('aria-label') && !s.hasAttribute('aria-labelledby') && !s.hasAttribute('title')) {
        const item = s.closest('.sui-color-item');
        const text = item && item.querySelector('.sui-color-label');
        const c = (text && text.textContent.trim()) || s.getAttribute('data-color');
        if (c) s.setAttribute('aria-label', c);
      }
      if (!s.hasAttribute('tabindex')) s.setAttribute('tabindex', s === current ? '0' : '-1');
    });
  }

  function selectSwatch(swatch) {
    const picker = swatch.closest('.sui-color-picker');
    const primed = !!picker.dataset.suiKbd;
    picker.querySelectorAll('.sui-color-swatch').forEach(function(s) {
      s.classList.remove('active');
      if (primed) { s.setAttribute('aria-checked', 'false'); s.setAttribute('tabindex', '-1'); }
    });
    swatch.classList.add('active');
    if (primed) { swatch.setAttribute('aria-checked', 'true'); swatch.setAttribute('tabindex', '0'); }
    const color = swatch.getAttribute('data-color') || swatch.style.background || swatch.style.backgroundColor;
    picker.setAttribute('data-value', color);
    emit(picker, 'sui-color-change', { color: color });
  }

  document.addEventListener('click', function(e) {
    const swatch = e.target.closest('.sui-color-picker .sui-color-swatch');
    if (!swatch) return;
    selectSwatch(swatch);
  });

  // Keyboard: arrows move focus and select (wrapping), Home/End, Space/Enter
  document.addEventListener('keydown', function(e) {
    if (!e.target.closest || e.altKey || e.ctrlKey || e.metaKey) return;
    const swatch = e.target.closest('.sui-color-picker .sui-color-swatch');
    if (!swatch || e.target !== swatch) return;
    const picker = swatch.closest('.sui-color-picker');
    const list = Array.from(picker.querySelectorAll('.sui-color-swatch'));
    const i = list.indexOf(swatch);
    const rtl = getComputedStyle(picker).direction === 'rtl';
    let next = null;
    if (e.key === 'ArrowDown' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) next = list[(i + 1) % list.length];
    else if (e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) next = list[(i - 1 + list.length) % list.length];
    else if (e.key === 'Home') next = list[0];
    else if (e.key === 'End') next = list[list.length - 1];
    else if (e.key === ' ' || e.key === 'Enter') next = swatch;
    if (!next) return;
    e.preventDefault();
    selectSwatch(next);
    next.focus();
  });

  // =========================================
  // Color Spectrum Picker
  // =========================================
  function initSpectrumPickers(root) {
    each(root, '.sui-color-spectrum', 'spectrum', initSpectrum);
  }

  function initSpectrum(picker) {
    const canvasWrap = picker.querySelector('.sui-color-spectrum-canvas');
    if (!canvasWrap) return;
    const canvas = canvasWrap.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cursor = canvasWrap.querySelector('.sui-color-spectrum-cursor');
    const hueBar = picker.querySelector('.sui-color-spectrum-hue');
    const hueCursor = picker.querySelector('.sui-color-spectrum-hue-cursor');
    const preview = picker.querySelector('.sui-color-spectrum-preview');
    const hexInput = picker.querySelector('.sui-color-spectrum-hex input');
    const rInput = picker.querySelector('input[data-channel="r"]');
    const gInput = picker.querySelector('input[data-channel="g"]');
    const bInput = picker.querySelector('input[data-channel="b"]');

    let hue = 0, sat = 1, val = 1;

    function resizeCanvas() {
      canvas.width = canvasWrap.offsetWidth;
      canvas.height = canvasWrap.offsetHeight;
      drawSatVal();
    }

    function hsvToRgb(h, s, v) {
      const i = Math.floor(h / 60) % 6;
      const f = h / 60 - Math.floor(h / 60);
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);
      let r, g, b;
      switch (i) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    function rgbToHex(r, g, b) {
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function hexToRgb(hex) {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      const n = parseInt(hex, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function rgbToHsv(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h;
      const v = max;
      const d = max - min;
      const s = max === 0 ? 0 : d / max;
      if (max === min) { h = 0; }
      else {
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
      }
      return [h, s, v];
    }

    function drawSatVal() {
      const w = canvas.width, h = canvas.height;
      const hueRgb = hsvToRgb(hue, 1, 1);
      const hueColor = 'rgb(' + hueRgb[0] + ',' + hueRgb[1] + ',' + hueRgb[2] + ')';
      ctx.fillStyle = hueColor;
      ctx.fillRect(0, 0, w, h);
      const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
      whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
      whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = whiteGrad;
      ctx.fillRect(0, 0, w, h);
      const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
      blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
      blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = blackGrad;
      ctx.fillRect(0, 0, w, h);
    }

    function updateUI() {
      const rgb = hsvToRgb(hue, sat, val);
      const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
      if (preview) preview.style.background = hex;
      if (hexInput) hexInput.value = hex.toUpperCase().slice(1);
      if (rInput) rInput.value = rgb[0];
      if (gInput) gInput.value = rgb[1];
      if (bInput) bInput.value = rgb[2];

      cursor.style.left = (sat * 100) + '%';
      cursor.style.top = ((1 - val) * 100) + '%';

      const hueRgb = hsvToRgb(hue, 1, 1);
      hueCursor.style.left = (hue / 360 * 100) + '%';
      hueCursor.style.background = 'rgb(' + hueRgb[0] + ',' + hueRgb[1] + ',' + hueRgb[2] + ')';

      picker.setAttribute('data-value', hex);
      emit(picker, 'sui-color-change', { hex: hex, rgb: rgb });
    }

    // Canvas drag
    function onCanvasMove(e) {
      const rect = canvasWrap.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      sat = Math.max(0, Math.min(1, x / rect.width));
      val = Math.max(0, Math.min(1, 1 - y / rect.height));
      updateUI();
    }

    canvasWrap.addEventListener('mousedown', function(e) {
      e.preventDefault();
      onCanvasMove(e);
      function move(ev) { onCanvasMove(ev); }
      function up() { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });

    canvasWrap.addEventListener('touchstart', function(e) {
      e.preventDefault();
      onCanvasMove(e);
      function move(ev) { ev.preventDefault(); onCanvasMove(ev); }
      function up() { document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); }
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('touchend', up);
    }, { passive: false });

    // Hue drag
    function onHueMove(e) {
      const rect = hueBar.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      hue = Math.max(0, Math.min(360, x / rect.width * 360));
      drawSatVal();
      updateUI();
    }

    hueBar.addEventListener('mousedown', function(e) {
      e.preventDefault();
      onHueMove(e);
      function move(ev) { onHueMove(ev); }
      function up() { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });

    hueBar.addEventListener('touchstart', function(e) {
      e.preventDefault();
      onHueMove(e);
      function move(ev) { ev.preventDefault(); onHueMove(ev); }
      function up() { document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); }
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('touchend', up);
    }, { passive: false });

    // Hex input
    if (hexInput) {
      hexInput.addEventListener('input', function() {
        const v = hexInput.value.replace('#', '');
        if (v.length === 6 && /^[0-9A-Fa-f]{6}$/.test(v)) {
          const rgb = hexToRgb(v);
          const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
          hue = hsv[0]; sat = hsv[1]; val = hsv[2];
          drawSatVal();
          updateUI();
        }
      });
    }

    // RGB inputs
    function onRgbInput() {
      let r = parseInt(rInput.value) || 0;
      let g = parseInt(gInput.value) || 0;
      let b = parseInt(bInput.value) || 0;
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));
      const hsv = rgbToHsv(r, g, b);
      hue = hsv[0]; sat = hsv[1]; val = hsv[2];
      drawSatVal();
      updateUI();
    }

    if (rInput) rInput.addEventListener('input', onRgbInput);
    if (gInput) gInput.addEventListener('input', onRgbInput);
    if (bInput) bInput.addEventListener('input', onRgbInput);

    // Init from data-color attribute or default
    const initColor = picker.getAttribute('data-color') || '#5B54E0';
    const initRgb = hexToRgb(initColor);
    const initHsv = rgbToHsv(initRgb[0], initRgb[1], initRgb[2]);
    hue = initHsv[0]; sat = initHsv[1]; val = initHsv[2];

    resizeCanvas();
    updateUI();
    window.addEventListener('resize', resizeCanvas);
  }

  // =========================================
  // File Upload
  // =========================================
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  const fileIcons = {
    file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    pdf: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="18" x2="13" y2="18"/><line x1="9" y1="12" x2="11" y2="12"/></svg>',
    video: '<svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    audio: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    code: '<svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    archive: '<svg viewBox="0 0 24 24"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>',
    spreadsheet: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="12" y1="9" x2="12" y2="21"/></svg>'
  };

  function getFileType(file) {
    const type = file.type || '';
    const ext = file.name.split('.').pop().toLowerCase();
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (/^(js|ts|jsx|tsx|html|css|json|xml|py|rb|go|rs|java|c|cpp|php|sh|yml|yaml)$/.test(ext)) return 'code';
    if (/^(zip|rar|7z|tar|gz|bz2)$/.test(ext)) return 'archive';
    if (/^(csv|xlsx|xls|ods)$/.test(ext)) return 'spreadsheet';
    return 'file';
  }

  function getFileIcon(file) {
    return fileIcons[getFileType(file)];
  }

  function getFileIconClass(file) {
    return 'sui-file-item-icon-' + getFileType(file);
  }

  function getOrCreateContainer(zone, cls) {
    let wrap = zone.closest('.sui-file-upload-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'sui-file-upload-wrap';
      zone.parentNode.insertBefore(wrap, zone);
      wrap.appendChild(zone);
    }
    let container = wrap.querySelector('.' + cls);
    if (!container) {
      container = document.createElement('div');
      container.className = cls;
      wrap.appendChild(container);
    }
    return container;
  }

  // File names are user-controlled: set as text, never as HTML
  function setFileName(item, f) {
    item.querySelector('.sui-file-item-name').textContent = f.name;
    item.querySelector('.sui-file-item-remove').setAttribute('aria-label', 'Remove ' + f.name);
  }

  function renderFileList(zone, files, append) {
    const container = getOrCreateContainer(zone, 'sui-file-list');
    if (!append) container.innerHTML = '';
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const item = document.createElement('div');
      item.className = 'sui-file-item';
      item.innerHTML =
        '<div class="sui-file-item-icon ' + getFileIconClass(f) + '">' + getFileIcon(f) + '</div>' +
        '<div class="sui-file-item-info">' +
          '<div class="sui-file-item-name"></div>' +
          '<div class="sui-file-item-size">' + formatFileSize(f.size) + '</div>' +
        '</div>' +
        '<button class="sui-file-item-remove" aria-label="Remove">&times;</button>';
      setFileName(item, f);
      container.appendChild(item);
    }
  }

  function renderFileProgress(zone, files, append) {
    const container = getOrCreateContainer(zone, 'sui-file-list');
    if (!append) container.innerHTML = '';
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const item = document.createElement('div');
      item.className = 'sui-file-item';
      item.innerHTML =
        '<div class="sui-file-item-icon ' + getFileIconClass(f) + '">' + getFileIcon(f) + '</div>' +
        '<div class="sui-file-item-info sui-file-item-progress">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<div class="sui-file-item-name"></div>' +
            '<span class="sui-file-item-status sui-file-item-status-uploading">0%</span>' +
          '</div>' +
          '<div class="sui-progress sui-progress-sm"><div class="sui-progress-bar sui-progress-primary" style="width:0%;"></div></div>' +
        '</div>' +
        '<button class="sui-file-item-remove" aria-label="Remove">&times;</button>';
      setFileName(item, f);
      container.appendChild(item);
      simulateProgress(item);
    }
  }

  function simulateProgress(item) {
    const bar = item.querySelector('.sui-progress-bar');
    const status = item.querySelector('.sui-file-item-status');
    let pct = 0;
    const interval = setInterval(function() {
      pct += Math.floor(Math.random() * 15) + 5;
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        bar.style.width = '100%';
        bar.className = 'sui-progress-bar sui-progress-success';
        status.className = 'sui-file-item-status sui-file-item-status-complete';
        status.textContent = '\u2713';
      } else {
        bar.style.width = pct + '%';
        status.textContent = pct + '%';
      }
    }, 300 + Math.random() * 200);
  }

  function renderFilePreview(zone, files, append) {
    const container = getOrCreateContainer(zone, 'sui-file-preview-grid');
    if (!append) container.innerHTML = '';
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type || !f.type.startsWith('image/')) continue;
      const item = document.createElement('div');
      item.className = 'sui-file-preview-item';
      item.innerHTML =
        '<img alt="">' +
        '<button class="sui-file-preview-item-remove" aria-label="Remove">&times;</button>';
      item.querySelector('img').alt = f.name;
      item.querySelector('.sui-file-preview-item-remove').setAttribute('aria-label', 'Remove ' + f.name);
      container.appendChild(item);
      (function(img, file) {
        const reader = new FileReader();
        reader.onload = function(e) { img.src = e.target.result; };
        reader.readAsDataURL(file);
      })(item.querySelector('img'), f);
    }
  }

  // Delegated change on file inputs
  document.addEventListener('change', function(e) {
    if (!e.target.matches('.sui-file-upload input[type="file"]')) return;
    const input = e.target;
    const zone = input.closest('.sui-file-upload');
    if (!zone) return;
    const files = Array.from(input.files);
    if (!files.length) return;
    const mode = zone.getAttribute('data-sui-upload') || 'list';
    if (mode === 'preview') {
      renderFilePreview(zone, files);
    } else if (mode === 'progress') {
      renderFileProgress(zone, files);
    } else {
      renderFileList(zone, files);
    }
    input.value = '';
  });

  // Delegated remove clicks
  document.addEventListener('click', function(e) {
    const removeBtn = e.target.closest('.sui-file-item-remove, .sui-file-preview-item-remove');
    if (!removeBtn) return;
    const item = removeBtn.closest('.sui-file-item, .sui-file-preview-item');
    if (item) item.remove();
  });

  // Dragover styling
  document.addEventListener('dragover', function(e) {
    const zone = e.target.closest('.sui-file-upload');
    if (!zone) return;
    e.preventDefault();
    zone.classList.add('sui-file-upload-dragover');
  });

  document.addEventListener('dragleave', function(e) {
    const zone = e.target.closest('.sui-file-upload');
    if (!zone) return;
    zone.classList.remove('sui-file-upload-dragover');
  });

  document.addEventListener('drop', function(e) {
    const zone = e.target.closest('.sui-file-upload');
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove('sui-file-upload-dragover');
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const mode = zone.getAttribute('data-sui-upload') || 'list';
    if (mode === 'preview') {
      renderFilePreview(zone, files, true);
    } else if (mode === 'progress') {
      renderFileProgress(zone, files, true);
    } else {
      renderFileList(zone, files, true);
    }
  });

  // =========================================
  // Radial Progress
  // =========================================
  function initRadialProgress(root) {
    each(root, '.sui-radial[data-value]', 'radial', function(el) {
      const fill = el.querySelector('.sui-radial-fill');
      if (!fill) return;
      let value = parseFloat(el.getAttribute('data-value')) || 0;
      value = Math.max(0, Math.min(100, value));
      let circumference = parseFloat(fill.getAttribute('stroke-dasharray') || fill.style.strokeDasharray);
      if (!circumference) {
        const r = fill.getAttribute('r');
        circumference = 2 * Math.PI * parseFloat(r);
      }
      fill.style.strokeDasharray = circumference;
      fill.style.strokeDashoffset = circumference;
      const valueEl = el.querySelector('.sui-radial-value');
      const duration = el.classList.contains('sui-radial-animated') ? 1200 : 600;

      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          const offset = circumference - (value / 100) * circumference;
          fill.style.strokeDashoffset = offset;

          if (valueEl && prefersReducedMotion()) {
            valueEl.textContent = Math.round(value) + '%';
          } else if (valueEl) {
            const start = performance.now();
            function tick(now) {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const current = Math.round(progress * value);
              valueEl.textContent = current + '%';
              if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
          }
        });
      });
    });
  }

  // =========================================
  // Number Input
  // =========================================
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.sui-number-input-btn');
    if (!btn) return;
    const wrap = btn.closest('.sui-number-input');
    const input = wrap.querySelector('input[type="number"]');
    if (!input) return;
    const step = parseFloat(input.step) || 1;
    const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
    const max = input.max !== '' ? parseFloat(input.max) : Infinity;
    let val = parseFloat(input.value) || 0;
    if (btn.getAttribute('data-action') === 'decrement') {
      val = Math.max(min, val - step);
    } else {
      val = Math.min(max, val + step);
    }
    input.value = val;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // =========================================
  // Password Toggle
  // =========================================
  // Bubble-phase, no stopPropagation, so consumer click listeners still fire.
  // The Swap handler skips .sui-password-toggle so .active is only toggled here.
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.sui-password-toggle');
    if (!btn) return;
    const wrap = btn.closest('.sui-password-input');
    const input = wrap && wrap.querySelector('input');
    if (!input) return;
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    btn.classList.toggle('active', reveal);
    btn.setAttribute('aria-pressed', reveal ? 'true' : 'false');
    if (btn.classList.contains('sui-swap')) {
      emit(btn, 'sui-swap-change', { active: reveal });
    }
  });

  // =========================================
  // Tags Input
  // =========================================
  document.addEventListener('keydown', function(e) {
    const input = e.target.closest('.sui-tags-input-field');
    if (!input) return;
    const wrap = input.closest('.sui-tags-input');
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.value.trim().replace(/,$/, '');
      if (!val) return;
      const tag = document.createElement('span');
      tag.className = 'sui-chip';
      tag.textContent = val;
      const closeBtn = document.createElement('button');
      closeBtn.className = 'sui-chip-close';
      closeBtn.setAttribute('aria-label', 'Remove');
      tag.appendChild(closeBtn);
      wrap.insertBefore(tag, input);
      input.value = '';
    } else if (e.key === 'Backspace' && !input.value) {
      const tags = wrap.querySelectorAll('.sui-chip');
      if (tags.length) tags[tags.length - 1].remove();
    }
  });

  document.addEventListener('click', function(e) {
    const dismiss = e.target.closest('.sui-tags-input .sui-chip-close');
    if (dismiss) {
      dismiss.closest('.sui-chip').remove();
      return;
    }
    const wrap = e.target.closest('.sui-tags-input');
    if (wrap) {
      const input = wrap.querySelector('.sui-tags-input-field');
      if (input) input.focus();
    }
  });

  // =========================================
  // Swap
  // =========================================
  // Lock slide swap dimensions so absolute children don't collapse container
  function initSlideSwaps(root) {
    each(root, '.sui-swap-slide, .sui-swap-slide-x', 'slide-swap', function(swap) {
      if (swap.dataset.suiSlideInit) return;
      const children = swap.querySelectorAll('.sui-swap-on, .sui-swap-off, .sui-swap-state');
      let maxW = 0, maxH = 0;
      children.forEach(function(c) {
        const prev = c.style.cssText;
        c.style.position = 'relative';
        c.style.opacity = '1';
        c.style.transform = 'none';
        maxW = Math.max(maxW, c.offsetWidth);
        maxH = Math.max(maxH, c.offsetHeight);
        c.style.cssText = prev;
      });
      if (maxW) swap.style.width = maxW + 'px';
      if (maxH) swap.style.height = maxH + 'px';
      swap.dataset.suiSlideInit = '1';
    });
  }

  document.addEventListener('click', function(e) {
    const swap = e.target.closest('.sui-swap');
    if (!swap || swap.matches('.sui-password-input .sui-password-toggle')) return;
    if (swap.hasAttribute('data-sui-theme-toggle')) return; // owned by the theme switcher
    if (swap.classList.contains('sui-swap-cycle')) {
      const states = Array.from(swap.querySelectorAll('.sui-swap-state'));
      const current = states.findIndex(function(s) { return s.classList.contains('active'); });
      const next = (current + 1) % states.length;
      states.forEach(function(s) { s.classList.remove('active'); });
      states[next].classList.add('active');
      swap.setAttribute('data-state', next);
      emit(swap, 'sui-swap-change', { state: next, total: states.length });
    } else {
      swap.classList.toggle('active');
      emit(swap, 'sui-swap-change', { active: swap.classList.contains('active') });
    }
  });

  // =========================================
  // Dock — magnification effect
  // =========================================
  const dockMaxScale = 1.5;
  const dockRange = 3;

  document.addEventListener('mousemove', function(e) {
    const dock = e.target.closest('.sui-dock');
    if (!dock) return;
    if (dock.classList.contains('sui-dock-no-scale')) return;
    const iconOnly = dock.classList.contains('sui-dock-icon-scale');
    const items = Array.from(dock.querySelectorAll('.sui-dock-item'));
    const isVertical = dock.classList.contains('sui-dock-vertical');

    items.forEach(function(item) {
      const rect = item.getBoundingClientRect();
      const center = isVertical
        ? rect.top + rect.height / 2
        : rect.left + rect.width / 2;
      const mouse = isVertical ? e.clientY : e.clientX;
      const baseSize = dock.classList.contains('sui-dock-sm') ? 32
        : dock.classList.contains('sui-dock-lg') ? 52 : 40;
      const dist = Math.abs(mouse - center) / baseSize;

      if (dist < dockRange) {
        const scale = dockMaxScale - (dist / dockRange) * (dockMaxScale - 1);
        if (iconOnly) {
          item.style.width = '';
          item.style.height = '';
          const svg = item.querySelector('svg');
          if (svg) svg.style.transform = 'scale(' + scale + ')';
        } else {
          const newSize = Math.round(baseSize * scale);
          item.style.width = newSize + 'px';
          item.style.height = newSize + 'px';
        }
      } else {
        item.style.width = '';
        item.style.height = '';
        if (iconOnly) {
          const svg = item.querySelector('svg');
          if (svg) svg.style.transform = '';
        }
      }
    });
  });

  document.addEventListener('mouseleave', function(e) {
    if (!e.target.classList || !e.target.classList.contains('sui-dock')) return;
    const iconOnly = e.target.classList.contains('sui-dock-icon-scale');
    const items = e.target.querySelectorAll('.sui-dock-item');
    items.forEach(function(item) {
      item.style.width = '';
      item.style.height = '';
      if (iconOnly) {
        const svg = item.querySelector('svg');
        if (svg) svg.style.transform = '';
      }
    });
  }, true);

  // =========================================
  // Image Lightbox
  // =========================================
  let lightboxOverlay = null;
  let lightboxImages = [];
  let lightboxIndex = 0;

  function createLightbox() {
    if (lightboxOverlay) return;
    lightboxOverlay = document.createElement('div');
    lightboxOverlay.className = 'sui-lightbox-overlay';
    lightboxOverlay.setAttribute('role', 'dialog');
    lightboxOverlay.setAttribute('aria-modal', 'true');
    lightboxOverlay.setAttribute('aria-label', 'Image viewer');
    lightboxOverlay.innerHTML =
      '<button class="sui-lightbox-close" aria-label="Close">&times;</button>' +
      '<span class="sui-lightbox-counter"></span>' +
      '<button class="sui-lightbox-prev" aria-label="Previous"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>' +
      '<button class="sui-lightbox-next" aria-label="Next"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>' +
      '<img src="" alt="">' +
      '<div class="sui-lightbox-caption"></div>';
    document.body.appendChild(lightboxOverlay);

    lightboxOverlay.querySelector('.sui-lightbox-close').addEventListener('click', closeLightbox);
    lightboxOverlay.querySelector('.sui-lightbox-prev').addEventListener('click', function() { showLightboxImage(lightboxIndex - 1); });
    lightboxOverlay.querySelector('.sui-lightbox-next').addEventListener('click', function() { showLightboxImage(lightboxIndex + 1); });
    lightboxOverlay.addEventListener('click', function(e) {
      if (e.target === lightboxOverlay) closeLightbox();
      if (e.target.tagName === 'IMG') {
        lightboxOverlay.classList.toggle('zoomed');
      }
    });
    document.addEventListener('keydown', function(e) {
      if (!lightboxOverlay || !lightboxOverlay.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
      if (e.key === 'ArrowLeft') showLightboxImage(lightboxIndex - 1);
      if (e.key === 'ArrowRight') showLightboxImage(lightboxIndex + 1);
    });
    // Keep Tab inside the open viewer (prev/next may be display:none)
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' || !lightboxOverlay || !lightboxOverlay.classList.contains('open')) return;
      const focusable = getFocusable(lightboxOverlay).filter(function(f) { return f.offsetParent !== null; });
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const inside = lightboxOverlay.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  let lightboxLastFocus = null;

  function openLightbox(images, index) {
    createLightbox();
    if (!lightboxOverlay.classList.contains('open')) lightboxLastFocus = document.activeElement;
    lightboxImages = images;
    lightboxIndex = index || 0;
    showLightboxImage(lightboxIndex);
    lightboxOverlay.classList.add('open');
    lightboxOverlay.classList.remove('zoomed');
    document.body.style.overflow = 'hidden';
    const hasMultiple = images.length > 1;
    lightboxOverlay.querySelector('.sui-lightbox-prev').style.display = hasMultiple ? '' : 'none';
    lightboxOverlay.querySelector('.sui-lightbox-next').style.display = hasMultiple ? '' : 'none';
    lightboxOverlay.querySelector('.sui-lightbox-counter').style.display = hasMultiple ? '' : 'none';
    lightboxOverlay.querySelector('.sui-lightbox-close').focus();
  }

  function closeLightbox() {
    if (lightboxOverlay) {
      const wasOpen = lightboxOverlay.classList.contains('open');
      lightboxOverlay.classList.remove('open', 'zoomed');
      document.body.style.overflow = '';
      if (wasOpen && lightboxLastFocus && lightboxLastFocus.isConnected && lightboxLastFocus.focus) {
        lightboxLastFocus.focus();
      }
      lightboxLastFocus = null;
    }
  }

  function showLightboxImage(idx) {
    if (lightboxImages.length === 0) return;
    lightboxIndex = (idx + lightboxImages.length) % lightboxImages.length;
    const item = lightboxImages[lightboxIndex];
    const img = lightboxOverlay.querySelector('img');
    const caption = lightboxOverlay.querySelector('.sui-lightbox-caption');
    const counter = lightboxOverlay.querySelector('.sui-lightbox-counter');
    img.src = item.src;
    img.alt = item.alt || '';
    caption.textContent = item.caption || '';
    caption.style.display = item.caption ? '' : 'none';
    counter.textContent = (lightboxIndex + 1) + ' / ' + lightboxImages.length;
    lightboxOverlay.classList.remove('zoomed');
  }

  // Vertical gallery — click side thumb to update main
  document.addEventListener('click', function(e) {
    const thumb = e.target.closest('.sui-lightbox-vertical-strip .sui-lightbox-thumb');
    if (!thumb) return;
    const gallery = thumb.closest('.sui-lightbox-vertical');
    const main = gallery.querySelector('.sui-lightbox-vertical-main img');
    const img = thumb.querySelector('img');
    if (main && img) {
      main.src = thumb.getAttribute('data-src') || img.src;
      main.alt = thumb.getAttribute('data-alt') || img.alt;
    }
    gallery.querySelectorAll('.sui-lightbox-vertical-strip .sui-lightbox-thumb').forEach(function(t) {
      t.classList.remove('active');
      if (t.dataset.suiKbd) t.setAttribute('aria-pressed', 'false');
    });
    thumb.classList.add('active');
    if (thumb.dataset.suiKbd) thumb.setAttribute('aria-pressed', 'true');
  });

  // Click main image in vertical gallery to open lightbox
  document.addEventListener('click', function(e) {
    const main = e.target.closest('.sui-lightbox-vertical-main');
    if (!main) return;
    const gallery = main.closest('.sui-lightbox-vertical');
    const thumbs = Array.from(gallery.querySelectorAll('.sui-lightbox-vertical-strip .sui-lightbox-thumb'));
    const images = thumbs.map(function(t) {
      const img = t.querySelector('img');
      return {
        src: t.getAttribute('data-src') || (img ? img.src : ''),
        alt: t.getAttribute('data-alt') || (img ? img.alt : ''),
        caption: t.getAttribute('data-caption') || ''
      };
    });
    const activeIdx = thumbs.findIndex(function(t) { return t.classList.contains('active'); });
    openLightbox(images, activeIdx >= 0 ? activeIdx : 0);
  });

  // Click on thumbnail
  document.addEventListener('click', function(e) {
    const thumb = e.target.closest('.sui-lightbox-thumb');
    if (!thumb) return;
    // Skip if inside vertical strip (handled above)
    if (thumb.closest('.sui-lightbox-vertical-strip')) return;
    const grid = thumb.closest('.sui-lightbox-grid');
    const thumbs = grid ? Array.from(grid.querySelectorAll('.sui-lightbox-thumb')) : [thumb];
    const images = thumbs.map(function(t) {
      const img = t.querySelector('img');
      return {
        src: t.getAttribute('data-src') || (img ? img.src : ''),
        alt: t.getAttribute('data-alt') || (img ? img.alt : ''),
        caption: t.getAttribute('data-caption') || ''
      };
    });
    const index = thumbs.indexOf(thumb);
    openLightbox(images, index);
  });

  // Thumbnails and the vertical main image act as buttons
  function lightboxPrime(root) {
    root.querySelectorAll('.sui-lightbox-thumb, .sui-lightbox-vertical-main').forEach(function(el) {
      if (el.dataset.suiKbd) return;
      el.dataset.suiKbd = '1';
      const inStrip = !!el.closest('.sui-lightbox-vertical-strip');
      const isMain = el.classList.contains('sui-lightbox-vertical-main');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
        const img = el.querySelector('img');
        const alt = el.getAttribute('data-alt') || (img ? img.alt : '');
        let label;
        if (isMain) label = 'Open image in lightbox';
        else label = (inStrip ? 'Show image' : 'Open image') + (alt ? ': ' + alt : '');
        el.setAttribute('aria-label', label);
      }
      if (inStrip) el.setAttribute('aria-pressed', el.classList.contains('active') ? 'true' : 'false');
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!e.target.closest) return;
    const el = e.target.closest('.sui-lightbox-thumb, .sui-lightbox-vertical-main');
    if (!el || e.target !== el || el.matches('button, a[href]')) return; // native controls already click
    e.preventDefault();
    el.click();
  });

  // =========================================
  // Typewriter
  // =========================================
  function initTypewriters(root) {
    each(root, '[data-sui-typewriter]', 'typewriter', function(el) {
      if (el.dataset.suiTypewriterInit) return;
      el.dataset.suiTypewriterInit = '1';
      const words = el.getAttribute('data-words');
      const speed = parseInt(el.getAttribute('data-speed')) || 80;
      const deleteSpeed = parseInt(el.getAttribute('data-delete-speed')) || 40;
      const pause = parseInt(el.getAttribute('data-pause')) || 1500;
      const loop = el.hasAttribute('data-loop');

      // Server-rendered text is kept (and typed over in words mode)
      const initial = el.textContent.trim();
      let phrases = null;
      if (words) {
        phrases = words.split('|').map(function(s) { return s.trim(); }).filter(Boolean);
        if (!phrases.length) phrases = null;
      }

      // Screen readers get the full text once; the animated span is hidden
      const sr = document.createElement('span');
      sr.className = 'sui-sr-only';
      sr.textContent = el.getAttribute('data-sr-text') || (phrases ? phrases.join(', ') : initial);
      const out = document.createElement('span');
      out.className = 'sui-typewriter-text';
      out.setAttribute('aria-hidden', 'true');
      el.textContent = '';
      el.appendChild(sr);
      // data-reserve: invisible sizers hold the width of the longest phrase
      if (el.hasAttribute('data-reserve')) {
        (initial ? [initial] : []).concat(phrases || []).forEach(function(text) {
          const sizer = document.createElement('span');
          sizer.className = 'sui-typewriter-sizer';
          sizer.setAttribute('aria-hidden', 'true');
          sizer.textContent = text;
          el.appendChild(sizer);
        });
      }
      el.appendChild(out);

      if (phrases) {
        // Multiple phrases mode
        let phraseIdx = 0;
        let charIdx = 0;
        let deleting = false;

        if (prefersReducedMotion()) {
          out.textContent = loop ? (initial || phrases[0]) : phrases[phrases.length - 1];
          return;
        }

        function endOfPhrase() {
          if (!loop && phraseIdx === phrases.length - 1) return;
          setTimeout(function() { deleting = true; tick(); }, pause);
        }

        function tick() {
          const current = phrases[phraseIdx];
          if (prefersReducedMotion()) { out.textContent = current; return; }
          if (!deleting) {
            charIdx++;
            out.textContent = current.substring(0, charIdx);
            if (charIdx === current.length) {
              endOfPhrase();
              return;
            }
            setTimeout(tick, speed);
          } else {
            charIdx--;
            out.textContent = current.substring(0, charIdx);
            if (charIdx === 0) {
              deleting = false;
              phraseIdx = (phraseIdx + 1) % phrases.length;
              setTimeout(tick, speed);
              return;
            }
            setTimeout(tick, deleteSpeed);
          }
        }

        if (!initial) {
          setTimeout(tick, 500);
        } else if (initial === phrases[0]) {
          // Already showing the first phrase: continue from its end
          out.textContent = initial;
          charIdx = initial.length;
          endOfPhrase();
        } else {
          // Show the server text, then delete it and start the phrases
          out.textContent = initial;
          let leadIdx = initial.length;
          const deleteLead = function() {
            if (prefersReducedMotion()) { out.textContent = initial; return; }
            leadIdx--;
            out.textContent = initial.substring(0, leadIdx);
            if (leadIdx <= 0) { setTimeout(tick, speed); return; }
            setTimeout(deleteLead, deleteSpeed);
          };
          setTimeout(deleteLead, pause);
        }
      } else {
        // Single text mode — type out existing content
        const text = initial;
        if (prefersReducedMotion()) { out.textContent = text; return; }
        let i = 0;
        function typeChar() {
          if (prefersReducedMotion()) { out.textContent = text; return; }
          if (i < text.length) {
            out.textContent += text[i];
            i++;
            setTimeout(typeChar, speed);
          }
        }
        setTimeout(typeChar, 500);
      }
    });
  }

  // =========================================
  // Text Rotate
  // =========================================
  function initTextRotate(root) {
    each(root, '[data-sui-text-rotate]', 'text-rotate', function(el) {
      if (el.dataset.suiRotateInit) return;
      el.dataset.suiRotateInit = '1';
      const words = el.querySelectorAll('.sui-text-rotate-word');
      if (words.length < 2) return;
      const interval = parseInt(el.getAttribute('data-interval')) || 2000;
      let index = 0;

      // Screen readers hear the list once instead of every word run together
      words.forEach(function(w) { w.setAttribute('aria-hidden', 'true'); });
      const sr = document.createElement('span');
      sr.className = 'sui-sr-only';
      sr.textContent = el.getAttribute('data-sr-text') ||
        Array.prototype.map.call(words, function(w) { return w.textContent.trim(); }).join(', ');
      el.insertBefore(sr, el.firstChild);

      words[0].classList.add('active');

      // Reduced motion: stay on the first word
      if (prefersReducedMotion()) return;

      setInterval(function() {
        if (prefersReducedMotion()) return;
        const current = words[index];
        current.classList.remove('active');
        current.classList.add('exit');
        setTimeout(function() { current.classList.remove('exit'); }, 400);

        index = (index + 1) % words.length;
        words[index].classList.add('active');
      }, interval);
    });
  }

  // =========================================
  // Copy Button
  // =========================================
  const checkSvg = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
  const crossSvg = '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  // execCommand fallback for non-secure contexts / denied Clipboard API.
  // Restores focus so keyboard users keep their place.
  function suiExecCopy(str) {
    const active = document.activeElement;
    const ta = document.createElement('textarea');
    ta.value = str; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    ta.blur();
    document.body.removeChild(ta);
    if (active && active.focus) active.focus();
    return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  }

  function suiCopyText(str) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      let p;
      try { p = navigator.clipboard.writeText(str); } catch (_) { return suiExecCopy(str); }
      return p.catch(function() { return suiExecCopy(str); });
    }
    return suiExecCopy(str);
  }

  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-sui-copy]');
    if (!btn) return;
    let text = btn.getAttribute('data-sui-copy');
    if (!text) {
      const wrap = btn.closest('.sui-copy, .sui-copy-input');
      if (wrap) {
        const textEl = wrap.querySelector('.sui-copy-text');
        const inputEl = wrap.querySelector('.sui-input');
        text = textEl ? textEl.textContent : inputEl ? inputEl.value : '';
      }
    }
    if (!text) return;
    const value = text.trim();
    // Capture the button's own content only when not mid-feedback
    if (btn._suiCopyOrig == null) btn._suiCopyOrig = btn.innerHTML;
    suiCopyText(value).then(function() {
      btn.classList.remove('copy-failed');
      btn.classList.add('copied');
      btn.innerHTML = checkSvg;
      emit(btn, 'sui-copy', { text: value });
    }, function(err) {
      btn.classList.remove('copied');
      btn.classList.add('copy-failed');
      btn.innerHTML = crossSvg; // non-colour failure cue
      emit(btn, 'sui-copy-error', { text: value, error: err });
    }).then(function() {
      // Clear after the async settle (not at click time) so rapid clicks can't race
      clearTimeout(btn._suiCopyTimer);
      btn._suiCopyTimer = setTimeout(function() {
        btn.classList.remove('copied', 'copy-failed');
        if (btn._suiCopyOrig != null) btn.innerHTML = btn._suiCopyOrig;
        btn._suiCopyOrig = null;
      }, 1500);
    });
  });

  // =========================================
  // Diff — Image Compare Slider
  // =========================================
  function initDiffSliders(root) {
    each(root, '.sui-diff[data-sui-diff]', 'diff', function(diff) {
      if (diff.dataset.suiDiffInit) return;
      diff.dataset.suiDiffInit = '1';
      const handle = diff.querySelector('.sui-diff-handle');
      const before = diff.querySelector('.sui-diff-before');
      if (!handle || !before) return;
      const isVertical = diff.classList.contains('sui-diff-vertical');
      let current = parseFloat(isVertical ? handle.style.top : handle.style.left);
      if (isNaN(current)) current = 50;

      // Keyboard-operable slider on the handle
      if (!handle.hasAttribute('role')) handle.setAttribute('role', 'slider');
      if (!handle.hasAttribute('tabindex')) handle.setAttribute('tabindex', '0');
      if (!handle.hasAttribute('aria-label') && !handle.hasAttribute('aria-labelledby')) handle.setAttribute('aria-label', 'Comparison position');
      handle.setAttribute('aria-valuemin', '0');
      handle.setAttribute('aria-valuemax', '100');
      handle.setAttribute('aria-valuenow', Math.round(current));
      handle.setAttribute('aria-orientation', isVertical ? 'vertical' : 'horizontal');

      function setPos(pct) {
        pct = Math.max(0, Math.min(100, pct));
        current = pct;
        if (isVertical) {
          before.style.clipPath = 'inset(0 0 ' + (100 - pct) + '% 0)';
          handle.style.top = pct + '%';
        } else {
          before.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
          handle.style.left = pct + '%';
        }
        handle.setAttribute('aria-valuenow', Math.round(pct));
        emit(diff, 'sui-diff-change', { value: pct });
      }

      function onMove(e) {
        e.preventDefault();
        const rect = diff.getBoundingClientRect();
        let pos;
        if (isVertical) {
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          pos = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
        } else {
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        }
        setPos(pos * 100);
      }

      // Arrows step 1 (Shift: 10), PageUp/PageDown 10, Home/End 0/100.
      // Position is physical (left/top), so arrows are not mirrored in RTL.
      // Vertical: Up/PageUp move the handle up, Down/PageDown move it down.
      handle.addEventListener('keydown', function(e) {
        const step = e.shiftKey ? 10 : 1;
        let next = null;
        if (isVertical) {
          if (e.key === 'ArrowDown') next = current + step;
          else if (e.key === 'ArrowUp') next = current - step;
        } else {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = current + step;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = current - step;
        }
        const page = isVertical ? -10 : 10;
        if (e.key === 'PageUp') next = current + page;
        else if (e.key === 'PageDown') next = current - page;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = 100;
        if (next === null) return;
        e.preventDefault();
        setPos(next);
      });

      function onDown(e) {
        e.preventDefault();
        onMove(e);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
      }

      diff.addEventListener('mousedown', onDown);
      diff.addEventListener('touchstart', onDown, { passive: false });
    });
  }

  // =========================================
  // Speed Dial
  // =========================================
  function closeSpeedDial(dial, refocus) {
    const trigger = dial.querySelector('.sui-speed-dial-trigger');
    const hadFocus = dial.contains(document.activeElement);
    dial.classList.remove('open');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      // Closed actions become visibility:hidden — don't strand focus on them
      if (refocus && hadFocus) trigger.focus();
    }
  }

  document.addEventListener('click', function(e) {
    const trigger = e.target.closest('.sui-speed-dial-trigger');
    if (trigger) {
      const dial = trigger.closest('.sui-speed-dial');
      dial.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(dial.classList.contains('open')));
      return;
    }
    const action = e.target.closest('.sui-speed-dial-action');
    if (action) {
      closeSpeedDial(action.closest('.sui-speed-dial'), true);
      return;
    }
    // Close all open dials when clicking outside
    document.querySelectorAll('.sui-speed-dial.open').forEach(function(d) {
      closeSpeedDial(d, false);
    });
  });

  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.sui-speed-dial.open').forEach(function(d) {
      e.preventDefault();
      closeSpeedDial(d, true);
    });
  });

  // Hover mode
  document.addEventListener('mouseenter', function(e) {
    if (!e.target.closest) return;
    const dial = e.target.closest('.sui-speed-dial-hover');
    if (!dial) return;
    dial.classList.add('open');
    const trigger = dial.querySelector('.sui-speed-dial-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }, true);

  document.addEventListener('mouseleave', function(e) {
    // Only react when the pointer leaves the dial itself, not its children
    if (!e.target.matches || !e.target.matches('.sui-speed-dial-hover')) return;
    // Refocus the trigger so focus isn't stranded on a now-hidden action
    closeSpeedDial(e.target, true);
  }, true);

  // =========================================
  // Tree View
  // =========================================
  let treeIdCount = 0;

  function treeChildren(item) {
    return item.querySelector(':scope > .sui-tree-children');
  }

  function treeOwnCheckbox(item) {
    return item.querySelector(':scope > .sui-tree-label .sui-checkbox input');
  }

  function setTreeExpanded(item, open) {
    if (!treeChildren(item)) return;
    item.classList.toggle('expanded', open);
    if (item.hasAttribute('aria-expanded')) item.setAttribute('aria-expanded', open ? 'true' : 'false');
    emit(item, 'sui-tree-toggle', { expanded: open });
  }

  // Items with no collapsed ancestor item
  function treeVisibleItems(tree) {
    return Array.from(tree.querySelectorAll('.sui-tree-item')).filter(function(item) {
      let p = item.parentElement && item.parentElement.closest('.sui-tree-item');
      while (p && tree.contains(p)) {
        if (!p.classList.contains('expanded')) return false;
        p = p.parentElement && p.parentElement.closest('.sui-tree-item');
      }
      return true;
    });
  }

  function treeSyncChecked(tree) {
    tree.querySelectorAll('.sui-tree-item').forEach(function(item) {
      const cb = treeOwnCheckbox(item);
      if (cb && item.getAttribute('role') === 'treeitem') {
        item.setAttribute('aria-checked', cb.indeterminate ? 'mixed' : (cb.checked ? 'true' : 'false'));
      }
    });
  }

  function treeFocus(tree, item) {
    tree.querySelectorAll('.sui-tree-item[tabindex="0"]').forEach(function(i) { i.setAttribute('tabindex', '-1'); });
    item.setAttribute('tabindex', '0');
    item.focus();
  }

  // WAI-ARIA tree: role/roving tabindex/aria-expanded live on .sui-tree-item
  function treePrime(tree) {
    if (tree.dataset.suiKbd) return;
    tree.dataset.suiKbd = '1';
    if (!tree.hasAttribute('role')) tree.setAttribute('role', 'tree');
    tree.querySelectorAll('.sui-tree-item').forEach(function(item) {
      const label = item.querySelector(':scope > .sui-tree-label');
      if (!item.hasAttribute('role')) item.setAttribute('role', 'treeitem');
      if (label && !item.hasAttribute('aria-labelledby') && !item.hasAttribute('aria-label')) {
        if (!label.id) label.id = 'sui-tree-label-' + (++treeIdCount);
        item.setAttribute('aria-labelledby', label.id);
      }
      const children = treeChildren(item);
      if (children) {
        if (!children.hasAttribute('role')) children.setAttribute('role', 'group');
        item.setAttribute('aria-expanded', item.classList.contains('expanded') ? 'true' : 'false');
      }
      const cb = treeOwnCheckbox(item);
      if (cb) cb.setAttribute('tabindex', '-1');
      if (!item.hasAttribute('tabindex')) item.setAttribute('tabindex', '-1');
    });
    treeSyncChecked(tree);
    const first = treeVisibleItems(tree)[0];
    if (first && !tree.querySelector('.sui-tree-item[tabindex="0"]')) first.setAttribute('tabindex', '0');
  }

  document.addEventListener('click', function(e) {
    const label = e.target.closest('.sui-tree-label');
    if (!label) return;
    if (e.target.closest('.sui-checkbox')) return;
    const item = label.closest('.sui-tree-item');
    const children = item.querySelector('.sui-tree-children');
    if (children) {
      setTreeExpanded(item, !item.classList.contains('expanded'));
    }
  });

  // Keep the roving tabindex on whichever item last received focus
  document.addEventListener('focusin', function(e) {
    if (!e.target.closest) return;
    const item = e.target.closest('.sui-tree-item[role="treeitem"]');
    if (!item || e.target !== item) return;
    const tree = item.closest('.sui-tree');
    if (!tree) return;
    tree.querySelectorAll('.sui-tree-item[tabindex="0"]').forEach(function(i) { if (i !== item) i.setAttribute('tabindex', '-1'); });
    item.setAttribute('tabindex', '0');
  });

  // Keyboard: Up/Down, Right/Left (expand/collapse/move), Home/End, Enter, Space
  document.addEventListener('keydown', function(e) {
    if (!e.target.closest || e.altKey || e.ctrlKey || e.metaKey) return;
    const item = e.target.closest('.sui-tree-item');
    if (!item || e.target !== item) return;
    const tree = item.closest('.sui-tree');
    if (!tree) return;
    const rtl = getComputedStyle(tree).direction === 'rtl';
    const inward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const outward = rtl ? 'ArrowRight' : 'ArrowLeft';
    const hasChildren = !!treeChildren(item);
    const expanded = item.classList.contains('expanded');
    const visible = treeVisibleItems(tree);
    const i = visible.indexOf(item);
    let target = null;
    if (e.key === 'ArrowDown') target = visible[i + 1];
    else if (e.key === 'ArrowUp') target = visible[i - 1];
    else if (e.key === 'Home') target = visible[0];
    else if (e.key === 'End') target = visible[visible.length - 1];
    else if (e.key === inward) {
      e.preventDefault();
      if (hasChildren && !expanded) { setTreeExpanded(item, true); return; }
      if (hasChildren) target = treeChildren(item).querySelector(':scope > .sui-tree-item');
    } else if (e.key === outward) {
      e.preventDefault();
      if (hasChildren && expanded) { setTreeExpanded(item, false); return; }
      const parent = item.parentElement && item.parentElement.closest('.sui-tree-item');
      if (parent && tree.contains(parent)) target = parent;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hasChildren) setTreeExpanded(item, !expanded);
      return;
    } else if (e.key === ' ') {
      e.preventDefault();
      const cb = treeOwnCheckbox(item);
      if (cb) cb.click();
      else if (hasChildren) setTreeExpanded(item, !expanded);
      return;
    } else {
      return;
    }
    e.preventDefault();
    if (target) treeFocus(tree, target);
  });

  // Tree checkbox propagation
  document.addEventListener('change', function(e) {
    if (!e.target.closest('.sui-tree .sui-checkbox input')) return;
    const checkbox = e.target;
    const item = checkbox.closest('.sui-tree-item');
    const checked = checkbox.checked;

    // Propagate down — check/uncheck all children
    const childBoxes = item.querySelectorAll('.sui-tree-children .sui-checkbox input');
    childBoxes.forEach(function(cb) {
      cb.checked = checked;
      cb.indeterminate = false;
    });

    // Propagate up — update parent state
    updateTreeParent(item);
  });

  function updateTreeParent(item) {
    const parentChildren = item.closest('.sui-tree-children');
    if (!parentChildren) return;
    const parentItem = parentChildren.closest('.sui-tree-item');
    if (!parentItem) return;
    const parentCb = parentItem.querySelector(':scope > .sui-tree-label .sui-checkbox input');
    if (!parentCb) return;

    const siblings = parentChildren.querySelectorAll(':scope > .sui-tree-item > .sui-tree-label .sui-checkbox input');
    const total = siblings.length;
    let checkedCount = 0;
    siblings.forEach(function(cb) { if (cb.checked) checkedCount++; });

    if (checkedCount === 0) {
      parentCb.checked = false;
      parentCb.indeterminate = false;
    } else if (checkedCount === total) {
      parentCb.checked = true;
      parentCb.indeterminate = false;
    } else {
      parentCb.checked = false;
      parentCb.indeterminate = true;
    }

    // Continue up the tree
    updateTreeParent(parentItem);
  }

  // Mirror checkbox state onto treeitems (registered after the propagation listener)
  document.addEventListener('change', function(e) {
    if (!e.target.closest || !e.target.closest('.sui-tree .sui-checkbox input')) return;
    const tree = e.target.closest('.sui-tree');
    if (tree.dataset.suiKbd) treeSyncChecked(tree);
  });

  // Keyboard/ARIA enhancement for rating, colour swatches, tree view and
  // lightbox thumbnails. Adds only missing attributes; safe to call again.
  function initKeyboardA11y() {
    document.querySelectorAll('.sui-rating').forEach(ratingPrime);
    document.querySelectorAll('.sui-color-picker').forEach(function(picker) {
      if (picker.querySelector('.sui-color-swatch')) swatchPrime(picker);
    });
    document.querySelectorAll('.sui-tree').forEach(treePrime);
    lightboxPrime(document);
  }

  // =========================================
  // Tour / Walkthrough
  // =========================================
  function tour(steps, options) {
    options = options || {};
    let currentStep = 0;
    let overlay, backdrop, spotlight, tooltip;
    const padding = options.padding != null ? options.padding : 8;
    const noOverlay = options.noOverlay || false;

    function create() {
      overlay = document.createElement('div');
      overlay.className = 'sui-tour-overlay' + (noOverlay ? ' sui-tour-no-overlay' : '');
      backdrop = document.createElement('div');
      backdrop.className = 'sui-tour-backdrop';
      spotlight = document.createElement('div');
      spotlight.className = 'sui-tour-spotlight';
      tooltip = document.createElement('div');
      tooltip.className = 'sui-tour-tooltip';
      overlay.appendChild(backdrop);
      overlay.appendChild(spotlight);
      overlay.appendChild(tooltip);
      document.body.appendChild(overlay);

      backdrop.addEventListener('click', close);
      document.addEventListener('keydown', onKeydown);
    }

    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }

    let firstShow = true;

    function show(idx) {
      // Out of range (next() on the last step, goTo(n)) or already closed: no-op
      if (!overlay || typeof idx !== 'number' || idx < 0 || idx >= steps.length) return;
      currentStep = idx;
      const step = steps[idx];
      const target = document.querySelector(step.target);

      // Only hide on first show to avoid flash between steps
      if (firstShow) {
        spotlight.style.opacity = '0';
        tooltip.style.opacity = '0';
        firstShow = false;
      }

      // Scroll if element isn't comfortably in view (with margin for tooltip)
      let needsScroll = false;
      if (target) {
        const r = target.getBoundingClientRect();
        const margin = 120;
        needsScroll = r.top < margin || r.bottom > window.innerHeight - margin;
        if (needsScroll) target.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
      }
      setTimeout(function() {
      if (target) {
        const rect = target.getBoundingClientRect();
        spotlight.style.top = (rect.top - padding) + 'px';
        spotlight.style.left = (rect.left - padding) + 'px';
        spotlight.style.width = (rect.width + padding * 2) + 'px';
        spotlight.style.height = (rect.height + padding * 2) + 'px';
      }

      // Build tooltip content
      let dotsHtml = '';
      if (steps.length > 1) {
        dotsHtml = '<div class="sui-tour-dots">';
        for (let i = 0; i < steps.length; i++) {
          dotsHtml += '<span class="sui-tour-dot' + (i === idx ? ' active' : '') + '"></span>';
        }
        dotsHtml += '</div>';
      }

      tooltip.innerHTML =
        '<div class="sui-tour-tooltip-title"></div>' +
        '<div class="sui-tour-tooltip-desc"></div>' +
        '<div class="sui-tour-tooltip-footer">' +
          dotsHtml +
          '<div class="sui-tour-tooltip-actions">' +
            (idx > 0 ? '<button class="sui-btn sui-btn-sm sui-tour-prev">Back</button>' : '<button class="sui-btn sui-btn-sm sui-tour-skip">Skip</button>') +
            (idx < steps.length - 1 ? '<button class="sui-btn sui-btn-primary sui-btn-sm sui-tour-next">Next</button>' : '<button class="sui-btn sui-btn-primary sui-btn-sm sui-tour-done">Done</button>') +
          '</div>' +
        '</div>';

      // Title/description are text unless html: true (trusted content only)
      const allowHtml = step.html != null ? !!step.html : !!options.html;
      const titleEl = tooltip.querySelector('.sui-tour-tooltip-title');
      const descEl = tooltip.querySelector('.sui-tour-tooltip-desc');
      if (allowHtml) {
        titleEl.innerHTML = step.title || '';
        descEl.innerHTML = step.description || '';
      } else {
        titleEl.textContent = step.title || '';
        descEl.textContent = step.description || '';
      }

      // Button handlers
      const nextBtn = tooltip.querySelector('.sui-tour-next');
      const prevBtn = tooltip.querySelector('.sui-tour-prev');
      const skipBtn = tooltip.querySelector('.sui-tour-skip');
      const doneBtn = tooltip.querySelector('.sui-tour-done');
      if (nextBtn) nextBtn.addEventListener('click', function() { show(currentStep + 1); });
      if (prevBtn) prevBtn.addEventListener('click', function() { show(currentStep - 1); });
      if (skipBtn) skipBtn.addEventListener('click', close);
      if (doneBtn) doneBtn.addEventListener('click', close);

      // Position tooltip after scroll settles
      if (target) {
        const rect = target.getBoundingClientRect();
        const pos = step.position || 'bottom';
        const tooltipW = 300;
        const centerX = rect.left + rect.width / 2 - tooltipW / 2;
        let top, left;

        tooltip.style.transform = '';

        if (pos === 'bottom') {
          top = rect.bottom + padding + 12;
          left = centerX;
        } else if (pos === 'top') {
          top = rect.top - padding - 12;
          left = centerX;
          tooltip.style.transform = 'translateY(-100%)';
        } else if (pos === 'left') {
          top = rect.top + rect.height / 2;
          left = rect.left - padding - tooltipW - 12;
          tooltip.style.transform = 'translateY(-50%)';
        } else if (pos === 'right') {
          top = rect.top + rect.height / 2;
          left = rect.right + padding + 12;
          tooltip.style.transform = 'translateY(-50%)';
        }

        // Keep tooltip within viewport
        left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));
        top = Math.max(8, Math.min(top, window.innerHeight - 200));
        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
      }
      // Reveal after positioning
      spotlight.style.opacity = '1';
      tooltip.style.opacity = '1';
      }, needsScroll ? 350 : 50);

      overlay.classList.add('active');
    }

    let closed = false;

    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeydown);
      const el = overlay;
      overlay = null;
      if (el) {
        el.classList.remove('active');
        setTimeout(function() {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 300);
      }
      if (options.onComplete) options.onComplete();
    }

    create();
    show(0);

    return { next: function() { show(currentStep + 1); }, prev: function() { show(currentStep - 1); }, close: close, goTo: show };
  }

  // =========================================
  // Theme switcher
  // =========================================
  // Opt-in: only runs when the page has a [data-sui-theme-toggle] element or
  // <html data-sui-theme-auto>, or when SoftUI.theme.set/toggle/clear is
  // called. Otherwise data-theme is never touched. Priority: saved > system.
  const THEME_KEY = 'sui-theme';
  const themeMql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let themeActive = false;

  function readTheme() {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (_) {
      return null;
    }
  }

  function storageAvailable() {
    try {
      localStorage.getItem(THEME_KEY);
      return true;
    } catch (_) {
      return false;
    }
  }

  function writeTheme(v) {
    try {
      if (v) localStorage.setItem(THEME_KEY, v);
      else localStorage.removeItem(THEME_KEY);
    } catch (_) { /* storage unavailable (private mode, sandboxed iframe) */ }
  }

  function systemTheme() { return themeMql && themeMql.matches ? 'dark' : 'light'; }
  function resolveTheme() { return readTheme() || systemTheme(); }

  function getTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    return cur === 'light' || cur === 'dark' ? cur : resolveTheme();
  }

  function syncThemeToggles(t) {
    const saved = readTheme();
    document.querySelectorAll('[data-sui-theme-toggle]').forEach(function(btn) {
      const v = btn.getAttribute('data-sui-theme-toggle');
      // Set-buttons reflect the saved preference, not the resolved theme
      if (v === 'light' || v === 'dark' || v === 'system') {
        const pressed = v === 'system' ? !saved : saved === v;
        btn.setAttribute('aria-pressed', String(pressed));
        btn.classList.toggle('active', pressed);
        return;
      }
      const labelDark = btn.getAttribute('data-sui-label-dark');
      const labelLight = btn.getAttribute('data-sui-label-light');
      if (labelDark && labelLight) {
        // Label-swapping model: no aria-pressed (it would contradict the name)
        btn.setAttribute('aria-label', t === 'dark' ? labelDark : labelLight);
        btn.removeAttribute('aria-pressed');
      } else {
        btn.setAttribute('aria-pressed', String(t === 'dark'));
        if (!btn.hasAttribute('aria-label') && !btn.hasAttribute('aria-labelledby') && !btn.textContent.trim()) {
          btn.setAttribute('aria-label', 'Dark mode');
        }
      }
      if (btn.classList.contains('sui-swap') || btn.classList.contains('sui-theme-toggle')) {
        btn.classList.toggle('active', t === 'dark');
      }
    });
  }

  function applyTheme(t, source) {
    const html = document.documentElement;
    const prev = html.getAttribute('data-theme');
    html.setAttribute('data-theme', t);
    syncThemeToggles(t);
    if (prev !== t) emit(document, 'sui-theme-change', { theme: t, source: source });
  }

  // skipInit: set()/clear() apply their own theme right after, so the first
  // API call fires a single 'user' event instead of an 'init' one.
  function activateTheme(skipInit) {
    if (themeActive) return;
    themeActive = true;
    if (!skipInit) {
      // Without storage (sandboxed iframe, blocked cookies) nothing can have
      // been saved, so keep a data-theme the page already set rather than
      // overriding it with the OS preference.
      const cur = document.documentElement.getAttribute('data-theme');
      const keep = !storageAvailable() && (cur === 'light' || cur === 'dark');
      applyTheme(keep ? cur : resolveTheme(), 'init');
    }
    // Follow the OS while no choice is saved
    if (themeMql) {
      const onSystemChange = function() { if (!readTheme()) applyTheme(systemTheme(), 'system'); };
      if (themeMql.addEventListener) themeMql.addEventListener('change', onSystemChange);
      else if (themeMql.addListener) themeMql.addListener(onSystemChange);
    }
    // Sync with other tabs
    window.addEventListener('storage', function(e) {
      if (e.key === THEME_KEY || e.key === null) applyTheme(resolveTheme(), 'storage');
    });
  }

  function setTheme(t) {
    if (t !== 'light' && t !== 'dark') return;
    activateTheme(true);
    writeTheme(t); // write first so toggles sync to the saved value
    applyTheme(t, 'user');
  }

  function toggleTheme() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

  function clearTheme() {
    activateTheme(true);
    writeTheme(null);
    applyTheme(systemTheme(), 'user');
  }

  const theme = { get: getTheme, set: setTheme, toggle: toggleTheme, clear: clearTheme, system: systemTheme };

  function initTheme() {
    if (themeActive) { syncThemeToggles(getTheme()); return; }
    if (document.documentElement.hasAttribute('data-sui-theme-auto') || document.querySelector('[data-sui-theme-toggle]')) {
      activateTheme();
    }
  }

  // [data-sui-theme-toggle] toggles; ="light" / "dark" / "system" set a value
  document.addEventListener('click', function(e) {
    if (!e.target.closest) return;
    const btn = e.target.closest('[data-sui-theme-toggle]');
    if (!btn) return;
    const v = btn.getAttribute('data-sui-theme-toggle');
    if (v === 'light' || v === 'dark') setTheme(v);
    else if (v === 'system') clearTheme();
    else toggleTheme();
  });

  // =========================================
  // Color input — keep the hex readout in sync
  // =========================================
  document.addEventListener('input', function(e) {
    const input = e.target;
    if (!input || input.type !== 'color' || !input.closest) return;
    const wrap = input.closest('.sui-color-input');
    const out = wrap && wrap.querySelector('.sui-color-input-value');
    if (out) out.textContent = input.value.toUpperCase();
  });

  // =========================================
  // Scroll Reveal
  // =========================================
  // Content is only hidden once html has .sui-reveal-ready, so it stays
  // visible without JS. One shared IntersectionObserver.
  let revealObserver = null;
  // Pending finishReveal fallback timers, so a stale one can't end a newer reveal
  const revealTimers = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function cancelFinishReveal(el) {
    if (!revealTimers) return;
    const cancel = revealTimers.get(el);
    if (cancel) { cancel(); revealTimers.delete(el); }
  }

  function cssTimeMs(list) {
    return Math.max.apply(null, String(list).split(',').map(function(v) {
      v = v.trim();
      return /ms$/.test(v) ? parseFloat(v) || 0 : (parseFloat(v) || 0) * 1000;
    }));
  }

  // After the reveal transition, stop overriding the element's own transition
  function finishReveal(el) {
    const cs = getComputedStyle(el);
    const wait = cssTimeMs(cs.transitionDuration) + cssTimeMs(cs.transitionDelay) + 50;
    let finished = false;
    let timer = null;
    cancelFinishReveal(el);
    function stop() {
      finished = true;
      el.removeEventListener('transitionend', done);
      clearTimeout(timer);
      if (revealTimers && revealTimers.get(el) === stop) revealTimers.delete(el);
    }
    function done(e) {
      if (e && (e.target !== el || e.propertyName !== 'opacity')) return;
      if (finished) return;
      stop();
      if (el.classList.contains('sui-revealed')) el.classList.add('sui-reveal-done');
    }
    el.addEventListener('transitionend', done);
    timer = setTimeout(function() { done(); }, wait);
    if (revealTimers) revealTimers.set(el, stop);
  }

  // instant: show at once with no animation (used for focus)
  function revealNow(el, instant) {
    if (!el.classList.contains('sui-revealed')) {
      el.classList.add('sui-revealed');
      if (instant) { cancelFinishReveal(el); el.classList.add('sui-reveal-done'); }
      else finishReveal(el);
    }
    if (revealObserver && !el.hasAttribute('data-reveal-repeat')) revealObserver.unobserve(el);
  }

  // The observer's negative bottom margin means a short element sitting in the
  // last ~10% of a page scrolled to its end never intersects. At the end of the
  // page, reveal anything pending that is actually on screen.
  let revealEdgeQueued = false;
  function revealAtPageEnd() {
    revealEdgeQueued = false;
    const html = document.documentElement;
    const vh = window.innerHeight || html.clientHeight;
    if (window.scrollY + vh < html.scrollHeight - 2) return;
    document.querySelectorAll('.sui-reveal:not(.sui-revealed)').forEach(function(el) {
      if (el.getClientRects().length === 0) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < vh) revealNow(el, false);
    });
  }
  function queueRevealAtPageEnd() {
    if (revealEdgeQueued) return;
    revealEdgeQueued = true;
    requestAnimationFrame(revealAtPageEnd);
  }

  function bindRevealGlobal() {
    if (!once('reveal')) return;
    window.addEventListener('scroll', queueRevealAtPageEnd, { passive: true });
    window.addEventListener('resize', queueRevealAtPageEnd, { passive: true });
    // Never leave focused content invisible (WCAG 2.4.7)
    document.addEventListener('focusin', function(e) {
      const r = e.target.closest && e.target.closest('.sui-reveal:not(.sui-revealed)');
      if (r && document.documentElement.classList.contains('sui-reveal-ready')) revealNow(r, true);
    });
  }

  function onRevealEntries(entries) {
    entries.forEach(function(entry) {
      const el = entry.target;
      const repeat = el.hasAttribute('data-reveal-repeat');
      if (entry.isIntersecting) {
        revealNow(el, false);
      } else if (repeat && el.classList.contains('sui-revealed')) {
        cancelFinishReveal(el);
        el.classList.remove('sui-revealed', 'sui-reveal-done');
      }
    });
  }

  function reveal(target, opts) {
    opts = opts || {};
    let els;
    if (!target) els = document.querySelectorAll('.sui-reveal:not(.sui-revealed)');
    else if (typeof target === 'string') els = document.querySelectorAll(target);
    else if (target.nodeType === 1) els = [target];
    else els = target;
    els = Array.prototype.slice.call(els);
    const html = document.documentElement;

    els.forEach(function(el) {
      el.classList.add('sui-reveal');
      // data-reveal-stagger="100" on the parent: 0ms, 100ms, 200ms...
      const parent = el.parentElement;
      if (parent && parent.hasAttribute('data-reveal-stagger') && !el.style.getPropertyValue('--sui-delay')) {
        const step = parseInt(parent.getAttribute('data-reveal-stagger'), 10) || 80;
        const siblings = Array.prototype.filter.call(parent.children, function(c) { return c.classList.contains('sui-reveal'); });
        el.style.setProperty('--sui-delay', (siblings.indexOf(el) * step) + 'ms');
      }
    });

    // No observer support or reduced motion: just show everything
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      els.forEach(function(el) { el.classList.add('sui-revealed', 'sui-reveal-done'); });
      html.classList.add('sui-reveal-ready');
      return;
    }

    // rootMargin / threshold apply when the observer is first created
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(onRevealEntries, {
        rootMargin: opts.rootMargin || '0px 0px -10% 0px',
        threshold: opts.threshold != null ? opts.threshold : 0.1
      });
    }
    bindRevealGlobal();

    // On first run, elements already in view are shown without animating,
    // so above-the-fold content never flashes hidden.
    if (!html.classList.contains('sui-reveal-ready')) {
      const vh = window.innerHeight || html.clientHeight;
      els.forEach(function(el) {
        if (el.getClientRects().length === 0) return;
        const rect = el.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < vh) el.classList.add('sui-revealed', 'sui-reveal-done');
      });
    }

    els.forEach(function(el) {
      if (el.classList.contains('sui-revealed') && !el.hasAttribute('data-reveal-repeat')) return;
      // Re-observing an observed target is a no-op; unobserve first so a
      // replayed element gets a fresh initial entry.
      revealObserver.unobserve(el);
      revealObserver.observe(el);
    });
    html.classList.add('sui-reveal-ready');
    queueRevealAtPageEnd();
  }

  function initReveal(root) {
    const list = [];
    each(root, '.sui-reveal', 'reveal', function(el) {
      if (!el.classList.contains('sui-revealed')) list.push(el);
    });
    if (list.length) reveal(list);
  }

  // =========================================
  // Init — SoftUI.init(root) wires up markup added later (SPA renders).
  // Safe to call repeatedly: document listeners bind once and each element
  // is set up once. One failing component never stops the others.
  // =========================================
  const initializers = [
    ['tabs', initTabs],
    ['accordion', initAccordion],
    ['collapsible', initCollapsible],
    ['dropdown', initDropdown],
    ['contextMenu', initContextMenu],
    ['command', initCommand],
    ['calendar', initCalendar],
    ['timePicker', initTimePicker],
    ['menubar', initMenubar],
    ['combobox', initCombobox],
    ['resizable', initResizable],
    ['popover', initPopover],
    ['carousels', initCarousels],
    ['sliders', initSliders],
    ['toggleGroups', initToggleGroups],
    ['otp', initOtp],
    ['charts', initCharts],
    ['styledSelects', initStyledSelects],
    ['selectablePricing', initSelectablePricing],
    ['drawers', initDrawers],
    ['editable', initEditable],
    ['sidebars', initSidebars],
    ['keyboardA11y', initKeyboardA11y],
    ['scrollspy', initScrollspy],
    ['countdowns', initCountdowns],
    ['segmented', initSegmented],
    ['navMenu', initNavMenu],
    ['dataTables', initDataTables],
    ['dragDrop', initDragDrop],
    ['spectrumPickers', initSpectrumPickers],
    ['radialProgress', initRadialProgress],
    ['slideSwaps', initSlideSwaps],
    ['typewriters', initTypewriters],
    ['textRotate', initTextRotate],
    ['diffSliders', initDiffSliders],
    ['theme', initTheme],
    ['reveal', initReveal]
  ];

  function init(root) {
    if (typeof root === 'string') root = document.querySelector(root);
    const r = root || document;
    safe('bindGlobal', bindGlobal);
    initializers.forEach(function(p) { safe(p[0], p[1], r); });
    return r;
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { init(document); });
  } else {
    init(document);
  }

  return { init, modal, sheet, toast, carousel, sidebar, tour, theme, reveal, version: VERSION };
});

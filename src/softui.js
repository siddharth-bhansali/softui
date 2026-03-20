/*! SoftUI v1.1.0 — Interactive Behaviors */

const SoftUI = (() => {
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // =========================================
  // Modal
  // =========================================
  function modal(selector) {
    const backdrop = document.querySelector(selector);
    if (!backdrop) return null;

    let previouslyFocused = null;

    function open() {
      previouslyFocused = document.activeElement;
      backdrop.classList.add('sui-modal-open');
      document.body.style.overflow = 'hidden';

      // Focus the first focusable element inside the modal
      const modal = backdrop.querySelector('.sui-modal');
      if (modal) {
        const first = getFocusable(modal)[0];
        if (first) first.focus();
      }
    }

    function close() {
      backdrop.classList.remove('sui-modal-open');
      document.body.style.overflow = '';

      // Restore focus to the element that opened the modal
      if (previouslyFocused) {
        previouslyFocused.focus();
        previouslyFocused = null;
      }
    }

    function isOpen() {
      return backdrop.classList.contains('sui-modal-open');
    }

    return { open, close, isOpen };
  }

  // =========================================
  // Sheet / Drawer
  // =========================================
  function sheet(selector) {
    const backdrop = document.querySelector(selector);
    if (!backdrop) return null;

    let previouslyFocused = null;

    function open() {
      previouslyFocused = document.activeElement;
      backdrop.classList.add('sui-sheet-open');
      document.body.style.overflow = 'hidden';

      const panel = backdrop.querySelector('.sui-sheet');
      if (panel) {
        const first = getFocusable(panel)[0];
        if (first) first.focus();
      }
    }

    function close() {
      backdrop.classList.remove('sui-sheet-open');
      document.body.style.overflow = '';

      if (previouslyFocused) {
        previouslyFocused.focus();
        previouslyFocused = null;
      }
    }

    function isOpen() {
      return backdrop.classList.contains('sui-sheet-open');
    }

    return { open, close, isOpen };
  }

  // =========================================
  // Focus trap helper
  // =========================================
  function getFocusable(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
  }

  // =========================================
  // Global listeners (auto-initialized)
  // =========================================
  function init() {
    // Escape key closes any open modal or sheet
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.sui-modal-backdrop.sui-modal-open');
        if (openModal) {
          openModal.classList.remove('sui-modal-open');
          document.body.style.overflow = '';
        }
        const openSheet = document.querySelector('.sui-sheet-backdrop.sui-sheet-open');
        if (openSheet && !openSheet.classList.contains('sui-sheet-static')) {
          openSheet.classList.remove('sui-sheet-open');
          document.body.style.overflow = '';
        }
      }
    });

    // Click backdrop to close (or shake if static)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('sui-modal-backdrop') && e.target.classList.contains('sui-modal-open')) {
        if (e.target.classList.contains('sui-modal-static')) {
          e.target.classList.add('sui-modal-shake');
          setTimeout(() => e.target.classList.remove('sui-modal-shake'), 200);
        } else {
          e.target.classList.remove('sui-modal-open');
          document.body.style.overflow = '';
        }
      }
    });

    // Focus trap inside open modals
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      const backdrop = document.querySelector('.sui-modal-backdrop.sui-modal-open');
      if (!backdrop) return;

      const modal = backdrop.querySelector('.sui-modal');
      if (!modal) return;

      const focusable = getFocusable(modal);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Close button handler (any .sui-modal-close inside a backdrop)
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('.sui-modal-close');
      if (!closeBtn) return;

      const backdrop = closeBtn.closest('.sui-modal-backdrop');
      if (backdrop) {
        backdrop.classList.remove('sui-modal-open');
        document.body.style.overflow = '';
      }
    });

    // Sheet backdrop click to close (or shake if static)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('sui-sheet-backdrop') && e.target.classList.contains('sui-sheet-open')) {
        if (e.target.classList.contains('sui-sheet-static')) {
          e.target.classList.add('sui-sheet-shake');
          setTimeout(() => e.target.classList.remove('sui-sheet-shake'), 200);
        } else {
          e.target.classList.remove('sui-sheet-open');
          document.body.style.overflow = '';
        }
      }
    });

    // Sheet close button handler
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('.sui-sheet-close');
      if (!closeBtn) return;

      const backdrop = closeBtn.closest('.sui-sheet-backdrop');
      if (backdrop) {
        backdrop.classList.remove('sui-sheet-open');
        document.body.style.overflow = '';
      }
    });

    // Focus trap inside open sheets
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      const sheetBackdrop = document.querySelector('.sui-sheet-backdrop.sui-sheet-open');
      if (!sheetBackdrop) return;

      const panel = sheetBackdrop.querySelector('.sui-sheet');
      if (!panel) return;

      const focusable = getFocusable(panel);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
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

    // Tabs
    initTabs();

    // Accordion
    initAccordion();

    // Collapsible
    initCollapsible();

    // Dropdown
    initDropdown();

    // Context Menu
    initContextMenu();

    // Command Palette
    initCommand();

    // Calendar
    initCalendar();
    initTimePicker();

    // Menubar
    initMenubar();

    // Combobox
    initCombobox();

    // Resizable
    initResizable();

    // Popover
    initPopover();

    // Carousels
    initCarousels();

    // Sliders
    initSliders();

    // Toggle Groups
    initToggleGroups();

    // Input OTP
    initOtp();

    // Charts
    initCharts();

    // Data Tables
    initDataTables();

    // Drag & Drop
    initDragDrop();

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

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // =========================================
  // Tabs
  // =========================================
  function initTabs() {
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
  function initAccordion() {
    // Set accurate max-height on initially active items
    document.querySelectorAll('.sui-accordion-item.active .sui-accordion-body').forEach(body => {
      body.style.setProperty('--sui-accordion-height', body.scrollHeight + 'px');
    });

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
  function initCollapsible() {
    // Set height on initially open collapsibles
    document.querySelectorAll('.sui-collapsible.open .sui-collapsible-content').forEach(function(content) {
      content.style.setProperty('--sui-collapsible-height', content.scrollHeight + 'px');
    });

    document.addEventListener('click', function(e) {
      var trigger = e.target.closest('.sui-collapsible-trigger');
      if (!trigger) return;

      var collapsible = trigger.closest('.sui-collapsible');
      if (!collapsible) return;

      var content = collapsible.querySelector('.sui-collapsible-content');
      if (!content) return;

      var isOpen = collapsible.classList.contains('open');

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
  function getToastContainer(position) {
    const pos = position || 'tr';
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
      closable: true
    }, options);

    const container = getToastContainer(opts.position);

    const el = document.createElement('div');
    let cls = 'sui-toast';
    if (opts.variant) cls += ' sui-toast-' + opts.variant;
    el.className = cls;
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'polite');

    let html = '<div class="sui-toast-body">';
    if (opts.title) html += '<div class="sui-toast-title">' + opts.title + '</div>';
    if (opts.message) html += '<div class="sui-toast-message">' + opts.message + '</div>';
    html += '</div>';
    if (opts.closable) html += '<button class="sui-toast-close"></button>';
    if (opts.duration > 0) html += '<div class="sui-toast-progress"></div>';
    el.innerHTML = html;

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

    // Escape closes dropdowns
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.sui-dropdown.open, .sui-dropdown-split.open').forEach(d => {
          d.classList.remove('open');
          const t = d.querySelector('[data-sui-dropdown], .sui-dropdown-toggle');
          if (t) t.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  // =========================================
  // Context Menu
  // =========================================
  function initContextMenu() {
    var openMenu = null;

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

      var rect = menu.getBoundingClientRect();
      var vw = window.innerWidth;
      var vh = window.innerHeight;

      if (x + rect.width > vw) x = vw - rect.width - 4;
      if (y + rect.height > vh) y = vh - rect.height - 4;
      if (x < 0) x = 4;
      if (y < 0) y = 4;

      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
    }

    // Right-click triggers
    document.addEventListener('contextmenu', function(e) {
      var trigger = e.target.closest('[data-sui-context]');
      if (!trigger) return;

      e.preventDefault();
      closeAll();

      var menuId = trigger.getAttribute('data-sui-context');
      var menu = document.getElementById(menuId);
      if (!menu) return;

      positionMenu(menu, e.clientX, e.clientY);
      openMenu = menu;

      // Focus first item for keyboard nav
      var firstItem = menu.querySelector('.sui-context-item:not(.disabled), .sui-context-sub-trigger');
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
      var item = e.target.closest('.sui-context-item');
      if (!item || !openMenu) return;
      if (!item.closest('.sui-context-menu')) return;

      // Checkbox toggle
      if (item.hasAttribute('data-sui-context-check')) {
        var check = item.querySelector('.sui-context-check');
        if (check) {
          var isChecked = check.textContent.trim() !== '';
          check.textContent = isChecked ? '' : '\u2713';
        }
        return; // Don't close on checkbox click
      }

      // Radio toggle
      if (item.hasAttribute('data-sui-context-radio')) {
        var group = item.getAttribute('data-sui-context-radio');
        openMenu.querySelectorAll('[data-sui-context-radio="' + group + '"] .sui-context-check').forEach(function(c) {
          c.textContent = '';
        });
        var radio = item.querySelector('.sui-context-check');
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
      var subTrigger = e.target.closest && e.target.closest('.sui-context-sub-trigger');
      if (!subTrigger) return;
      var sub = subTrigger.closest('.sui-context-sub');
      if (!sub) return;

      // Close sibling subs
      var parent = sub.parentElement;
      if (parent) {
        parent.querySelectorAll(':scope > .sui-context-sub.open').forEach(function(s) {
          if (s !== sub) s.classList.remove('open');
        });
      }
      sub.classList.add('open');
    }, true);

    document.addEventListener('mouseleave', function(e) {
      var sub = e.target.closest && e.target.closest('.sui-context-sub');
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
        // If a sub is open, close it first
        var openSub = openMenu.querySelector('.sui-context-sub.open');
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
        var activeContainer = openMenu.querySelector('.sui-context-sub.open > .sui-context-sub-content') || openMenu;
        var items = Array.from(activeContainer.querySelectorAll(':scope > .sui-context-item:not(.disabled), :scope > .sui-context-sub > .sui-context-sub-trigger'));
        if (items.length === 0) return;

        var current = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
          current = current < items.length - 1 ? current + 1 : 0;
        } else {
          current = current > 0 ? current - 1 : items.length - 1;
        }
        items[current].focus();
      }

      // ArrowRight opens submenu
      if (e.key === 'ArrowRight') {
        var focused = document.activeElement;
        if (focused && focused.classList.contains('sui-context-sub-trigger')) {
          var sub = focused.closest('.sui-context-sub');
          if (sub) {
            sub.classList.add('open');
            var first = sub.querySelector('.sui-context-sub-content .sui-context-item:not(.disabled), .sui-context-sub-content .sui-context-sub-trigger');
            if (first) first.focus();
          }
        }
      }

      // ArrowLeft closes submenu
      if (e.key === 'ArrowLeft') {
        var openSub = document.activeElement && document.activeElement.closest('.sui-context-sub.open');
        if (openSub && openSub.closest('.sui-context-menu') === openMenu) {
          openSub.classList.remove('open');
          openSub.querySelector('.sui-context-sub-trigger').focus();
        }
      }

      // Enter activates
      if (e.key === 'Enter') {
        var focused = document.activeElement;
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
  function initCommand() {
    document.querySelectorAll('.sui-command[data-sui-command]').forEach(function(cmd) {
      var input = cmd.querySelector('.sui-command-input');
      var list = cmd.querySelector('.sui-command-list');
      var empty = cmd.querySelector('.sui-command-empty');
      if (!input || !list) return;

      var items = list.querySelectorAll('.sui-command-item');
      var groups = list.querySelectorAll('.sui-command-group');
      var separators = list.querySelectorAll('.sui-command-separator');
      var focusedIndex = -1;

      function getVisibleItems() {
        return Array.from(list.querySelectorAll('.sui-command-item:not([hidden])'));
      }

      function updateFocus(visibleItems) {
        items.forEach(function(it) { it.classList.remove('focused'); });
        if (focusedIndex >= 0 && focusedIndex < visibleItems.length) {
          visibleItems[focusedIndex].classList.add('focused');
          visibleItems[focusedIndex].scrollIntoView({ block: 'nearest' });
        }
      }

      function filter() {
        var query = input.value.toLowerCase().trim();
        var anyVisible = false;

        items.forEach(function(item) {
          var text = item.textContent.toLowerCase();
          var match = !query || text.indexOf(query) !== -1;
          item.hidden = !match;
          if (match) anyVisible = true;
        });

        // Hide groups with no visible items
        groups.forEach(function(group) {
          var hasVisible = group.querySelector('.sui-command-item:not([hidden])');
          group.hidden = !hasVisible;
        });

        // Hide separators between hidden groups
        separators.forEach(function(sep) {
          var next = sep.nextElementSibling;
          var prev = sep.previousElementSibling;
          var nextHidden = next && next.hidden;
          var prevHidden = prev && prev.hidden;
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
        var visibleItems = getVisibleItems();

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
          var visibleItems = getVisibleItems();
          focusedIndex = visibleItems.indexOf(item);
          updateFocus(visibleItems);
        });
      });

      // Initial focus on first item
      var initial = getVisibleItems();
      if (initial.length > 0) {
        focusedIndex = 0;
        updateFocus(initial);
      }
    });

    // Dialog mode — Cmd+K / Ctrl+K
    document.querySelectorAll('.sui-command-dialog').forEach(function(dialog) {
      var cmd = dialog.querySelector('.sui-command');
      var input = cmd ? cmd.querySelector('.sui-command-input') : null;

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
      var shortcut = dialog.dataset.suiCommandKey || 'k';
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

      // Trigger buttons
      document.querySelectorAll('[data-sui-command-open="' + dialog.id + '"]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          openDialog();
        });
      });
    });
  }

  // =========================================
  // Calendar
  // =========================================
  function initCalendar() {
    var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

    function daysInMonth(year, month) {
      return new Date(year, month + 1, 0).getDate();
    }

    function sameDay(a, b) {
      return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function between(d, start, end) {
      if (!start || !end) return false;
      var t = d.getTime(), s = Math.min(start.getTime(), end.getTime()), e = Math.max(start.getTime(), end.getTime());
      return t > s && t < e;
    }

    function parseDate(str) {
      if (!str) return null;
      if (str === 'today') return new Date(new Date().setHours(0,0,0,0));
      var parts = str.split('-');
      if (parts.length === 3) return new Date(+parts[0], +parts[1] - 1, +parts[2]);
      return null;
    }

    function formatDate(d, includeTime, hour, minute, period) {
      var str = MONTHS[d.getMonth()].substring(0, 3) + ' ' + d.getDate() + ', ' + d.getFullYear();
      if (includeTime) {
        var hh = (hour !== undefined && hour !== null) ? hour : 12;
        var mm = (minute !== undefined && minute !== null) ? minute : 0;
        str += ' ' + pad(hh) + ':' + pad(mm);
        if (period) str += ' ' + period;
      }
      return str;
    }

    document.querySelectorAll('.sui-calendar[data-sui-calendar]').forEach(function(cal) {
      var mode = cal.dataset.suiCalendar || 'single';
      var today = new Date();
      today.setHours(0,0,0,0);

      var minDate = parseDate(cal.dataset.suiMin);
      var maxDate = parseDate(cal.dataset.suiMax);

      var disabledDays = [];
      if (cal.dataset.suiDisabled) {
        cal.dataset.suiDisabled.split(',').forEach(function(s) {
          var d = parseDate(s.trim());
          if (d) disabledDays.push(d);
        });
      }

      function isDisabled(d) {
        for (var i = 0; i < disabledDays.length; i++) {
          if (sameDay(d, disabledDays[i])) return true;
        }
        if (minDate && d < minDate) return true;
        if (maxDate && d > maxDate) return true;
        return false;
      }

      var selected = null;
      var rangeStart = null;
      var rangeEnd = null;
      var defaultPlaceholder = '';
      var viewMode = 'days'; // 'days', 'months', 'years'
      var yearPageStart = 0;

      // Time picker
      var hasTime = cal.hasAttribute('data-sui-calendar-time');
      var is24h = cal.getAttribute('data-sui-calendar-time') === '24h';
      var timeHour = is24h ? 0 : 12, timeMinute = 0, timePeriod = 'AM';
      var timeRow = null, hourInput = null, minuteInput = null, periodBtn = null;

      if (hasTime) {
        timeRow = cal.querySelector('.sui-calendar-time');
        if (!timeRow) {
          timeRow = document.createElement('div');
          timeRow.className = 'sui-calendar-time';

          var label = document.createElement('span');
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

          var sep = document.createElement('span');
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
          var clearBtn = cal.querySelector('[data-sui-calendar-clear]');
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

        var hourMax = is24h ? 23 : 12;
        var hourMin = is24h ? 0 : 1;

        function parseHour(v) {
          var n = parseInt(v, 10);
          if (isNaN(n) || n < 0) n = 0;
          if (n > 23) n = 23;
          if (is24h) return { hour: n };
          // Convert 24h input to 12h + period
          if (n === 0) return { hour: 12, period: 'AM' };
          if (n < 12) return { hour: n, period: 'AM' };
          if (n === 12) return { hour: 12, period: 'PM' };
          return { hour: n - 12, period: 'PM' };
        }
        function clampMinute(v) { var n = parseInt(v, 10); if (isNaN(n) || n < 0) return 0; if (n > 59) return 59; return n; }

        hourInput.addEventListener('blur', function() {
          var result = parseHour(this.value);
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
          cal.dispatchEvent(new CustomEvent('sui-date-select', { detail: { date: selected, hour: timeHour, minute: timeMinute, period: is24h ? null : timePeriod, is24h: is24h } }));
        }
      }

      var monthContainers = cal.querySelectorAll('.sui-calendar-month');
      var isMultiMonth = monthContainers.length > 0;
      if (!isMultiMonth) monthContainers = [cal];

      var viewOffsets = [];
      monthContainers.forEach(function(mc, i) { viewOffsets.push(i); });

      var viewYear = today.getFullYear();
      var viewMonth = today.getMonth();

      var prevBtn = cal.querySelector('[data-sui-calendar-prev]');
      var nextBtn = cal.querySelector('[data-sui-calendar-next]');
      var titleEl = cal.querySelector('.sui-calendar-header .sui-calendar-title');

      function renderDays() {
        viewMode = 'days';
        if (timeRow) timeRow.style.display = '';
        monthContainers.forEach(function(mc, idx) {
          var m = viewMonth + viewOffsets[idx];
          var y = viewYear;
          while (m > 11) { m -= 12; y++; }
          while (m < 0) { m += 12; y--; }

          // Title
          var t = mc.querySelector('.sui-calendar-title');
          if (t) {
            if (idx === 0 && !isMultiMonth && t === titleEl) {
              t.textContent = MONTHS[m] + ' ' + y;
              t.style.cursor = 'pointer';
            } else {
              t.textContent = MONTHS[m] + ' ' + y;
            }
          }

          var grid = mc.querySelector('.sui-calendar-grid');
          if (!grid) return;
          grid.innerHTML = '';
          grid.style.gridTemplateColumns = 'repeat(7, 1fr)';

          DAYS.forEach(function(d) {
            var lbl = document.createElement('div');
            lbl.className = 'sui-calendar-day-label';
            lbl.textContent = d;
            grid.appendChild(lbl);
          });

          var firstDay = new Date(y, m, 1).getDay();
          var total = daysInMonth(y, m);

          var prevTotal = daysInMonth(y, m - 1);
          for (var p = firstDay - 1; p >= 0; p--) {
            var btn = document.createElement('button');
            btn.className = 'sui-calendar-day outside';
            btn.textContent = prevTotal - p;
            btn.type = 'button';
            btn.disabled = true;
            grid.appendChild(btn);
          }

          for (var d = 1; d <= total; d++) {
            var date = new Date(y, m, d);
            var btn = document.createElement('button');
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
                  var detail = { date: dt };
                  if (hasTime) { detail.hour = timeHour; detail.minute = timeMinute; detail.period = timePeriod; }
                  cal.dispatchEvent(new CustomEvent('sui-date-select', { detail: detail }));
                } else if (mode === 'range') {
                  if (!rangeStart || rangeEnd) {
                    rangeStart = dt;
                    rangeEnd = null;
                  } else {
                    if (dt < rangeStart) { rangeEnd = rangeStart; rangeStart = dt; }
                    else { rangeEnd = dt; }
                    cal.dispatchEvent(new CustomEvent('sui-date-select', { detail: { start: rangeStart, end: rangeEnd } }));
                  }
                }
                renderDays();
              });
            })(date);

            grid.appendChild(btn);
          }

          var totalCells = firstDay + total;
          var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
          for (var n = 1; n <= remaining; n++) {
            var btn = document.createElement('button');
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
        var grid = monthContainers[0].querySelector('.sui-calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';

        for (var m = 0; m < 12; m++) {
          var btn = document.createElement('button');
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
        var start = yearPageStart;
        var end = start + 11;
        if (titleEl) {
          titleEl.textContent = start + ' – ' + end;
          titleEl.style.cursor = 'default';
        }

        var grid = monthContainers[0].querySelector('.sui-calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';

        for (var yr = start; yr <= end; yr++) {
          var btn = document.createElement('button');
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
        var clearBtn = cal.querySelector('[data-sui-calendar-clear]');
        if (clearBtn) {
          var hasSelection = mode === 'single' ? !!selected : !!(rangeStart || rangeEnd);
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
          cal.dispatchEvent(new CustomEvent('sui-date-clear'));
          renderDays();
        });
      });

      renderDays();

      // Date Picker integration
      var picker = cal.closest('.sui-datepicker');
      if (picker) {
        var trigger = picker.querySelector('.sui-datepicker-trigger');
        var popover = picker.querySelector('.sui-datepicker-popover');
        var placeholderEl = trigger ? trigger.querySelector('.sui-datepicker-placeholder') : null;
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
          var span = trigger.querySelector('.sui-datepicker-value') || trigger.querySelector('.sui-datepicker-placeholder');
          if (mode === 'single' && e.detail.date) {
            var text = formatDate(e.detail.date, hasTime, e.detail.hour, e.detail.minute, e.detail.is24h ? null : e.detail.period);
            if (span) { span.textContent = text; span.className = 'sui-datepicker-value'; }
            if (!hasTime && popover) popover.classList.remove('open');
          } else if (mode === 'range' && e.detail.start && e.detail.end) {
            var text = formatDate(e.detail.start) + ' – ' + formatDate(e.detail.end);
            if (span) { span.textContent = text; span.className = 'sui-datepicker-value'; }
            if (popover) popover.classList.remove('open');
          }
          updateClear();
        });

        cal.addEventListener('sui-date-clear', function() {
          var span = trigger.querySelector('.sui-datepicker-value') || trigger.querySelector('.sui-datepicker-placeholder');
          if (span) { span.textContent = defaultPlaceholder; span.className = 'sui-datepicker-placeholder'; }
          updateClear();
        });
      }
    });
  }

  // =========================================
  // Standalone Time Picker
  // =========================================
  function initTimePicker() {
    document.querySelectorAll('.sui-timepicker[data-sui-timepicker]').forEach(function(tp) {
      var is24h = tp.getAttribute('data-sui-timepicker') === '24h';
      var hourMax = is24h ? 23 : 12;
      var hourMin = is24h ? 0 : 1;
      var tHour = is24h ? 0 : 12, tMinute = 0, tPeriod = 'AM';

      var hInput = tp.querySelectorAll('.sui-calendar-time-input')[0];
      var mInput = tp.querySelectorAll('.sui-calendar-time-input')[1];
      var pBtn = tp.querySelector('.sui-calendar-time-period');

      if (!hInput || !mInput) {
        // Auto-build the UI
        var label = document.createElement('span');
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

        var sep = document.createElement('span');
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
        var n = parseInt(v, 10);
        if (isNaN(n) || n < 0) n = 0;
        if (n > 23) n = 23;
        if (is24h) return { hour: n };
        if (n === 0) return { hour: 12, period: 'AM' };
        if (n < 12) return { hour: n, period: 'AM' };
        if (n === 12) return { hour: 12, period: 'PM' };
        return { hour: n - 12, period: 'PM' };
      }
      function clampM(v) { var n = parseInt(v, 10); if (isNaN(n) || n < 0) return 0; if (n > 59) return 59; return n; }

      function fireChange() {
        tp.dispatchEvent(new CustomEvent('sui-time-change', { detail: { hour: tHour, minute: tMinute, period: is24h ? null : tPeriod, is24h: is24h } }));
      }

      hInput.addEventListener('blur', function() {
        var result = parseH(this.value);
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
  function initMenubar() {
    var menubarOpen = false;

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
      var trigger = e.target.closest('.sui-menubar-trigger');
      if (trigger) {
        var menu = trigger.closest('.sui-menubar-menu');
        if (menu.classList.contains('open')) {
          closeAllMenus(menu.closest('.sui-menubar'));
        } else {
          openMenu(menu);
        }
        e.stopPropagation();
        return;
      }

      // Submenu triggers
      var subTrigger = e.target.closest('.sui-menubar-sub-trigger');
      if (subTrigger) {
        var sub = subTrigger.closest('.sui-menubar-sub');
        var isOpen = sub.classList.contains('open');
        // Close sibling subs
        sub.parentElement.querySelectorAll('.sui-menubar-sub.open').forEach(function(s) {
          s.classList.remove('open');
        });
        if (!isOpen) sub.classList.add('open');
        e.stopPropagation();
        return;
      }

      // Clicking a menubar item closes the menu
      var item = e.target.closest('.sui-menubar-item');
      if (item && item.closest('.sui-menubar')) {
        var bar = item.closest('.sui-menubar');
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
      var trigger = e.target.closest ? e.target.closest('.sui-menubar-trigger') : null;
      if (!trigger) return;
      var menu = trigger.closest('.sui-menubar-menu');
      if (menu && !menu.classList.contains('open')) {
        openMenu(menu);
      }
    }, true);

    // Hover to open submenus
    document.querySelectorAll('.sui-menubar-sub').forEach(function(sub) {
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

    // Escape closes menubar
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.sui-menubar').forEach(function(bar) {
          closeAllMenus(bar);
        });
      }
    });
  }

  // =========================================
  // Combobox
  // =========================================
  function initCombobox() {
    document.querySelectorAll('.sui-combobox').forEach(function(combo) {
      var trigger = combo.querySelector('.sui-combobox-trigger');
      var content = combo.querySelector('.sui-combobox-content');
      var input = combo.querySelector('.sui-combobox-input');
      var items = combo.querySelectorAll('.sui-combobox-item');
      var valueEl = combo.querySelector('.sui-combobox-value');
      var chipsEl = combo.querySelector('.sui-combobox-chips');
      var emptyEl = combo.querySelector('.sui-combobox-empty');
      var clearBtn = combo.querySelector('.sui-combobox-clear');
      var isMultiple = combo.classList.contains('sui-combobox-multiple');
      var placeholder = valueEl ? valueEl.textContent : '';
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
        var q = query.toLowerCase();
        var visibleCount = 0;
        items.forEach(function(item) {
          var text = item.textContent.toLowerCase();
          var match = !q || text.indexOf(q) !== -1;
          item.style.display = match ? '' : 'none';
          if (match) visibleCount++;
        });
        // Show/hide groups based on visible children
        combo.querySelectorAll('.sui-combobox-label').forEach(function(label) {
          var next = label.nextElementSibling;
          var hasVisible = false;
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
        var hasSelection = combo.querySelectorAll('.sui-combobox-item.selected').length > 0;
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
        var selectedItems = combo.querySelectorAll('.sui-combobox-item.selected');
        if (selectedItems.length === 0) {
          var ph = document.createElement('span');
          ph.className = 'placeholder';
          ph.textContent = placeholder;
          chipsEl.appendChild(ph);
          updateClear();
          return;
        }
        selectedItems.forEach(function(item) {
          var chip = document.createElement('span');
          chip.className = 'sui-combobox-chip';
          chip.textContent = item.getAttribute('data-value') || item.textContent.trim();
          var remove = document.createElement('span');
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
        if (e.key === 'Escape') close();
      });

      // Initialize clear button visibility for pre-selected items
      updateClear();
    });
  }

  // =========================================
  // Resizable
  // =========================================
  function initResizable() {
    document.querySelectorAll('.sui-resizable').forEach(function(container) {
      var isVertical = container.classList.contains('sui-resizable-vertical');
      var handles = container.querySelectorAll(':scope > .sui-resizable-handle');

      // Initialize panels with flex-grow from data-size or equal split
      var panels = Array.from(container.querySelectorAll(':scope > .sui-resizable-panel'));
      panels.forEach(function(p) {
        var size = parseFloat(p.getAttribute('data-size')) || (100 / panels.length);
        p.style.flexGrow = size;
      });

      handles.forEach(function(handle) {
        var prevPanel = handle.previousElementSibling;
        var nextPanel = handle.nextElementSibling;
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
          var prevG = getGrow(prevPanel);
          var nextG = getGrow(nextPanel);
          var total = prevG + nextG;
          var prevMin = getMin(prevPanel);
          var nextMin = getMin(nextPanel);
          var newPrev = Math.max(prevMin, Math.min(total - nextMin, prevG + delta));
          var newNext = total - newPrev;
          prevPanel.style.flexGrow = newPrev;
          nextPanel.style.flexGrow = newNext;
        }

        function onPointerDown(e) {
          e.preventDefault();
          handle.focus();
          handle.classList.add('dragging');

          var prevG = getGrow(prevPanel);
          var nextG = getGrow(nextPanel);
          var totalG = prevG + nextG;

          // Measure actual pixel sizes of the two panels
          var prevPx = isVertical ? prevPanel.offsetHeight : prevPanel.offsetWidth;
          var nextPx = isVertical ? nextPanel.offsetHeight : nextPanel.offsetWidth;
          var pairPx = prevPx + nextPx;
          var startPos = isVertical ? e.clientY : e.clientX;

          var prevMin = getMin(prevPanel);
          var nextMin = getMin(nextPanel);

          function onPointerMove(ev) {
            var pos = isVertical ? ev.clientY : ev.clientX;
            var delta = pos - startPos;
            // Clamp delta so panels stay within 0..pairPx range
            delta = Math.max(-prevPx, Math.min(nextPx, delta));
            var ratio = pairPx > 0 ? delta / pairPx : 0;
            var newPrev = Math.max(prevMin, Math.min(totalG - nextMin, prevG + ratio * totalG));
            var newNext = totalG - newPrev;
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
          var step = e.shiftKey ? 10 : 2;
          var growKey = isVertical ? 'ArrowDown' : 'ArrowRight';
          var shrinkKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

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
  function initSliders() {
    document.querySelectorAll('.sui-slider').forEach(slider => {
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
  function initOtp() {
    document.querySelectorAll('.sui-otp[data-sui-otp]').forEach(function(otp) {
      if (otp.dataset.suiOtpDisabled !== undefined) return;

      var slots = otp.querySelectorAll('.sui-otp-slot');
      var len = slots.length;
      var pattern = otp.dataset.suiOtpPattern || 'digits'; // "digits" or "alphanumeric"
      var regex = pattern === 'alphanumeric' ? /^[a-zA-Z0-9]$/ : /^[0-9]$/;

      // Create hidden input
      var input = document.createElement('input');
      input.className = 'sui-otp-input';
      input.setAttribute('inputmode', pattern === 'alphanumeric' ? 'text' : 'numeric');
      input.setAttribute('autocomplete', 'one-time-code');
      input.setAttribute('maxlength', len);
      input.setAttribute('aria-label', 'One-time code');
      otp.appendChild(input);

      function updateSlots() {
        var val = input.value;
        slots.forEach(function(slot, i) {
          slot.textContent = val[i] || '';
          slot.classList.toggle('sui-otp-filled', !!val[i]);
          slot.classList.remove('sui-otp-active');
        });
        // Show cursor on current slot
        var pos = Math.min(val.length, len - 1);
        if (document.activeElement === input && val.length < len) {
          slots[pos].classList.add('sui-otp-active');
        } else if (document.activeElement === input && val.length === len) {
          slots[len - 1].classList.add('sui-otp-active');
        }
      }

      input.addEventListener('input', function() {
        // Filter to allowed characters
        var filtered = '';
        for (var i = 0; i < input.value.length && filtered.length < len; i++) {
          if (regex.test(input.value[i])) {
            filtered += pattern === 'alphanumeric' ? input.value[i].toUpperCase() : input.value[i];
          }
        }
        input.value = filtered;
        updateSlots();

        // Dispatch event when complete
        if (filtered.length === len) {
          otp.dispatchEvent(new CustomEvent('sui-otp-complete', { detail: { value: filtered } }));
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
          var pos = Math.min(i, input.value.length);
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
  function initToggleGroups() {
    document.querySelectorAll('.sui-toggle-group[data-sui-toggle]').forEach(function(group) {
      var mode = group.dataset.suiToggle; // "single" or "multi"
      var items = group.querySelectorAll('.sui-toggle-group-item:not([disabled])');

      items.forEach(function(item) {
        item.addEventListener('click', function() {
          if (mode === 'single') {
            var wasActive = item.classList.contains('active');
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
  function carousel(selector) {
    const el = document.querySelector(selector);
    if (!el) return null;

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
      for (var i = totalReal - 1; i >= totalReal - visible; i--) {
        var clone = realItems[i].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.insertBefore(clone, track.firstChild);
      }
      for (var i = 0; i < visible; i++) {
        var clone = realItems[i].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      }
      cloneCount = visible;
    }

    var allItems = Array.from(track.children);

    function moveTo(displayIndex, animate) {
      if (animate === false) track.style.transition = 'none';

      if (isVertical) {
        var vh = track.parentElement.offsetHeight;
        var itemH = vh / visible;
        allItems.forEach(function(it) { it.style.height = itemH + 'px'; });
        track.style.transform = 'translateY(-' + (displayIndex * itemH) + 'px)';
      } else {
        var item = allItems[displayIndex];
        var base = allItems[0];
        var px = (item && base) ? item.offsetLeft - base.offsetLeft : 0;
        track.style.transform = 'translateX(-' + px + 'px)';
      }

      if (animate === false) {
        track.offsetHeight; // force reflow
        track.style.transition = '';
      }
    }

    function update(animate) {
      var displayIndex = current + cloneCount;
      moveTo(displayIndex, animate);

      var dotIndex = ((current % totalReal) + totalReal) % totalReal;
      dots.forEach(function(d, i) { d.classList.toggle('active', i === dotIndex); });

      if (!isLoop) {
        if (prevBtn) prevBtn.disabled = current <= 0;
        if (nextBtn) nextBtn.disabled = current >= maxIndex;
      }

      // Seamless jump after transition ends
      if (isSeamless && !jumping) {
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
      if (isLoop) {
        current = ((index % totalReal) + totalReal) % totalReal;
      } else {
        current = Math.max(0, Math.min(index, maxIndex));
      }
      update(true);
    }

    function next() {
      if (jumping) return;
      if (isSeamless) {
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
      if (isSeamless) {
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

    // Autoplay
    function startAutoplay() {
      if (autoplayMs > 0) {
        autoplayTimer = setInterval(next, autoplayMs);
      }
    }

    function resetAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
      startAutoplay();
    }

    if (autoplayMs > 0) {
      el.addEventListener('mouseenter', function() { if (autoplayTimer) clearInterval(autoplayTimer); });
      el.addEventListener('mouseleave', function() { startAutoplay(); });
    }

    update(false);
    startAutoplay();

    return { next: next, prev: prev, goTo: goTo, current: function() { return current; } };
  }

  function initCarousels() {
    document.querySelectorAll('.sui-carousel').forEach(el => {
      if (!el.id) return;
      carousel('#' + el.id);
    });
  }

  // =========================================
  // Charts
  // =========================================
  function initCharts() {
    // Bar charts — set heights from data-value
    document.querySelectorAll('.sui-chart-bar-col').forEach(function(col) {
      // Skip grouped bars (handled separately)
      if (col.querySelector('.sui-chart-bar-group')) return;
      var fill = col.querySelector('.sui-chart-bar-fill');
      if (!fill) return;
      var val = parseFloat(fill.getAttribute('data-value'));
      if (isNaN(val)) return;
      var max = parseFloat(fill.getAttribute('data-max')) || 100;
      var pct = Math.min(100, Math.max(0, (val / max) * 100));
      fill.style.height = pct + '%';
    });

    // Grouped bars — set heights for each fill in a group
    document.querySelectorAll('.sui-chart-bar-group').forEach(function(group) {
      group.querySelectorAll('.sui-chart-bar-fill').forEach(function(fill) {
        var val = parseFloat(fill.getAttribute('data-value'));
        if (isNaN(val)) return;
        var max = parseFloat(fill.getAttribute('data-max')) || 100;
        var pct = Math.min(100, Math.max(0, (val / max) * 100));
        fill.style.height = pct + '%';
      });
    });

    // Horizontal bars
    document.querySelectorAll('.sui-chart-bar-row').forEach(function(row) {
      var fill = row.querySelector('.sui-chart-bar-fill');
      if (!fill) return;
      var val = parseFloat(fill.getAttribute('data-value'));
      if (isNaN(val)) return;
      var max = parseFloat(fill.getAttribute('data-max')) || 100;
      var pct = Math.min(100, Math.max(0, (val / max) * 100));
      fill.style.width = pct + '%';
    });

    // Stacked bars
    document.querySelectorAll('.sui-chart-bar-track-stacked').forEach(function(track) {
      var fills = track.querySelectorAll('.sui-chart-bar-fill');
      var total = 0;
      fills.forEach(function(f) { total += parseFloat(f.getAttribute('data-value')) || 0; });
      var max = parseFloat(track.getAttribute('data-max')) || total || 100;
      fills.forEach(function(f) {
        var v = parseFloat(f.getAttribute('data-value')) || 0;
        f.style.height = ((v / max) * 100) + '%';
      });
    });

    // Donut / Pie charts — build conic-gradient from data-segments
    document.querySelectorAll('.sui-chart-donut[data-segments]').forEach(function(donut) {
      try {
        var segments = JSON.parse(donut.getAttribute('data-segments'));
        var total = 0;
        segments.forEach(function(s) { total += s.value; });
        var stops = [];
        var cumulative = 0;
        segments.forEach(function(s) {
          var start = (cumulative / total) * 100;
          cumulative += s.value;
          var end = (cumulative / total) * 100;
          stops.push(s.color + ' ' + start + '% ' + end + '%');
        });
        donut.style.background = 'conic-gradient(' + stops.join(', ') + ')';
      } catch(e) {}
    });

    // Line / Area charts — measure path length for animation
    document.querySelectorAll('.sui-chart-line-wrap .chart-line').forEach(function(path) {
      if (path.getTotalLength) {
        var len = path.getTotalLength();
        path.style.setProperty('--line-length', len);
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
      }
    });

    // SVG dot tooltips
    document.querySelectorAll('.sui-chart-line-wrap').forEach(function(wrap) {
      var dots = wrap.querySelectorAll('.chart-dot[data-value]');
      if (!dots.length) return;

      var tip = document.createElement('div');
      tip.className = 'sui-chart-tooltip';
      wrap.appendChild(tip);

      dots.forEach(function(dot) {
        dot.addEventListener('mouseenter', function() {
          var val = dot.getAttribute('data-value');
          tip.textContent = val;
          var svg = wrap.querySelector('svg');
          var svgRect = svg.getBoundingClientRect();
          var wrapRect = wrap.getBoundingClientRect();
          var cx = parseFloat(dot.getAttribute('cx'));
          var cy = parseFloat(dot.getAttribute('cy'));
          var viewBox = svg.viewBox.baseVal;
          var scaleX = svgRect.width / viewBox.width;
          var scaleY = svgRect.height / viewBox.height;
          var px = (cx * scaleX) + (svgRect.left - wrapRect.left);
          var py = (cy * scaleY) + (svgRect.top - wrapRect.top);
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

  function initDataTables() {
    document.querySelectorAll('.sui-datatable').forEach(function(dt) {
      var table = dt.querySelector('.sui-table');
      if (!table) return;

      var tbody = table.querySelector('tbody');
      if (!tbody) return;

      var allRows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
      var filteredRows = allRows.slice();
      var currentPage = 1;

      // Per-page selector
      var perpageSelect = dt.querySelector('.sui-datatable-perpage select');
      var perPage = perpageSelect ? parseInt(perpageSelect.value, 10) : allRows.length;

      // Info & pagination elements
      var infoEl = dt.querySelector('.sui-datatable-info');
      var paginationEl = dt.querySelector('.sui-datatable-pagination');

      // Search input
      var searchInput = dt.querySelector('.sui-datatable-search input');

      function render() {
        var total = filteredRows.length;
        var totalPages = perPage > 0 ? Math.ceil(total / perPage) : 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        var start = (currentPage - 1) * perPage;
        var end = Math.min(start + perPage, total);

        // Hide all rows, then show only current page
        allRows.forEach(function(row) { row.style.display = 'none'; });
        for (var i = start; i < end; i++) {
          filteredRows[i].style.display = '';
        }

        // Show empty message if no results
        var emptyRow = tbody.querySelector('.sui-datatable-empty-row');
        if (total === 0) {
          if (!emptyRow) {
            emptyRow = document.createElement('tr');
            emptyRow.className = 'sui-datatable-empty-row';
            var td = document.createElement('td');
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

          var prevBtn = document.createElement('button');
          prevBtn.textContent = '\u2039';
          prevBtn.disabled = currentPage <= 1;
          prevBtn.addEventListener('click', function() {
            if (currentPage > 1) { currentPage--; render(); }
          });
          paginationEl.appendChild(prevBtn);

          for (var p = 1; p <= totalPages; p++) {
            (function(page) {
              var btn = document.createElement('button');
              btn.textContent = page;
              if (page === currentPage) btn.className = 'active';
              btn.addEventListener('click', function() {
                currentPage = page;
                render();
              });
              paginationEl.appendChild(btn);
            })(p);
          }

          var nextBtn = document.createElement('button');
          nextBtn.textContent = '\u203A';
          nextBtn.disabled = currentPage >= totalPages;
          nextBtn.addEventListener('click', function() {
            if (currentPage < totalPages) { currentPage++; render(); }
          });
          paginationEl.appendChild(nextBtn);
        }
      }

      // Search / filter
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          var query = searchInput.value.toLowerCase().trim();
          filteredRows = allRows.filter(function(row) {
            return row.textContent.toLowerCase().indexOf(query) !== -1;
          });
          currentPage = 1;
          render();
        });
      }

      // Per-page change
      if (perpageSelect) {
        perpageSelect.addEventListener('change', function() {
          perPage = parseInt(perpageSelect.value, 10);
          currentPage = 1;
          render();
        });
      }

      // Sortable headers
      var ths = table.querySelectorAll('th[data-sort]');
      ths.forEach(function(th) {
        th.addEventListener('click', function() {
          var col = th.getAttribute('data-sort');
          var colIndex = Array.prototype.indexOf.call(th.parentElement.children, th);
          var type = col; // 'string' or 'number'
          var dir = 'asc';

          if (th.classList.contains('sort-asc')) {
            dir = 'desc';
          }

          // Reset all headers
          ths.forEach(function(h) { h.classList.remove('sort-asc', 'sort-desc'); });
          th.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc');

          filteredRows.sort(function(a, b) {
            var aText = a.children[colIndex] ? a.children[colIndex].textContent.trim() : '';
            var bText = b.children[colIndex] ? b.children[colIndex].textContent.trim() : '';

            if (type === 'number') {
              var aNum = parseFloat(aText.replace(/[^0-9.\-]/g, '')) || 0;
              var bNum = parseFloat(bText.replace(/[^0-9.\-]/g, '')) || 0;
              return dir === 'asc' ? aNum - bNum : bNum - aNum;
            }

            return dir === 'asc' ? aText.localeCompare(bText) : bText.localeCompare(aText);
          });

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

  function initDragDrop() {
    // ── Sortable Lists ──
    document.querySelectorAll('.sui-sortable').forEach(function(list) {
      var dragItem = null;

      list.querySelectorAll('.sui-sortable-item').forEach(function(item) {
        var handle = item.querySelector('.sui-sortable-handle');
        var dragTarget = handle || item;

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
          var items = Array.prototype.slice.call(list.children);
          var fromIndex = items.indexOf(dragItem);
          var toIndex = items.indexOf(item);
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
    document.querySelectorAll('.sui-kanban').forEach(function(kanban) {
      var dragCard = null;

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
          var afterEl = getDragAfterElement(col, e.clientY);
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
      var els = Array.prototype.slice.call(
        container.querySelectorAll('.sui-kanban-card:not(.dragging)')
      );
      var closest = null;
      var closestOffset = Number.NEGATIVE_INFINITY;
      els.forEach(function(el) {
        var box = el.getBoundingClientRect();
        var offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closestOffset) {
          closestOffset = offset;
          closest = el;
        }
      });
      return closest;
    }

    // ── Drop Zone ──
    document.querySelectorAll('.sui-dropzone').forEach(function(zone) {
      // Click-to-upload: create hidden file input
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.style.display = 'none';
      zone.appendChild(fileInput);

      zone.addEventListener('click', function(e) {
        if (e.target.closest('.sui-dropzone-file-remove')) return;
        fileInput.click();
      });

      fileInput.addEventListener('change', function() {
        var files = fileInput.files;
        if (!files.length) return;
        var fileList = zone.querySelector('.sui-dropzone-files');
        if (!fileList) {
          fileList = document.createElement('div');
          fileList.className = 'sui-dropzone-files';
          zone.appendChild(fileList);
        }
        Array.prototype.slice.call(files).forEach(function(file) {
          var item = document.createElement('div');
          item.className = 'sui-dropzone-file';
          item.innerHTML = '<span>' + file.name + '</span><button class="sui-dropzone-file-remove" type="button">&times;</button>';
          item.querySelector('.sui-dropzone-file-remove').addEventListener('click', function(ev) {
            ev.stopPropagation();
            item.remove();
          });
          fileList.appendChild(item);
        });
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
        var files = e.dataTransfer.files;
        if (!files.length) return;
        var fileList = zone.querySelector('.sui-dropzone-files');
        if (!fileList) {
          fileList = document.createElement('div');
          fileList.className = 'sui-dropzone-files';
          zone.appendChild(fileList);
        }
        Array.prototype.slice.call(files).forEach(function(file) {
          var item = document.createElement('div');
          item.className = 'sui-dropzone-file';
          item.innerHTML = '<span>' + file.name + '</span><button class="sui-dropzone-file-remove" type="button">&times;</button>';
          item.querySelector('.sui-dropzone-file-remove').addEventListener('click', function(ev) {
            ev.stopPropagation();
            item.remove();
          });
          fileList.appendChild(item);
        });
      });
    });
  }

  // =========================================
  // Sidebar — collapsible toggle
  // =========================================
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-sidebar-toggle]');
    if (!btn) return;
    var sidebar = btn.closest('.sui-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('sui-sidebar-collapsed');
    }
  });

  function sidebar(selector) {
    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return null;

    function collapse() { el.classList.add('sui-sidebar-collapsed'); }
    function expand() { el.classList.remove('sui-sidebar-collapsed'); }
    function toggle() { el.classList.toggle('sui-sidebar-collapsed'); }
    function isCollapsed() { return el.classList.contains('sui-sidebar-collapsed'); }

    return { collapse: collapse, expand: expand, toggle: toggle, isCollapsed: isCollapsed, el: el };
  }

  // =========================================
  // Rating
  // =========================================
  function ratingIsHalf(star, e) {
    var rect = star.getBoundingClientRect();
    return e.clientX < rect.left + rect.width / 2;
  }

  function ratingEnsureDualSvg(star) {
    var svgs = star.querySelectorAll('svg');
    if (svgs.length < 2) {
      var clone = svgs[0].cloneNode(true);
      star.appendChild(clone);
    }
  }

  function ratingResetSvg(star) {
    var svgs = star.querySelectorAll('svg');
    if (svgs.length > 1) {
      for (var i = svgs.length - 1; i > 0; i--) { svgs[i].remove(); }
    }
  }

  document.addEventListener('click', function(e) {
    var star = e.target.closest('.sui-rating:not(.sui-rating-readonly) .sui-rating-star');
    if (!star) return;
    var rating = star.closest('.sui-rating');
    var stars = Array.from(rating.querySelectorAll('.sui-rating-star'));
    var index = stars.indexOf(star);
    var allowHalf = rating.classList.contains('sui-rating-half');
    var isHalf = allowHalf && ratingIsHalf(star, e);
    var value = isHalf ? index + 0.5 : index + 1;
    stars.forEach(function(s, i) {
      s.classList.remove('active', 'half', 'hover', 'hover-half');
      ratingResetSvg(s);
      if (i < index) {
        s.classList.add('active');
      } else if (i === index) {
        if (isHalf) {
          ratingEnsureDualSvg(s);
          s.classList.add('half');
        } else {
          s.classList.add('active');
        }
      }
    });
    rating.setAttribute('data-value', value);
    rating.dispatchEvent(new CustomEvent('sui-rating-change', { detail: { value: value } }));
  });

  document.addEventListener('mousemove', function(e) {
    var star = e.target.closest('.sui-rating:not(.sui-rating-readonly) .sui-rating-star');
    if (!star) return;
    var rating = star.closest('.sui-rating');
    var stars = Array.from(rating.querySelectorAll('.sui-rating-star'));
    var index = stars.indexOf(star);
    var allowHalf = rating.classList.contains('sui-rating-half');
    var isHalf = allowHalf && ratingIsHalf(star, e);
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
    var star = e.target.closest('.sui-rating:not(.sui-rating-readonly) .sui-rating-star');
    if (!star) return;
    var rating = star.closest('.sui-rating');
    var stars = Array.from(rating.querySelectorAll('.sui-rating-star'));
    stars.forEach(function(s) {
      s.classList.remove('hover', 'hover-half');
      if (!s.classList.contains('half')) { ratingResetSvg(s); }
    });
  });

  return { modal, sheet, toast, carousel, sidebar };
})();

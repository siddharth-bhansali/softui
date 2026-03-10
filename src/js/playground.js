(function () {
  'use strict';

  var editor = document.getElementById('pg-editor');
  var iframe = document.getElementById('pg-preview');
  var searchInput = document.getElementById('pg-snippet-search');
  var searchClear = document.getElementById('pg-search-clear');
  var snippetData = window.__PG_SNIPPETS__ || {};
  var debounceTimer = null;
  var previewDark = false;

  // Default starter code
  var DEFAULT_CODE =
    '<div class="sui-d-flex sui-justify-center sui-align-center" style="min-height:100vh;">\n' +
    '  <div class="sui-card sui-raised sui-p-5 sui-text-center" style="max-width:380px;">\n' +
    '    <h3>Hello SoftUI</h3>\n' +
    '    <p class="sui-text-muted sui-mt-2 sui-mb-3">\n' +
    '      A neumorphic card with a soft raised shadow.\n' +
    '    </p>\n' +
    '    <button class="sui-btn sui-btn-primary">Get Started</button>\n' +
    '    <button class="sui-btn sui-btn-outline sui-ml-2">Learn More</button>\n' +
    '  </div>\n' +
    '</div>';

  // ----- Init -----

  function init() {
    var hashCode = getCodeFromHash();
    editor.value = hashCode || DEFAULT_CODE;
    updatePreview();

    editor.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updatePreview, 300);
    });

    editor.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = this.selectionStart;
        var end = this.selectionEnd;
        this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updatePreview, 300);
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterSnippets();
        toggleClearBtn();
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', function () {
        searchInput.value = '';
        filterSnippets();
        toggleClearBtn();
        searchInput.focus();
      });
    }

    initResizer();
    initDragAndDrop();
  }

  // ----- Preview -----

  function updatePreview() {
    var code = editor.value;
    var themeAttr = previewDark ? ' data-theme="dark"' : '';
    var doc =
      '<!DOCTYPE html>' +
      '<html lang="en"' + themeAttr + '>' +
      '<head>' +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">' +
      '<link rel="stylesheet" href="/softui.css">' +
      '<style>body{margin:0;padding:16px;font-family:var(--sui-font);background:var(--sui-bg);color:var(--sui-text);}</style>' +
      '</head>' +
      '<body>' +
      code +
      '<script src="/softui.js"><\/script>' +
      '</body></html>';
    iframe.srcdoc = doc;
  }

  // ----- Insert code helper -----

  function insertCode(code) {
    if (!code) return;
    var start = editor.selectionStart;
    var before = editor.value.substring(0, start);
    var after = editor.value.substring(editor.selectionEnd);
    var prefix = before.length > 0 && !before.endsWith('\n') ? '\n\n' : '';
    var suffix = after.length > 0 && !after.startsWith('\n') ? '\n' : '';
    editor.value = before + prefix + code + suffix + after;
    var newPos = start + prefix.length + code.length;
    editor.selectionStart = editor.selectionEnd = newPos;
    editor.focus();
    clearTimeout(debounceTimer);
    updatePreview();
  }

  // ----- Snippets -----

  window.insertSnippet = function (id) {
    var code = findSnippetCode(id);
    insertCode(code);
  };

  window.insertVariant = function (id, variantIdx) {
    var snippet = findSnippet(id);
    if (snippet && snippet.variants && snippet.variants[variantIdx]) {
      insertCode(snippet.variants[variantIdx].code);
    }
  };

  window.pgToggleVariants = function (el) {
    var item = el.closest('.pg-snippet-item');
    if (item) item.classList.toggle('expanded');
  };

  function findSnippet(id) {
    for (var cat in snippetData) {
      var items = snippetData[cat];
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) return items[i];
      }
    }
    return null;
  }

  function findSnippetCode(id) {
    var s = findSnippet(id);
    return s ? s.code : null;
  }

  function filterSnippets() {
    var query = searchInput.value.toLowerCase().trim();
    var cats = document.querySelectorAll('.pg-snippets-cat');
    var items = document.querySelectorAll('.pg-snippet-item');

    items.forEach(function (item) {
      var label = item.querySelector('.pg-snippet-label');
      var text = label ? label.textContent.toLowerCase() : '';
      var children = item.querySelectorAll('.pg-snippet-child-label');
      var childMatch = false;
      children.forEach(function (c) {
        if (c.textContent.toLowerCase().indexOf(query) !== -1) childMatch = true;
      });
      var match = !query || text.indexOf(query) !== -1 || childMatch;
      item.classList.toggle('hidden', !match);
      // Auto-expand parent when a child matches the search
      if (childMatch && query && !text.match(query)) {
        item.classList.add('expanded');
      } else if (!query) {
        item.classList.remove('expanded');
      }
    });

    cats.forEach(function (cat) {
      var next = cat.nextElementSibling;
      var hasVisible = false;
      while (next && !next.classList.contains('pg-snippets-cat')) {
        if (next.classList.contains('pg-snippet-item') && !next.classList.contains('hidden')) {
          hasVisible = true;
        }
        next = next.nextElementSibling;
      }
      cat.classList.toggle('hidden', !hasVisible);
    });
  }

  function toggleClearBtn() {
    if (searchClear) {
      searchClear.classList.toggle('visible', searchInput.value.length > 0);
    }
  }

  // ----- Drag and Drop -----

  function initDragAndDrop() {
    var items = document.querySelectorAll('.pg-snippet-item[draggable="true"]');

    items.forEach(function (item) {
      item.addEventListener('dragstart', function (e) {
        var id = item.getAttribute('data-snippet-id');
        var code = findSnippetCode(id);
        if (code) {
          e.dataTransfer.setData('text/plain', code);
          e.dataTransfer.effectAllowed = 'copy';
          item.classList.add('dragging');
        }
      });

      item.addEventListener('dragend', function () {
        item.classList.remove('dragging');
        editor.classList.remove('drag-over');
      });
    });

    // Editor drop target
    editor.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      editor.classList.add('drag-over');
    });

    editor.addEventListener('dragleave', function () {
      editor.classList.remove('drag-over');
    });

    editor.addEventListener('drop', function (e) {
      e.preventDefault();
      editor.classList.remove('drag-over');
      var code = e.dataTransfer.getData('text/plain');
      if (code) {
        insertCode(code);
      }
    });
  }

  // ----- Toolbar actions -----

  window.pgReset = function () {
    editor.value = DEFAULT_CODE;
    updatePreview();
    editor.focus();
  };

  window.pgTogglePreviewTheme = function () {
    previewDark = !previewDark;
    var btn = document.getElementById('pg-theme-toggle');
    var moonIcon = btn.querySelector('.pg-icon-moon');
    var sunIcon = btn.querySelector('.pg-icon-sun');
    var label = document.getElementById('pg-theme-label');
    if (previewDark) {
      moonIcon.style.display = '';
      sunIcon.style.display = 'none';
      if (label) label.textContent = 'Dark Preview';
    } else {
      moonIcon.style.display = 'none';
      sunIcon.style.display = '';
      if (label) label.textContent = 'Light Preview';
    }
    updatePreview();
  };

  window.pgShare = function () {
    var code = editor.value;
    var encoded = btoa(unescape(encodeURIComponent(code)));
    var url = window.location.origin + window.location.pathname + '#code=' + encoded;
    history.replaceState(null, '', '#code=' + encoded);
    navigator.clipboard.writeText(url).then(function () {
      var btn = document.getElementById('pg-share-btn');
      if (btn) {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = orig; }, 1500);
      }
    });
  };

  function getCodeFromHash() {
    var hash = window.location.hash;
    if (hash && hash.indexOf('#code=') === 0) {
      try {
        return decodeURIComponent(escape(atob(hash.substring(6))));
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // ----- Resizer -----

  function initResizer() {
    var resizer = document.getElementById('pg-resizer');
    if (!resizer) return;
    var panels = document.querySelector('.pg-panels');
    var editorWrap = document.querySelector('.pg-editor-wrap');
    var previewWrap = document.querySelector('.pg-preview-wrap');
    var dragging = false;

    resizer.addEventListener('mousedown', startDrag);
    resizer.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
      e.preventDefault();
      dragging = true;
      resizer.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', onDrag, { passive: false });
      document.addEventListener('touchend', stopDrag);
    }

    function onDrag(e) {
      if (!dragging) return;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      var rect = panels.getBoundingClientRect();
      var offset = clientY - rect.top;
      var total = rect.height;
      var minPx = 100;
      offset = Math.max(minPx, Math.min(offset, total - minPx));
      var pct = (offset / total) * 100;
      editorWrap.style.flex = 'none';
      editorWrap.style.height = pct + '%';
      previewWrap.style.flex = 'none';
      previewWrap.style.height = (100 - pct) + '%';
    }

    function stopDrag() {
      dragging = false;
      resizer.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', onDrag);
      document.removeEventListener('touchend', stopDrag);
    }
  }

  // ----- Mobile snippet drawer -----

  window.pgToggleSnippets = function () {
    document.querySelector('.pg-snippets').classList.toggle('open');
    document.querySelector('.pg-snippets-overlay').classList.toggle('open');
  };

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

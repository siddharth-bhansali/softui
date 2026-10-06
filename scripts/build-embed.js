#!/usr/bin/env node
/*
 * Builds dist/softui-embed.css: the full SoftUI stylesheet minus everything
 * that styles the host page. Meant for dropping SoftUI components into an
 * existing site without touching its <body>, headings, links or scrollbars.
 *
 * Instead of hand-maintained markers, the script parses src/softui.css and
 * looks at every style rule (including rules inside @media / @supports):
 *
 *   - Selectors that mention `sui-`, `[data-theme` or `:root`, or that need
 *     a class, are SoftUI's own and are kept. Rules that only declare custom
 *     properties are kept.
 *   - In a selector list, the global selectors are removed and the SoftUI
 *     ones kept (`body, .sui-x` -> `.sui-x`).
 *   - Fully global rules are rewritten so they only reach SoftUI elements.
 *     The scope is wrapped in `:where()`, so every rewritten selector keeps
 *     the specificity of the original global one (0 for `*`, 0-0-1 for `h1`)
 *     and the cascade between SoftUI, components and the host page works
 *     exactly as it does with the full build:
 *       *, *::before, *::after  -> SoftUI elements and their descendants
 *                                   (reset, reduced motion, print shadows)
 *       h1..h6, p, a:hover, ...  -> those elements inside a SoftUI element,
 *                                   or carrying a sui- class themselves
 *       body (top level only)    -> its inherited text properties (font,
 *                                   colour, size, line-height, smoothing) go
 *                                   on the outermost SoftUI elements, which
 *                                   used to inherit them from <body>
 *   - Everything else that is global (body/html backgrounds, page scrollbar,
 *     print URL suffixes on host links, ...) is dropped.
 *
 * The script exits 1 if the CSS cannot be parsed, if the expected global
 * rules are not found, or if any global selector survives into the output.
 *
 * Usage: node scripts/build-embed.js [--src file] [--out file] [--verbose]
 */
'use strict';

var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var args = process.argv.slice(2);
function arg(name, fallback) {
  var i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? path.resolve(args[i + 1]) : fallback;
}
var SRC = arg('--src', path.join(root, 'src', 'softui.css'));
var OUT = arg('--out', path.join(root, 'dist', 'softui-embed.css'));
var VERBOSE = args.indexOf('--verbose') >= 0;

var SCOPE = '[class*="sui-"]';
var RECURSE_AT = /^@(media|supports|container|layer|document|-moz-document)\b/i;
var INHERITED_FROM_BODY = /^(font-family|font-size|line-height|color|-webkit-font-smoothing|-moz-osx-font-smoothing)$/i;

function fail(msg) {
  console.error('build-embed: ' + msg);
  process.exit(1);
}

// ---------- Parsing ----------

// Index just past the comment or string starting at i (or i if neither).
function skipCommentOrString(css, i) {
  var c = css[i];
  if (c === '/' && css[i + 1] === '*') {
    var end = css.indexOf('*/', i + 2);
    if (end < 0) fail('unterminated comment at offset ' + i);
    return end + 2;
  }
  if (c === '"' || c === "'") {
    var j = i + 1;
    while (j < css.length && css[j] !== c) {
      if (css[j] === '\\') j++;
      j++;
    }
    if (j >= css.length) fail('unterminated string at offset ' + i);
    return j + 1;
  }
  return i;
}

// Index of the '}' that closes the block whose '{' is at `open`.
function matchBrace(css, open) {
  var depth = 0;
  for (var i = open; i < css.length;) {
    var skip = skipCommentOrString(css, i);
    if (skip !== i) { i = skip; continue; }
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) return i; }
    i++;
  }
  fail('unbalanced braces (block opened at offset ' + open + ')');
}

// Split css[start, end) into top-level nodes.
function parse(css, start, end) {
  var nodes = [];
  var i = start;
  while (i < end) {
    if (/\s/.test(css[i])) { i++; continue; }
    if (css[i] === '/' && css[i + 1] === '*') {
      var cEnd = skipCommentOrString(css, i);
      nodes.push({ type: 'comment', start: i, end: cEnd });
      i = cEnd;
      continue;
    }
    if (css[i] === '}') fail('unexpected "}" at offset ' + i);
    // Prelude runs to the first top-level '{' or ';'
    var j = i;
    while (j < end) {
      var s = skipCommentOrString(css, j);
      if (s !== j) { j = s; continue; }
      if (css[j] === '{' || css[j] === ';') break;
      j++;
    }
    if (j >= end) fail('unterminated rule at offset ' + i);
    var prelude = css.slice(i, j).trim();
    if (css[j] === ';') {
      nodes.push({ type: 'statement', start: i, end: j + 1 });
      i = j + 1;
      continue;
    }
    var close = matchBrace(css, j);
    nodes.push({
      type: prelude[0] === '@' ? 'at' : 'rule',
      prelude: prelude,
      start: i,
      bodyStart: j + 1,
      bodyEnd: close,
      end: close + 1
    });
    i = close + 1;
  }
  return nodes;
}

// Split on top-level separators (outside (), [], strings and comments).
function splitTop(text, sep) {
  var parts = [];
  var depth = 0;
  var last = 0;
  for (var i = 0; i < text.length;) {
    var skip = skipCommentOrString(text, i);
    if (skip !== i) { i = skip; continue; }
    var c = text[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === sep && depth === 0) { parts.push(text.slice(last, i)); last = i + 1; }
    i++;
  }
  parts.push(text.slice(last));
  return parts;
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function declarations(body) {
  return splitTop(stripComments(body), ';')
    .map(function (d) { return d.trim(); })
    .filter(Boolean);
}

// ---------- Classification ----------

// Owned by SoftUI: mentions sui- / data-theme / :root, or needs a class the
// page has to opt into (a few chart helpers are unprefixed, e.g.
// .chart-line-success). Global: bare elements, *, ::-webkit-scrollbar,
// a[href]::after and the like.
function isSoftUISelector(sel) {
  if (/sui-|\[data-theme|:root/.test(sel)) return true;
  var noAttrs = sel.replace(/\[[^\]]*\]/g, '[]');
  return /\.[a-zA-Z_-]/.test(noAttrs);
}

function isUniversal(sel) {
  return /^\*(::?(before|after))?$/.test(sel);
}

// A bare element with optional pseudo-classes / one trailing pseudo-element,
// e.g. `h1`, `a:hover`, `a:focus-visible`, `p::first-line`.
var ELEMENT_RE = /^([a-z][a-z0-9]*)((?::[a-z-]+(?:\([^()]*\))?)*)(::[a-z-]+)?$/i;
function isElementSelector(sel) {
  var m = ELEMENT_RE.exec(sel);
  return !!m && !/^(html|body)$/i.test(m[1]);
}

// ---------- Rewrites ----------

function scopeUniversal(sel) {
  var pseudo = sel.slice(1); // '', '::before' or '::after'
  return ':where(' + SCOPE + ')' + pseudo + ', :where(' + SCOPE + ') *' + pseudo;
}

// `a:hover` -> `:where(SCOPE) a:hover, a:where(SCOPE):hover`. The :where()
// adds nothing, so specificity stays exactly what the global rule had: host
// element rules and SoftUI element rules tie and source order decides, just
// as with the full build, and component classes still win.
function scopeElement(sel) {
  var m = ELEMENT_RE.exec(sel);
  var tag = m[1], rest = (m[2] || '') + (m[3] || '');
  return ':where(' + SCOPE + ') ' + tag + rest + ', ' + tag + ':where(' + SCOPE + ')' + rest;
}

var stats = { kept: 0, trimmed: 0, scoped: 0, dropped: [], removedBlocks: 0, sawBody: false, sawUniversal: false };

function indentOf(css, pos) {
  var lineStart = css.lastIndexOf('\n', pos - 1) + 1;
  return css.slice(lineStart, pos).match(/^[ \t]*/)[0];
}

function rule(selectors, body, indent) {
  return selectors.join(',\n' + indent) + ' {' + body + '}';
}

// Returns replacement text for a style-rule node, or null to drop it.
function transformRule(css, node, depth) {
  var body = css.slice(node.bodyStart, node.bodyEnd);
  var decls = declarations(body);
  var selectors = splitTop(stripComments(node.prelude), ',')
    .map(function (s) { return s.trim().replace(/\s+/g, ' '); })
    .filter(Boolean);
  var indent = indentOf(css, node.start);
  var original = css.slice(node.start, node.end);

  if (!decls.length) {
    stats.dropped.push(node.prelude + ' (empty)');
    return null;
  }
  // Custom properties only: no visible effect on their own.
  if (decls.every(function (d) { return d.slice(0, 2) === '--'; })) { stats.kept++; return original; }

  var own = selectors.filter(isSoftUISelector);
  if (own.length === selectors.length) { stats.kept++; return original; }
  if (own.length) {
    stats.trimmed++;
    stats.dropped.push(selectors.filter(function (s) { return !isSoftUISelector(s); }).join(', ') + ' (from a mixed list)');
    return rule(own, body, indent);
  }

  if (selectors.every(isUniversal)) {
    stats.sawUniversal = true;
    stats.scoped++;
    return rule(selectors.map(scopeUniversal), body, indent);
  }
  if (selectors.every(isElementSelector)) {
    stats.scoped++;
    return rule(selectors.map(scopeElement), body, indent);
  }
  if (depth === 0 && selectors.length === 1 && /^body$/i.test(selectors[0])) {
    stats.sawBody = true;
    var inherited = decls.filter(function (d) {
      return INHERITED_FROM_BODY.test(d.split(':')[0].trim());
    });
    stats.dropped.push('body (non-inherited declarations)');
    if (!inherited.length) return null;
    stats.scoped++;
    var inner = indent + '  ';
    return ':where(' + SCOPE + '):not(:where(' + SCOPE + ' *)) {\n' +
      inherited.map(function (d) { return inner + d + ';'; }).join('\n') + '\n' + indent + '}';
  }

  stats.dropped.push(selectors.join(', '));
  return null;
}

function hasRules(nodes) {
  return nodes.some(function (n) { return n.type !== 'comment'; });
}

// Rebuilds css[start, end) with every rule transformed.
function transform(css, start, end, depth) {
  var nodes = parse(css, start, end);
  var out = '';
  var cursor = start;
  nodes.forEach(function (node) {
    var replacement;
    if (node.type === 'rule') {
      replacement = transformRule(css, node, depth);
    } else if (node.type === 'at' && RECURSE_AT.test(node.prelude)) {
      var inner = transform(css, node.bodyStart, node.bodyEnd, depth + 1);
      if (hasRules(parse(inner, 0, inner.length))) {
        replacement = css.slice(node.start, node.bodyStart) + inner + '}';
      } else {
        stats.removedBlocks++;
        replacement = null;
      }
    } else {
      return; // comments, @keyframes, @font-face, @import ... stay as-is
    }
    var gap = css.slice(cursor, node.start);
    if (replacement === null) {
      // Drop the rule together with the whitespace that preceded it.
      out += gap.replace(/\s+$/, '');
    } else {
      out += gap + replacement;
    }
    cursor = node.end;
  });
  return out + css.slice(cursor, end);
}

// ---------- Checks ----------

function verify(css) {
  var problems = [];
  (function walk(start, end) {
    parse(css, start, end).forEach(function (node) {
      if (node.type === 'at' && RECURSE_AT.test(node.prelude)) return walk(node.bodyStart, node.bodyEnd);
      if (node.type !== 'rule') return;
      var decls = declarations(css.slice(node.bodyStart, node.bodyEnd));
      if (decls.every(function (d) { return d.slice(0, 2) === '--'; })) return;
      splitTop(stripComments(node.prelude), ',').forEach(function (sel) {
        if (!isSoftUISelector(sel)) problems.push(sel.trim());
      });
    });
  })(0, css.length);
  return problems;
}

// ---------- Main ----------

var raw = fs.readFileSync(SRC, 'utf8');
var crlf = raw.indexOf('\r\n') >= 0;
var src = raw.replace(/\r\n/g, '\n');
var out = transform(src, 0, src.length, 0);

if (!stats.sawUniversal || !stats.sawBody) {
  fail('did not find the global reset / body rules in ' + path.relative(root, SRC) +
    ' — has the base section moved? Refusing to write ' + path.relative(root, OUT));
}
var leaks = verify(out);
if (leaks.length) fail('global selectors left in output:\n  ' + leaks.join('\n  '));

var banner = /^\/\*! SoftUI (v[\d.]+[^ ]*) —/;
if (!banner.test(out)) fail('banner "/*! SoftUI vX.Y.Z — ..." not found on line 1');
out = out.replace(banner, '/*! SoftUI $1 (embed: no global page styles) —');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, crlf ? out.replace(/\n/g, '\r\n') : out);

console.log('build-embed: wrote ' + path.relative(root, OUT) + ' (' +
  stats.kept + ' rules kept, ' + stats.scoped + ' scoped to SoftUI, ' +
  stats.trimmed + ' trimmed, ' + stats.dropped.length + ' global selectors dropped, ' +
  stats.removedBlocks + ' empty at-rule blocks removed)');
if (VERBOSE) stats.dropped.forEach(function (d) { console.log('  dropped: ' + d); });

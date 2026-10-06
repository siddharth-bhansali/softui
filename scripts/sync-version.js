#!/usr/bin/env node
/*
 * Keeps the "/*! SoftUI vX.Y.Z" banners in src/softui.css and src/softui.js,
 * and SoftUI.version (const VERSION in src/softui.js), in step with
 * package.json, so the dist files (and the minified copies, which keep /*!
 * comments) always report the published version.
 * Runs as the first step of build:min.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '..');
var version = require(path.join(root, 'package.json')).version;
var BANNER = /^(﻿?\/\*! SoftUI v)[0-9][^\s]*/;
var VERSION_CONST = /(const VERSION = ')[^']*(')/;

['src/softui.css', 'src/softui.js'].forEach(function (rel) {
  var file = path.join(root, rel);
  var text = fs.readFileSync(file, 'utf8');
  if (!BANNER.test(text)) {
    console.error('sync-version: no "/*! SoftUI vX.Y.Z" banner on line 1 of ' + rel);
    process.exit(1);
  }
  var next = text.replace(BANNER, '$1' + version);
  // SoftUI.version reads this constant, so it must match the banner
  if (rel === 'src/softui.js') {
    if (!VERSION_CONST.test(next)) {
      console.error("sync-version: no \"const VERSION = '...'\" in " + rel);
      process.exit(1);
    }
    next = next.replace(VERSION_CONST, '$1' + version + '$2');
  }
  if (next !== text) {
    fs.writeFileSync(file, next);
    console.log('sync-version: ' + rel + ' -> v' + version);
  }
});

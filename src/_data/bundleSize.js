// Sizes of the published dist files, measured when the docs are built, so
// the docs never quote a stale number. Each entry is null if the file is
// missing (templates fall back to generic wording).
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function kb(bytes) {
  return Math.max(1, Math.round(bytes / 1024)) + "KB";
}

function measure(file) {
  try {
    const buf = fs.readFileSync(path.join(__dirname, "..", "..", "dist", file));
    return { min: kb(buf.length), gzip: kb(zlib.gzipSync(buf, { level: 9 }).length) };
  } catch (e) {
    return null;
  }
}

module.exports = function () {
  return {
    js: measure("softui.min.js"),
    css: measure("softui.min.css")
  };
};

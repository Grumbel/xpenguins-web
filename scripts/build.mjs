#!/usr/bin/env node
/**
 * Bundle src/ into dist/xpenguins-web.js with theme PNGs embedded as data URLs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const themeDir = path.join(root, 'themes', 'penguins');
const distDir = path.join(root, 'dist');

function dataUrlPng(filePath) {
  const buf = fs.readFileSync(filePath);
  return 'data:image/png;base64,' + buf.toString('base64');
}

const theme = JSON.parse(fs.readFileSync(path.join(themeDir, 'theme.json'), 'utf8'));
const images = {};
const files = new Set();

function collectFiles(types) {
  if (!types) return;
  for (const def of Object.values(types)) {
    if (def.file) files.add(def.file);
  }
}

if (theme.genera) {
  for (const g of theme.genera) collectFiles(g.types);
} else {
  collectFiles(theme.types);
}

for (const file of files) {
  const fp = path.join(themeDir, file);
  if (!fs.existsSync(fp)) {
    console.warn('missing sprite', file);
    continue;
  }
  const key = file.replace(/\.png$/i, '');
  images[key] = dataUrlPng(fp);
}

const embedded = { theme, images };

function stripModule(src) {
  return src
    .replace(/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\n?/g, '')
    .replace(/export default api;?/g, '')
    .replace(/export \{[^}]+\};?/g, '')
    .replace(/^export /gm, '');
}

const solids = stripModule(fs.readFileSync(path.join(root, 'src/solids.js'), 'utf8'));
const toon = stripModule(fs.readFileSync(path.join(root, 'src/toon.js'), 'utf8'));
const render = stripModule(fs.readFileSync(path.join(root, 'src/render.js'), 'utf8'));
let index = stripModule(fs.readFileSync(path.join(root, 'src/index.js'), 'utf8'));
index = index
  .replace(/export const EMBEDDED[\s\S]*?;\n/, '')
  .replace(/const EMBEDDED = typeof __XPENGUINS_EMBEDDED__[\s\S]*?;/, '');

const banner = '/*! xpenguins-web — GPL-2.0-or-later — penguins on the DOM */\n';
const body = `${banner}(function (global) {
'use strict';
const __XPENGUINS_EMBEDDED__ = ${JSON.stringify(embedded)};
${solids}
${toon}
${render}
const EMBEDDED = __XPENGUINS_EMBEDDED__;
${index}
const XPenguins = { start, stop, setNumber, isRunning, collectSolids };
global.XPenguins = XPenguins;
if (typeof global.window !== 'undefined') global.window.XPenguins = XPenguins;
if (typeof module !== 'undefined' && module.exports) module.exports = XPenguins;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
`;

fs.mkdirSync(distDir, { recursive: true });
const out = path.join(distDir, 'xpenguins-web.js');
fs.writeFileSync(out, body);
console.log('Wrote', out, '(' + Math.round(body.length / 1024) + ' KiB,', files.size, 'sprites)');

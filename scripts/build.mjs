#!/usr/bin/env node
/**
 * Bundle src/ into dist/xpenguins-web.js with theme PNGs embedded as data URLs.
 * No heavy bundler required: concatenate ES modules into one IIFE via a thin wrapper.
 *
 * For clarity we use dynamic import in Node to load nothing of the browser code —
 * we string-assemble the browser sources and inject EMBEDDED JSON.
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
for (const def of Object.values(theme.types)) {
  const base = def.file.replace(/\.png$/, '');
  const fp = path.join(themeDir, def.file);
  if (!fs.existsSync(fp)) {
    console.warn('missing', def.file);
    continue;
  }
  images[base] = dataUrlPng(fp);
}
// aliases used by renderer
if (images.bomber) images.exit = images.bomber;
if (images.reader) images.action = images.reader;
if (images.splat) images.splat = images.splat;

const embedded = { theme, images };

function readSrc(name) {
  return fs.readFileSync(path.join(root, 'src', name), 'utf8')
    // strip ES import/export for naive concat IIFE — rewrite manually below
    ;
}

// We emit a single file that inlines modules in dependency order without a bundler.
const solids = fs.readFileSync(path.join(root, 'src/solids.js'), 'utf8')
  .replace(/export \{[^}]+\};?/g, '')
  .replace(/^export /gm, '');
const toon = fs.readFileSync(path.join(root, 'src/toon.js'), 'utf8')
  .replace(/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\n?/g, '')
  .replace(/export \{[^}]+\};?/g, '')
  .replace(/^export /gm, '');
const render = fs.readFileSync(path.join(root, 'src/render.js'), 'utf8')
  .replace(/export \{[^}]+\};?/g, '')
  .replace(/^export /gm, '');
const index = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8')
  .replace(/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\n?/g, '')
  .replace(/export const EMBEDDED[\s\S]*?;\n/, '')
  .replace(/typeof __XPENGUINS_EMBEDDED__[\s\S]*?null/, 'null')
  .replace(/export default api;?/g, '')
  .replace(/export \{[^}]+\};?/g, '')
  .replace(/^export /gm, '');

const banner = `/*! xpenguins-web — GPL-2.0-or-later — penguins on the DOM */\n`;
const body = `${banner}(function (global) {
'use strict';
const __XPENGUINS_EMBEDDED__ = ${JSON.stringify(embedded)};

${solids}
${toon}
${render}

const EMBEDDED = __XPENGUINS_EMBEDDED__;

${index.replace(
  /const pack = userOpts\.pack \|\| EMBEDDED;/,
  'const pack = userOpts.pack || EMBEDDED;',
)}

const XPenguins = { start, stop, setNumber, isRunning, collectSolids };
global.XPenguins = XPenguins;
if (typeof module !== 'undefined' && module.exports) module.exports = XPenguins;
})(typeof window !== 'undefined' ? window : globalThis);
`;

fs.mkdirSync(distDir, { recursive: true });
const out = path.join(distDir, 'xpenguins-web.js');
fs.writeFileSync(out, body);
console.log('Wrote', out, '(' + Math.round(body.length / 1024) + ' KiB)');

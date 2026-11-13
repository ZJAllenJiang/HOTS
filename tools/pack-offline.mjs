import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const entryTag = /<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script\s*>/gi;
const styleTag = /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi;
const assetUrl = /(?<=["'`(])\/models\/[\w./-]+(?=["'`)])/g;
const modelTypes = new Map([['.glb', 'model/gltf-binary'], ['.png', 'image/png']]);

const offlinePolicy = [
  "default-src 'none'",
  "script-src 'unsafe-inline' data:",
  "style-src 'unsafe-inline' data:",
  'img-src data: blob:',
  'connect-src data: blob:',
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function localPath(directory, url) {
  const relative = url.replace(/^(?:\/|\.\/)/, '');
  if (!/^[\w./-]+$/.test(relative) || relative.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`Unsupported offline asset path: ${url}`);
  }
  return join(directory, relative);
}

function dataUrl(mime, bytes) {
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

function escapeHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function optionalNotice(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return '';
  }
}

export async function packOffline(directory, licenses = []) {
  const originalHtml = await readFile(join(directory, 'index.html'), 'utf8');
  const entries = [...originalHtml.matchAll(entryTag)];
  const styles = [...originalHtml.matchAll(styleTag)];
  if (entries.length !== 1 || styles.length !== 1) {
    throw new Error('Offline export requires one Vite module entry and one stylesheet.');
  }
  const [[entryMarkup, entryPath]] = entries;
  const [[styleMarkup, stylePath]] = styles;
  const shell = originalHtml.replace(entryMarkup, '').replace(styleMarkup, '');
  if (/<(?:script|link|img|source|iframe|audio|video|object|embed|base)\b/i.test(shell) || !shell.includes('<head>') || !shell.includes('</body>')) {
    throw new Error('Offline export requires the Vite HTML shell without additional asset tags.');
  }

  const [originalJs, originalCss] = await Promise.all([
    readFile(localPath(directory, entryPath), 'utf8'),
    readFile(localPath(directory, stylePath), 'utf8'),
  ]);
  const sources = new Map([['/index.html', originalHtml], [entryPath, originalJs], [stylePath, originalCss]]);
  const urls = new Set([...originalJs.matchAll(assetUrl), ...originalCss.matchAll(assetUrl)].map(([url]) => url));
  const embedded = new Map();
  const noticePaths = new Set();
  for (const url of urls) {
    const mime = modelTypes.get(extname(url));
    if (!mime) throw new Error(`Unsupported offline asset type: ${url}`);
    const bytes = await readFile(localPath(directory, url));
    sources.set(url, bytes);
    embedded.set(url, dataUrl(mime, bytes));
    noticePaths.add(posix.join(posix.dirname(url), 'NOTICE.md'));
  }
  const notices = await Promise.all([...noticePaths].map(async url => {
    const notice = await optionalNotice(localPath(directory, url));
    return notice ? `${url}\n${notice}` : '';
  }));
  const attribution = escapeHtml([...licenses, ...notices].filter(Boolean).join('\n\n'));

  const js = originalJs.replaceAll(assetUrl, url => embedded.get(url));
  const css = originalCss.replaceAll(assetUrl, url => embedded.get(url));
  // Serve raw text unless it can change how HTML tokenizes the enclosing tag.
  const script = /<\/?script|<!--/i.test(js)
    ? `<script type="module" src="${dataUrl('text/javascript', js)}"></script>`
    : `<script type="module">${js}</script>`;
  const stylesheet = /<\/style/i.test(css)
    ? `<link rel="stylesheet" href="${dataUrl('text/css', css)}">`
    : `<style>${css}</style>`;
  const html = originalHtml
    .replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${offlinePolicy}">`)
    .replace(entryMarkup, () => script)
    .replace(styleMarkup, () => stylesheet)
    .replace('</body>', () => `<template id="offline-attribution"><pre>${attribution}</pre></template></body>`);
  return { html, sources };
}

export function byteSizes(content) {
  return {
    raw: Buffer.byteLength(content),
    gzip: gzipSync(content, { level: 9 }).length,
    brotli: brotliCompressSync(content, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  };
}

async function buildOffline() {
  const { build } = await import('vite');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const output = join(root, 'dist-offline', 'hots-aram-offline.html');
  await mkdir(dirname(output), { recursive: true });
  const staging = await mkdtemp(join(dirname(output), '.offline-'));
  try {
    const directory = join(staging, 'vite');
    const result = await build({ root, build: { outDir: directory, emptyOutDir: true } });
    const chunks = (Array.isArray(result) ? result : [result])
      .flatMap(bundle => bundle.output)
      .filter(item => item?.type === 'chunk');
    if (chunks.length !== 1 || !chunks[0].isEntry || chunks[0].imports.length || chunks[0].dynamicImports.length) {
      throw new Error('Offline export requires one self-contained JavaScript entry.');
    }
    const licenses = await Promise.all(['LICENSE', 'node_modules/three/LICENSE'].map(async path => (
      `${path}\n${await readFile(join(root, path), 'utf8')}`
    )));
    const { html, sources } = await packOffline(directory, licenses);
    const report = Object.fromEntries([...sources].map(([path, bytes]) => [path, byteSizes(bytes)]));
    const totals = { raw: 0, gzip: 0, brotli: 0 };
    for (const sizes of Object.values(report)) {
      for (const key of Object.keys(totals)) totals[key] += sizes[key];
    }
    report['Hosted total (per file)'] = totals;
    report['Standalone HTML'] = byteSizes(html);
    const stagedFile = join(staging, 'hots-aram-offline.html');
    await writeFile(stagedFile, html);
    await rename(stagedFile, output);
    console.log(`Offline HTML written to ${output}`);
    console.log('Byte counts. gzip and Brotli are delivery estimates.');
    console.table(report);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildOffline();

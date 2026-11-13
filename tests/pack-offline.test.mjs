import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { byteSizes, packOffline } from '../tools/pack-offline.mjs';

const shell = '<!doctype html><html><head><meta charset="UTF-8">'
  + '<script type="module" crossorigin src="/assets/entry.js"></script>'
  + '<link rel="stylesheet" crossorigin href="/assets/entry.css">'
  + '</head><body><div id="game"></div></body></html>';
const fixtures = [];

async function fixture(files) {
  const directory = await mkdtemp(join(tmpdir(), 'hots-offline-test-'));
  fixtures.push(directory);
  for (const [name, contents] of Object.entries({ 'index.html': shell, ...files })) {
    const path = join(directory, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
  }
  return directory;
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

describe('offline production packaging', () => {
  it('embeds referenced GLBs and portrait bytes, preserving attribution as inert text', async () => {
    const hero = Buffer.from([0, 1, 2, 255]);
    const tower = Buffer.from([8, 7, 6]);
    const portrait = Buffer.from([5, 4, 3]);
    const directory = await fixture({
      'assets/entry.js': 'fetch("/models/jaina/body.glb");fetch("/models/arena/arcane-tower.glb");'
        + 'document.body.innerHTML=`<svg><image href="/models/jaina/qa.png"/></svg>`;const preserved="$&";',
      'assets/entry.css': 'body{color:red}',
      'models/jaina/body.glb': hero,
      'models/jaina/qa.png': portrait,
      'models/arena/arcane-tower.glb': tower,
      'models/jaina/NOTICE.md': 'Jaina & model <port> attribution',
      'models/arena/unused.glb': 'UNUSED_CONTENT',
    });
    const { html, sources } = await packOffline(directory, ['Application license']);
    expect(html).toContain(`<style>body{color:red}</style>`);
    expect(html).toContain(`fetch("data:model/gltf-binary;base64,${hero.toString('base64')}")`);
    expect(html).toContain(`fetch("data:model/gltf-binary;base64,${tower.toString('base64')}")`);
    expect(html).toContain(`href="data:image/png;base64,${portrait.toString('base64')}"`);
    expect(html).toContain('preserved="$&"');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain('connect-src data: blob:');
    expect(html).toContain('<template id="offline-attribution">');
    expect(html).toContain('Jaina &amp; model &lt;port&gt; attribution');
    expect(html).toContain('Application license');
    expect(html).not.toMatch(/\b(?:src|href)="\/(?:assets|models)\//);
    expect(html).not.toContain('UNUSED_CONTENT');
    expect(sources.size).toBe(6);
    expect(sources.get('/models/arena/arcane-tower.glb')).toEqual(tower);
  });

  it('preserves script and style source that could close an inline HTML tag', async () => {
    const js = 'globalThis.html = "<!--<script></ScRiPt><div>冰</div>";';
    const css = 'body::after{content:"</StYlE><img>"}';
    const directory = await fixture({ 'assets/entry.js': js, 'assets/entry.css': css });
    const { html } = await packOffline(directory);
    const script = html.match(/src="data:text\/javascript;base64,([^"]+)"/);
    const stylesheet = html.match(/href="data:text\/css;base64,([^"]+)"/);
    expect(Buffer.from(script[1], 'base64').toString('utf8')).toBe(js);
    expect(Buffer.from(stylesheet[1], 'base64').toString('utf8')).toBe(css);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).not.toMatch(/<img>|<div>冰/);
  });

  it('rejects additional dependencies in the production HTML', async () => {
    const index = shell.replace('</head>', '<link rel="modulepreload" href="/assets/chunk.js"></head>');
    const directory = await fixture({ 'index.html': index });
    await expect(packOffline(directory)).rejects.toThrow('without additional asset tags');
  });

  it('rejects a referenced model missing from the build', async () => {
    const directory = await fixture({ 'assets/entry.js': 'fetch("/models/jaina/body.glb")', 'assets/entry.css': '' });
    await expect(packOffline(directory)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('reports byte lengths for Unicode source and compressed delivery', async () => {
    const { gzipSync, brotliCompressSync, constants } = await import('node:zlib');
    const content = '单线乱斗'.repeat(100);
    const gzip = gzipSync(content, { level: 9 });
    const brotli = brotliCompressSync(content, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
    expect(byteSizes(content)).toEqual({ raw: 1200, gzip: gzip.length, brotli: brotli.length });
    expect(gunzipSync(gzip).toString('utf8')).toBe(content);
    expect(brotliDecompressSync(brotli).toString('utf8')).toBe(content);
  });
});

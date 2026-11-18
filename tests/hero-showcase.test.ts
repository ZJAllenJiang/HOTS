import {expect, it, vi} from 'vitest';
import * as THREE from 'three';
import {HeroShowcase} from '../src/hero-showcase';
import type {Hero} from '../src/contracts';

it('keeps the static fallback until the hero loads and releases replaced previews', () => {
  const showcase = new HeroShowcase();
  const root = new THREE.Group();
  const update = vi.fn();
  const dispose = vi.fn(() => root.removeFromParent());
  const model = {root, update, dispose, play: vi.fn()};
  let loaded = false;
  const instantiate = vi.fn((hero: Hero) => loaded && hero === 'frost' ? model : null);
  expect(showcase.select('frost', {instantiate})).toBe(false);
  loaded = true;
  showcase.invalidate('frost');
  expect(showcase.select('frost', {instantiate})).toBe(true);
  expect(root.parent).toBe(showcase.scene);
  showcase.resize(420, 550);
  showcase.update(.05, true);
  expect(update).toHaveBeenLastCalledWith('idle', 0);
  showcase.update(.05, false);
  expect(update).toHaveBeenLastCalledWith('idle', .05);
  expect(showcase.select('guardian', {instantiate})).toBe(false);
  expect(root.parent).toBeNull();
  expect(dispose).toHaveBeenCalledOnce();
});

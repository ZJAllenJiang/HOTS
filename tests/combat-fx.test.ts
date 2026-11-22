import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CombatFx } from '../src/combat-fx';
import type { Effect } from '../src/contracts';

it('keeps the area edge aligned with the damage radius while its impact animates', () => {
  const scene = new THREE.Scene();
  const fx = new CombatFx(scene);
  const effect: Effect = { x: 4, z: -2, radius: 6, life: .75, team: 1, kind: 'ultimate', hero: 'frost', ability: 'r' };
  fx.update([effect], 0);
  const [root] = scene.children;
  const [edge, , , , shock] = root.children;
  expect(root.position).toMatchObject({ x: 4, z: -2 });
  expect(edge.scale.x).toBe(6);
  expect((edge as THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>).material.color.getHex()).toBe(0xff7690);
  const startingScale = shock.scale.x;

  effect.life -= .05;
  fx.update([effect], .05);
  const movingScale = shock.scale.x;
  expect(movingScale).toBeGreaterThan(startingScale);
  expect(edge.scale.x).toBe(6);
  fx.update([effect], 0);
  expect(shock.scale.x).toBe(movingScale);
  fx.dispose();
});

it('keeps spell effects during attack crowds and releases their resources on reset', () => {
  const scene = new THREE.Scene();
  const fx = new CombatFx(scene);
  const spell: Effect = { x: -4, z: 0, radius: 2, life: .45, team: 0, kind: 'heal', hero: 'ranger', ability: 'e', origin: { x: -11, z: 0 } };
  const attacks: Effect[] = Array.from({ length: 45 }, (_, x) => ({ x, z: 0, radius: .5, life: .15, team: 0, kind: 'attack' }));
  fx.update([spell, ...attacks], 0);
  expect(scene.children).toHaveLength(11);
  const root = scene.children.find(child => child.position.x === -4)!;
  expect(root.children.some(child => child.position.x < -1)).toBe(true);
  const piece = root.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  const materialDispose = vi.fn();
  const geometryDispose = vi.fn();
  piece.material.addEventListener('dispose', materialDispose);
  piece.geometry.addEventListener('dispose', geometryDispose);

  fx.clear();
  expect(scene.children).toHaveLength(0);
  expect(materialDispose).toHaveBeenCalledTimes(1);
  expect(geometryDispose).toHaveBeenCalledTimes(0);
  fx.update([spell], 0);
  expect(scene.children).toHaveLength(1);
  fx.dispose();
  expect(scene.children).toHaveLength(0);
  expect(geometryDispose).toHaveBeenCalledTimes(1);
});

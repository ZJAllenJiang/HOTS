import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CombatFx } from '../src/combat-fx';
import type { Effect } from '../src/contracts';

type FxMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

it('retains the player impact and enemy ground warning when other effects fill the budget', () => {
  const scene = new THREE.Scene();
  const fx = new CombatFx(scene);
  const hit: Effect = {x:-4,z:0,radius:4.5,life:.65,team:0,kind:'burst',hero:'frost',ability:'w',sourceId:1};
  const warning: Effect = {...hit,x:-3,team:1,sourceId:2,kind:'telegraph',life:.35};
  const crowd: Effect[] = Array.from({length:40},(_,x)=>({...hit,x,sourceId:3}));
  fx.update([hit,warning,...crowd],0,1);
  expect(scene.children).toHaveLength(32);
  expect(scene.children.map(child=>child.position.x)).toEqual(expect.arrayContaining([-4,-3]));
  fx.dispose();
});

it('stages frost W from a quiet full-size warning to an immediate arena-scale ice burst', () => {
  const scene = new THREE.Scene();
  const fx = new CombatFx(scene);
  const warning: Effect = { x: 4, z: -2, radius: 4.5, life: .35, team: 1, kind: 'telegraph', hero: 'frost', ability: 'w' };
  fx.update([warning], 0);
  const warningRoot = scene.children[0];
  const warningEdge = warningRoot.getObjectByName('area-edge') as FxMesh;
  const countdown = warningRoot.getObjectByName('warning-countdown')!;
  const initialCountdown = countdown.scale.x;
  const warningOpacity = warningEdge.material.opacity;
  expect(warningRoot.children.some(child => (child as FxMesh).geometry.type === 'OctahedronGeometry')).toBe(false);
  warning.life -= .2;
  fx.update([warning], .2);
  expect(countdown.scale.x).toBeLessThan(initialCountdown);
  expect(warningEdge.scale.x).toBe(4.5);

  const burst: Effect = { ...warning, kind: 'burst', life: .65 };
  fx.update([burst], 0);
  expect(scene.children).toHaveLength(1);
  expect(warningRoot.parent).toBeNull();
  const root = scene.children[0];
  const edge = root.getObjectByName('area-edge') as FxMesh;
  const shock = root.getObjectByName('area-shock') as FxMesh;
  const shards = root.children.filter(child => child.name === 'frost-impact-piece') as FxMesh[];
  expect(root.position).toMatchObject({ x: 4, z: -2 });
  expect(edge.scale.x).toBe(4.5);
  expect(edge.material.opacity).toBeGreaterThan(warningOpacity * 1.7);
  expect(shock.scale.x).toBeGreaterThanOrEqual(burst.radius * .6);
  expect(shock.material.color.getHex()).toBe(0xe8fcff);
  expect(shards).toHaveLength(6);
  // Every shard already spans hero-scale height at impact, including the first frame.
  for (const shard of shards) {
    shard.geometry.computeBoundingBox();
    expect(shard.geometry.boundingBox!.getSize(new THREE.Vector3()).y * shard.scale.y).toBeGreaterThan(2);
  }
  burst.life -= .1;
  fx.update([burst], .1);
  expect(edge.scale.x).toBe(4.5);
  expect(shock.material.opacity).toBe(1);
  expect(shards.every(shard => shard.scale.y >= 1.2)).toBe(true);
  expect(root.children.length).toBeLessThanOrEqual(19);
  fx.dispose();
});

it('shows guardian W columns and ranger area impacts immediately without extra meshes', () => {
  for (const hero of ['guardian', 'ranger'] as const) {
    const scene = new THREE.Scene();
    const fx = new CombatFx(scene);
    fx.update([{ x: 0, z: 0, radius: 4.5, life: .65, team: 0, kind: 'burst', hero, ability: 'w' }], 0);
    const root = scene.children[0];
    const shock = root.getObjectByName('area-shock') as FxMesh;
    const pieces = root.children.filter(child => child.name === `${hero}-impact-piece`) as FxMesh[];
    expect(shock.scale.x).toBeCloseTo(2.7);
    expect(pieces).toHaveLength(7);
    expect(pieces.every(piece => piece.scale.x >= .4 && piece.scale.y >= .85)).toBe(true);
    expect(root.children).toHaveLength(19);
    fx.dispose();
  }
});

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

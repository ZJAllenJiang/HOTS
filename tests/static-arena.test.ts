import * as THREE from 'three';
import {expect, it, vi} from 'vitest';
import {batchStaticArena} from '../src/static-arena';

it('batches nearby scenery while preserving transformed vertices, materials and shadows', () => {
  const scene = new THREE.Scene();
  const parent = new THREE.Group();
  parent.position.set(3, 1, 2);
  parent.rotation.y = .4;
  scene.add(parent);
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial();
  const sources = [0, 1, 2].map(index => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(index * 2, .5, index);
    mesh.rotation.x = .3;
    mesh.scale.set(1, 2, .5);
    mesh.castShadow = index !== 2;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  });
  scene.updateMatrixWorld(true);
  const expected = sources.slice(0, 2).map(source =>
    Array.from(source.geometry.toNonIndexed().applyMatrix4(source.matrixWorld).attributes.position.array),
  ).flat();
  const sourceDisposed = vi.fn();
  geometry.addEventListener('dispose', sourceDisposed);
  const [merged] = batchStaticArena(scene, sources);
  expect(Array.from(merged.attributes.position.array)).toEqual(expected);
  const batch = scene.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh;
  expect(batch.material).toBe(material);
  expect(batch.castShadow).toBe(true);
  expect(batch.receiveShadow).toBe(true);
  expect(parent.children).toEqual([sources[2]]);
  expect(sources[2].castShadow).toBe(false);
  expect(merged.boundingSphere!.radius).toBeGreaterThan(1);
  expect(sourceDisposed).not.toHaveBeenCalled();
  merged.dispose();
  geometry.dispose();
  material.dispose();
});

it('keeps distant scenery independently culled and leaves moving objects alone', () => {
  const scene = new THREE.Scene();
  const material = new THREE.MeshStandardMaterial();
  const geometry = new THREE.CylinderGeometry(.2, .2, 3, 10);
  const sources = [-40, -39, 32, 33].map(x => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = x;
    scene.add(mesh);
    return mesh;
  });
  const moving = new THREE.Mesh(geometry, material);
  scene.add(moving);
  const merged = batchStaticArena(scene, sources);
  expect(merged).toHaveLength(2);
  expect(scene.children).toHaveLength(3);
  expect(moving.matrixAutoUpdate).toBe(true);
  expect(merged.every(batch => batch.boundingSphere!.radius < 3)).toBe(true);
  const triangles = merged.reduce((total, batch) => total + batch.attributes.position.count / 3, 0);
  expect(triangles).toBe(4 * geometry.index!.count / 3);
  merged.forEach(batch => batch.dispose());
  geometry.dispose();
  material.dispose();
});

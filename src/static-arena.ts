import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Keep nearby stonework and trees in a few draws without combining the whole
// map into one bounding sphere (which would defeat camera/shadow culling).
export function batchStaticArena(scene: THREE.Scene, meshes: readonly THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]) {
  scene.updateMatrixWorld(true);
  const batches = new Map<string, typeof meshes[number][]>();
  const position = new THREE.Vector3();
  for (const mesh of meshes) {
    position.setFromMatrixPosition(mesh.matrixWorld);
    const key = `${Math.floor(position.x / 16)}/${Math.floor(position.z / 16)}/${mesh.material.uuid}/${mesh.castShadow}/${mesh.receiveShadow}`;
    const batch = batches.get(key);
    if (batch) batch.push(mesh);
    else batches.set(key, [mesh]);
  }
  const geometries: THREE.BufferGeometry[] = [];
  for (const sources of batches.values()) {
    if (sources.length === 1) {
      sources[0].updateMatrix();
      sources[0].matrixAutoUpdate = false;
      continue;
    }
    const pieces = sources.map(source => {
      const geometry = source.geometry.index ? source.geometry.toNonIndexed() : source.geometry.clone();
      return geometry.applyMatrix4(source.matrixWorld);
    });
    const geometry = mergeGeometries(pieces)!;
    pieces.forEach(piece => piece.dispose());
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, sources[0].material);
    mesh.name = 'Static arena batch';
    mesh.castShadow = sources[0].castShadow;
    mesh.receiveShadow = sources[0].receiveShadow;
    mesh.matrixAutoUpdate = false;
    sources.forEach(source => source.removeFromParent());
    scene.add(mesh);
    geometries.push(geometry);
  }
  return geometries;
}

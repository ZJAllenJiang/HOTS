import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {inspectGLB} from './model-validation';

const TEAM_COLORS = [0x4edcff, 0xff688e] as const;

export async function loadArenaTower() {
  const response = await fetch('/models/arena/arcane-tower.glb');
  if (!response.ok) throw new Error(`Tower asset request failed (${response.status})`);
  const bytes = await response.arrayBuffer();
  inspectGLB(bytes);
  const {scene} = await new GLTFLoader().parseAsync(bytes, '');
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const teamMaterials = new Map<THREE.Material, [THREE.Material, THREE.Material]>();

  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = object.name !== 'Crystal' && object.name !== 'Runes';
    object.receiveShadow = true;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      if (!(material instanceof THREE.MeshStandardMaterial) || !material.name.startsWith('Team ') || teamMaterials.has(material)) continue;
      const makeTint = (color: number) => {
        const tinted = material.clone();
        tinted.color.set(color);
        tinted.emissive.set(color);
        materials.add(tinted);
        return tinted;
      };
      teamMaterials.set(material, [makeTint(TEAM_COLORS[0]), makeTint(TEAM_COLORS[1])]);
    }
  });

  return {
    instantiate(team: 0 | 1) {
      const root = scene.clone(true);
      const tint = (material: THREE.Material) => teamMaterials.get(material)?.[team] ?? material;
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = Array.isArray(object.material) ? object.material.map(tint) : tint(object.material);
      });
      return {root, crystal: root.getObjectByName('Crystal')};
    },
    dispose() {
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
    },
  };
}

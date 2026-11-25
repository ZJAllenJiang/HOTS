import * as THREE from 'three';
import {describe, expect, it} from 'vitest';
import {createRangerArt} from '../src/ranger-art';

describe('Valla character art', () => {
  it('shares its compact untextured kit while every actor owns its pose', () => {
    const art = createRangerArt(), first = art.instantiate(), second = art.instantiate();
    const meshes: THREE.Mesh[] = [];
    first.root.traverse(object => {if (object instanceof THREE.Mesh) meshes.push(object);});
    expect(meshes).toHaveLength(20);
    expect(meshes.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0)).toBeLessThanOrEqual(17000);
    expect(new Set(meshes.map(mesh => mesh.material)).size).toBe(2);
    for (const mesh of meshes) {
      const counterpart = second.root.getObjectByName(mesh.name) as THREE.Mesh;
      expect(counterpart.geometry).toBe(mesh.geometry);
      expect(counterpart.material).toBe(mesh.material);
      expect((mesh.material as THREE.MeshStandardMaterial).map).toBeNull();
    }
    const hand = second.root.getObjectByName('hand 1')!;
    const idle = hand.position.clone();
    first.play('attack'); first.update('idle', .15);
    expect(first.root.getObjectByName('hand 1')!.position.z).toBeGreaterThan(idle.z + .3);
    expect(hand.position.equals(idle)).toBe(true);
    art.dispose();
  });

  it('keeps both weapon grips connected through running, shots and casts', () => {
    const art = createRangerArt(), actor = art.instantiate();
    const gripOffsets = [-1, 1].map(side => actor.root.getObjectByName(`crossbow ${side}`)!.position.clone());
    for (const action of ['attack', 'cast'] as const) for (const key of ['q', 'w', 'r'] as const) {
      actor.play(action, key);
      for (let frame = 0; frame < 45; frame++) {
        actor.update('run', 1 / 60); actor.root.updateMatrixWorld(true);
        [-1, 1].forEach((side, i) => {
          const hand = actor.root.getObjectByName(`hand ${side}`)!, weapon = actor.root.getObjectByName(`crossbow ${side}`)!;
          expect(weapon.parent).toBe(hand);
          expect(weapon.position.equals(gripOffsets[i])).toBe(true);
          const bracer = actor.root.getObjectByName(`bracer ${side}`)!;
          const wrist = bracer.localToWorld(new THREE.Vector3(0, -1, 0));
          expect(wrist.distanceTo(hand.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-6);
        });
        actor.root.traverse(object => expect(object.matrixWorld.elements.every(Number.isFinite)).toBe(true));
      }
    }
    actor.play('cast', 'q'); actor.update('idle', .15); actor.root.updateMatrixWorld(true);
    const release = actor.root.getObjectByName('bolt release 1')!.getWorldPosition(new THREE.Vector3());
    expect(actor.projectileAnchor.getWorldPosition(new THREE.Vector3()).distanceTo(release)).toBeLessThan(1e-8);
    art.dispose();
  });

  it('plants a boot on each stride and alternates the lifted foot', () => {
    const art = createRangerArt(), actor = art.instantiate(), lifted = new Set<number>();
    for (let frame = 0; frame < 180; frame++) {
      actor.update('run', 1 / 120); actor.root.updateMatrixWorld(true);
      const ankles = [-1, 1].map(side => actor.root.getObjectByName(`foot ${side}`)!.getWorldPosition(new THREE.Vector3()).y);
      expect(Math.min(...ankles)).toBeCloseTo(.108, 3);
      ankles.forEach((height, i) => {if (height > .2) lifted.add(i);});
    }
    expect(lifted.size).toBe(2);
    art.dispose();
  });
});

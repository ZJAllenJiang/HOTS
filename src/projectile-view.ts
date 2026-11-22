import * as THREE from 'three';
import type { Projectile } from './contracts';

interface BoltView {
  root: THREE.Group;
  charge: THREE.Group;
  bolt: THREE.Group;
  from: THREE.Vector3;
  target: THREE.Vector3;
  tick: number;
  blend: number;
}

function material(color: number, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color, opacity, toneMapped: false, transparent: opacity < 1, depthWrite: opacity === 1,
  });
}

/** Interpolates authoritative projectile positions for display. */
export class ProjectileView {
  private readonly views = new Map<number, BoltView>();
  private readonly active = new Set<number>();
  private readonly geometry = {
    crystal: new THREE.OctahedronGeometry(1),
    shaft: new THREE.CylinderGeometry(1, 1, 1, 6),
    cone: new THREE.ConeGeometry(1, 1, 4),
    halo: new THREE.RingGeometry(.84, 1, 24),
  };
  private readonly materials = {
    ice: material(0x818aff),
    iceCore: material(0xdeffff),
    iceWake: material(0xa4bfff, .43),
    arrow: material(0xffefb1),
    wind: material(0x9ef2ba),
    windWake: material(0xa6f4c0, .43),
    ally: material(0x56dcff),
    enemy: material(0xff7690),
  };

  constructor(private scene: THREE.Scene) {}

  private create(projectile: Projectile, tick: number): BoltView {
    const root = new THREE.Group();
    const bolt = new THREE.Group();
    const charge = new THREE.Group();
    root.add(bolt, charge);
    const frost = projectile.hero === 'frost';
    const team = projectile.team === 0 ? this.materials.ally : this.materials.enemy;
    const add = (
      parent: THREE.Group,
      geo: THREE.BufferGeometry,
      mat: THREE.MeshBasicMaterial,
      x: number, y: number, z: number, sx: number, sy: number, sz: number,
    ) => {
      const part = new THREE.Mesh(geo, mat);
      part.position.set(x, y, z);
      part.scale.set(sx, sy, sz);
      parent.add(part);
      return part;
    };
    const { crystal, halo, cone, shaft } = this.geometry;
    const { ice, iceCore, iceWake, arrow, wind, windWake } = this.materials;

    if (frost) {
      add(bolt, crystal, ice, 0, 0, -.08, .32, .29, .75).rotation.z = Math.PI / 4;
      add(bolt, crystal, iceCore, 0, .06, .17, .24, .22, .64);
      add(bolt, crystal, team, 0, 0, -.48, .25, .24, .32);
      for (let index = 0; index < 3; index++) {
        const tilt = (index - 1) * .19;
        add(bolt, crystal, iceWake, tilt, tilt, -.95 - index * .31, .13, .12, .36 - index * .07).rotation.y = tilt;
      }
    } else {
      add(bolt, cone, arrow, 0, 0, .34, .26, .58, .18).rotation.x = Math.PI / 2;
      add(bolt, shaft, wind, 0, 0, -.33, .065, 1.2, .065).rotation.x = Math.PI / 2;
      add(bolt, crystal, team, 0, .015, -.84, .25, .08, .37);
      for (const side of [-1, 1]) {
        add(bolt, crystal, windWake, side * .24, 0, -.86, .085, .08, .65).rotation.y = side * .16;
      }
    }

    const focus = add(charge, crystal, frost ? iceCore : arrow, 0, 0, 0, .55, .55, .75);
    focus.rotation.z = frost ? Math.PI / 4 : 0;
    add(charge, halo, team, 0, -.08, 0, .9, .9, 1).rotation.x = -Math.PI / 2;
    add(charge, halo, frost ? ice : wind, 0, 0, 0, 1.3, 1.3, 1).rotation.x = -Math.PI / 2;

    root.position.set(projectile.x, 1.2, projectile.z);
    root.rotation.y = Math.atan2(projectile.dirX, projectile.dirZ);
    this.scene.add(root);
    return { root, charge, bolt, from: root.position.clone(), target: root.position.clone(), tick, blend: 1 };
  }

  update(projectiles: readonly Projectile[], tick: number, dt: number): void {
    this.active.clear();
    for (const projectile of projectiles) {
      this.active.add(projectile.id);
      let view = this.views.get(projectile.id);
      if (!view) {
        view = this.create(projectile, tick);
        this.views.set(projectile.id, view);
      }
      if (view.tick !== tick) {
        view.from.copy(view.root.position);
        view.target.set(projectile.x, 1.2, projectile.z);
        view.tick = tick;
        view.blend = 0;
      }
      view.blend = Math.min(1, view.blend + Math.max(0, dt) / .05);
      view.root.position.lerpVectors(view.from, view.target, view.blend);
      const waiting = tick < projectile.launchTick;
      view.charge.visible = waiting;
      view.bolt.visible = !waiting;
      const windup = 1 - Math.min(3, Math.max(0, projectile.launchTick - tick - view.blend)) / 3;
      view.charge.scale.setScalar(.23 + .4 * windup);
      view.charge.rotation.y = windup * Math.PI;
    }
    for (const [id, view] of this.views) {
      if (this.active.has(id)) continue;
      this.scene.remove(view.root);
      this.views.delete(id);
    }
  }

  clear(): void {
    for (const view of this.views.values()) this.scene.remove(view.root);
    this.views.clear();
    this.active.clear();
  }

  dispose(): void {
    this.clear();
    for (const geo of Object.values(this.geometry)) geo.dispose();
    for (const mat of Object.values(this.materials)) mat.dispose();
  }
}

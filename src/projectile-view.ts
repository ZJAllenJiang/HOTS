import * as THREE from 'three';
import type { Effect, Projectile } from './contracts';

interface BoltView {
  root: THREE.Group;
  charge: THREE.Group;
  bolt: THREE.Group;
  from: THREE.Vector3;
  target: THREE.Vector3;
  tick: number;
  blend: number;
  origin: THREE.Vector3;
  releaseOffset: THREE.Vector3;
  launched: boolean;
  releaseAge: number;
  terminalAge?: number;
  terminalTrail: THREE.Mesh;
}

export type ProjectileReleasePosition = (projectile: Readonly<Projectile>) =>
  {x: number; y: number; z: number} | undefined;

const TICK_DURATION = .05;
const RELEASE_BLEND_DISTANCE = 2.4;
const CONTACT_TRAIL_DURATION = .1;

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

    // The last visible sample can lag contact by one tick. Preserve that final
    // segment on the same frame as authoritative hit feedback.
    const terminalTrail = add(root, shaft, frost ? iceWake : windWake, 0, 0, 0, .055, 1, .055);
    terminalTrail.rotation.x = Math.PI / 2;
    terminalTrail.visible = false;
    root.position.set(projectile.x, 1.2, projectile.z);
    root.rotation.y = Math.atan2(projectile.dirX, projectile.dirZ);
    this.scene.add(root);
    return {
      root, charge, bolt, terminalTrail,
      from: root.position.clone(), target: root.position.clone(), origin: root.position.clone(),
      releaseOffset: new THREE.Vector3(), tick, blend: 1,
      launched: tick > projectile.launchTick, releaseAge: 0,
    };
  }

  update(
    projectiles: readonly Projectile[], tick: number, dt: number,
    effects: readonly Effect[] = [], releasePosition?: ProjectileReleasePosition,
  ): void {
    const frame = Math.max(0, dt);
    this.active.clear();
    for (const projectile of projectiles) {
      this.active.add(projectile.id);
      let view = this.views.get(projectile.id);
      if (!view) {
        view = this.create(projectile, tick);
        this.views.set(projectile.id, view);
      }
      const waiting = tick < projectile.launchTick;
      if (waiting) {
        if (view.tick !== tick) {
          view.tick = tick;
          view.blend = 0;
        }
        view.blend = Math.min(1, view.blend + frame / TICK_DURATION);
        const release = releasePosition?.(projectile);
        if (release) view.root.position.set(release.x, release.y, release.z);
        else view.root.position.set(projectile.x, 1.2, projectile.z);
        view.releaseOffset.copy(view.root.position).sub(view.origin);
        view.from.copy(view.root.position);
        view.target.copy(view.root.position);
      } else {
        const releasing = !view.launched;
        if (releasing) {
          view.launched = true;
          view.releaseAge = 0;
          // Sample the committed release pose, not the preceding windup frame.
          const release = tick === projectile.launchTick ? releasePosition?.(projectile) : undefined;
          if (release) {
            view.root.position.set(release.x, release.y, release.z);
            view.releaseOffset.copy(view.root.position).sub(view.origin);
          }
        } else view.releaseAge += frame;
        if (view.tick !== tick || releasing) {
          view.from.copy(view.root.position);
          view.target.set(projectile.x, 1.2, projectile.z);
          // A weapon release joins the authoritative path gradually, avoiding
          // a jump back to the caster's centre on the launch tick.
          const travel = view.target.distanceTo(view.origin);
          view.target.addScaledVector(view.releaseOffset, Math.max(0, 1 - travel / RELEASE_BLEND_DISTANCE));
          view.tick = tick;
          view.blend = 0;
        }
        view.blend = Math.min(1, view.blend + frame / TICK_DURATION);
        view.root.position.lerpVectors(view.from, view.target, view.blend);
      }
      view.charge.visible = waiting;
      view.bolt.visible = !waiting;
      // Unfold the travelling silhouette out of the same release focus.
      view.bolt.scale.setScalar(.65 + .35 * Math.min(1, view.releaseAge / .08));
      const windup = 1 - Math.min(3, Math.max(0, projectile.launchTick - tick - view.blend)) / 3;
      view.charge.scale.setScalar(.23 + .4 * windup);
      view.charge.rotation.y = windup * Math.PI;
    }
    for (const [id, view] of this.views) {
      if (this.active.has(id)) continue;
      if (view.terminalAge === undefined) {
        const contact = effects.find(effect => effect.projectileId === id);
        if (contact) {
          const distance = Math.hypot(contact.x - view.root.position.x, contact.z - view.root.position.z);
          if (distance > .001) view.root.rotation.y = Math.atan2(contact.x - view.root.position.x, contact.z - view.root.position.z);
          view.root.position.set(contact.x, 1.2, contact.z);
          view.charge.visible = false;
          view.bolt.visible = true;
          view.bolt.scale.setScalar(.65);
          view.terminalTrail.visible = distance > .001;
          view.terminalTrail.position.z = -distance / 2;
          view.terminalTrail.scale.set(.055, distance, .055);
          view.terminalAge = 0;
          continue;
        }
      } else {
        view.terminalAge += frame;
        if (view.terminalAge < CONTACT_TRAIL_DURATION) {
          const fade = 1 - view.terminalAge / CONTACT_TRAIL_DURATION;
          view.terminalTrail.scale.x = view.terminalTrail.scale.z = .055 * fade;
          view.bolt.scale.setScalar(.65 * fade);
          continue;
        }
      }
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

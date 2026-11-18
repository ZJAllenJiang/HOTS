import * as THREE from 'three';
import type {Hero} from './contracts';
import type {HeroModels, ModelInstance} from './model-assets';

/** Use the arena renderer for a separately lit, animated hero portrait. */
export class HeroShowcase {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(31, 1, .1, 40);
  private model: ModelInstance | null = null;
  private hero?: Hero;
  private elapsed = 0;
  private readonly center = new THREE.Vector3();
  private height = 2.6;
  private width = 2.6;

  constructor() {
    const key = new THREE.DirectionalLight(0xffe1ba, 2.8);
    key.position.set(4, 6, 6);
    const rim = new THREE.DirectionalLight(0x6abfff, 2.8);
    rim.position.set(-4, 2, -4);
    this.scene.add(key, rim, new THREE.HemisphereLight(0xd8e9ff, 0x605568, 2));
  }

  select(hero: Hero, models: Pick<HeroModels, 'instantiate'>) {
    if (hero === this.hero) return this.model !== null;
    this.clear();
    this.hero = hero;
    this.model = models.instantiate(hero);
    if (!this.model) return false;
    this.model.update('idle', 0);
    this.scene.add(this.model.root);
    const bounds = new THREE.Box3().setFromObject(this.model.root);
    bounds.getCenter(this.center);
    const size = bounds.getSize(new THREE.Vector3());
    this.height = Math.max(size.y, 2.6);
    this.width = Math.max(size.x, size.z, 2.3);
    return true;
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, reducedMotion: boolean) {
    if (!reducedMotion) this.elapsed += dt;
    this.model?.update('idle', reducedMotion ? 0 : dt);
    const azimuth = .48 + (reducedMotion ? 0 : Math.sin(this.elapsed * .55) * .17);
    const span = Math.max(this.height * 1.26, this.width * 1.22 / this.camera.aspect);
    const radius = span / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    this.camera.position.set(this.center.x + Math.sin(azimuth) * radius,
      this.center.y + radius * .17, this.center.z + Math.cos(azimuth) * radius);
    this.camera.lookAt(this.center);
  }

  invalidate(hero: Hero) {
    if (hero === this.hero) this.clear();
  }

  clear() {
    this.model?.dispose();
    this.model = null;
    this.hero = undefined;
    this.elapsed = 0;
  }
}

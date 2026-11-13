import {loadArenaTower} from './arena-tower';
import {ProjectileView} from './projectile-view';
import {Locomotion,smoothing} from './locomotion';
import * as THREE from 'three';
import {QUALITY,type Quality} from './settings';
import {HeroModels,type ModelInstance} from './model-assets';
import type { Renderer, State, Unit, Effect, Hero } from './contracts';

// Original, procedural arena art. All geometry is local to this prototype.
export function createRenderer(container: HTMLElement,quality:Quality='balanced'): Renderer {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111d2b');
  scene.fog = new THREE.FogExp2('#192c39', 0.009);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY[quality].pixelRatio));
  renderer.shadowMap.enabled = QUALITY[quality].shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 240);
  let distance = 45;
  const focus = new THREE.Vector3(-6, 0, 0);
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersection = new THREE.Vector3();
  const colors = { blue: 0x4edcff, purple: 0xff688e, gold: 0xd6b573, stone: 0x53606a, dark: 0x24343f };
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const geometries: THREE.BufferGeometry[] = [];
  function geo<T extends THREE.BufferGeometry>(g: T): T { geometries.push(g); return g; }
  const cube = geo(new THREE.BoxGeometry(1, 1, 1));
  const ball = geo(new THREE.SphereGeometry(1, 12, 8));
  const cone = geo(new THREE.ConeGeometry(1, 1, 6));
  const cylinder = geo(new THREE.CylinderGeometry(1, 1, 1, 10));
  const crystalGeo = geo(new THREE.OctahedronGeometry(1, 0));
  const plane = geo(new THREE.PlaneGeometry(1, 1));
  const ringGeometries = new Map<string, THREE.RingGeometry>();
  const bowGeometry = geo(new THREE.TorusGeometry(.56, .055, 6, 20, Math.PI * 1.4));
  const shieldGeometry = geo(new THREE.CylinderGeometry(.63, .48, .15, 6));
  const enamelGeometry = geo(new THREE.CylinderGeometry(.51, .4, .17, 6));
  const haloGeometry = geo(new THREE.TorusGeometry(1.3, .055, 6, 48));
  function mat(color: number, metalness = .12, roughness = .75, glow = 0): THREE.MeshStandardMaterial {
    const key = `${color}/${metalness}/${roughness}/${glow}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive: color, emissiveIntensity: glow }));
    return mats.get(key)!;
  }
  function mesh(parent: THREE.Object3D, g: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(g, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(p: THREE.Object3D, c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) { return mesh(p, cube, mat(c), x, y, z, sx, sy, sz); }
  function orb(p: THREE.Object3D, c: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, glow = 0) { return mesh(p, ball, mat(c, .2, .6, glow), x, y, z, sx, sy, sz); }
  function cyl(p: THREE.Object3D, c: number, x: number, y: number, z: number, radius: number, height: number) { return mesh(p, cylinder, mat(c), x, y, z, radius, height, radius); }
  function ring(p: THREE.Object3D, c: number, radius: number, width: number, y: number, glow = .6) {
    const key = `${radius}/${width}`;
    let geometry = ringGeometries.get(key);
    if (!geometry) { geometry = geo(new THREE.RingGeometry(radius - width, radius, 48)); ringGeometries.set(key, geometry); }
    const r = mesh(p, geometry, mat(c, .3, .4, glow), 0, y, 0); r.rotation.x = -Math.PI / 2; r.castShadow = false; return r;
  }
  scene.add(new THREE.HemisphereLight(0xa9d6ed, 0x223c34, 2.4));
  const sun = new THREE.DirectionalLight(0xffe1b1, 3.5); sun.position.set(-16, 36, 16); sun.castShadow = true;
  sun.shadow.mapSize.set(QUALITY[quality].shadowSize, QUALITY[quality].shadowSize); sun.shadow.camera.left = -48; sun.shadow.camera.right = 48; sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28;
  sun.shadow.normalBias = .055; sun.shadow.bias = -.0003; scene.add(sun);
  const rim = new THREE.DirectionalLight(0x7aabff, 2); rim.position.set(12, 8, -20); scene.add(rim);

  // Raised stone causeway, weathered pavers, and wooded ravine banks.
  box(scene, 0x1c3034, 0, -1.25, 0, 90, 2, 39);
  box(scene, 0x3d4b50, 0, -.37, 0, 77, .68, 18.2);
  box(scene, 0x3a4d49, 0, -.42, -13, 90, .6, 9);
  box(scene, 0x334640, 0, -.42, 13, 90, .6, 9);
  const matrix = new THREE.Matrix4(); const position = new THREE.Vector3(); const quaternion = new THREE.Quaternion(); const scale = new THREE.Vector3();
  let seed = 73531;
  function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  const tiles = new THREE.InstancedMesh(cube, mat(0x70797a, .05, .95), 1260);
  let ti = 0;
  for (let x = -37; x <= 37; x += 1.5) for (let z = -7.9; z <= 7.9; z += .67) {
    position.set(x + ((Math.round(z / .67) % 2) ? .7 : 0), -.065 + random() * .03, z);
    quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, (random() - .5) * .04);
    scale.set(1.39, .14, .58); matrix.compose(position, quaternion, scale); tiles.setMatrixAt(ti, matrix);
    tiles.setColorAt(ti++, new THREE.Color().setHSL(.105 + random() * .035, .075, .31 + random() * .11));
  }
  tiles.count = ti; tiles.receiveShadow = true; scene.add(tiles);
  for (const z of [-8.75, 8.75]) {
    box(scene, 0x8a8e80, 0, .06, z, 77, .24, .55);
    box(scene, 0xa09164, 0, .19, z + Math.sign(z) * .19, 76, .09, .07);
    for (let x = -36; x <= 36; x += 3.8) { const cap = box(scene, 0x6b7771, x, .23, z, .7, .44, .8); cap.rotation.y = .08; }
  }
  const plaza = new THREE.Group(); scene.add(plaza);
  mesh(plaza, cylinder, mat(0x45535b), 0, .015, 0, 5.5, .19, 5.5);
  ring(plaza, 0xa69570, 5.3, .09, .12, .04); ring(plaza, 0x8b8b7e, 4.8, .045, .12, 0);
  ring(plaza, 0xb4aa85, 2.35, .075, .125, .08);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const mark = box(plaza, 0xa89b77, Math.sin(a) * 3.6, .13, Math.cos(a) * 3.6, .09, .03, 1.55); mark.rotation.y = a;
  }
  const rune = mesh(plaza, crystalGeo, mat(0xa8ad97, .1, .8), 0, .12, 0, 1.1, .035, 1.1); rune.rotation.y = Math.PI / 4;
  // Chunky, original foliage silhouettes, built in batches to keep the scene inexpensive.
  const foliageGeo = geo(new THREE.IcosahedronGeometry(1, 0));
  const leaves = new THREE.InstancedMesh(foliageGeo, mat(0x294d43), 360);
  const rocks = new THREE.InstancedMesh(foliageGeo, mat(0x536268), 170);
  let li = 0, ri = 0;
  for (let i = 0; i < 80; i++) {
    const x = -43 + random() * 86; const z = (i % 2 ? -1 : 1) * (11 + random() * 7); const h = 2.6 + random() * 4.2;
    const trunk = cyl(scene, 0x39433c, x, h * .28, z, .16 + random() * .17, h * .6); trunk.rotation.z = (random() - .5) * .14;
    for (let j = 0; j < 3; j++) {
      position.set(x + (random() - .5) * 1.5, h * (.55 + j * .12), z + (random() - .5) * 1.5);
      scale.set(1.4 + random() * .8, 1.3 + random(), 1.3 + random()); quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, random() * 6);
      matrix.compose(position, quaternion, scale); leaves.setMatrixAt(li, matrix); leaves.setColorAt(li++, new THREE.Color().setHSL(.39 + random() * .05, .21 + random() * .1, .15 + random() * .07));
    }
  }
  leaves.count = li; leaves.castShadow = true; leaves.receiveShadow = true; scene.add(leaves);
  for (let i = 0; i < 160; i++) {
    position.set(-43 + random() * 86, random() * .35, (i % 2 ? -1 : 1) * (9.6 + random() * 9));
    scale.set(.35 + random() * 1.1, .3 + random() * .9, .4 + random()); quaternion.setFromEuler(new THREE.Euler(random(), random() * 6, random()));
    matrix.compose(position, quaternion, scale); rocks.setMatrixAt(ri++, matrix);
  }
  rocks.count = ri; rocks.castShadow = true; rocks.receiveShadow = true; scene.add(rocks);
  for (const x of [-29, -15, 15, 29]) for (const z of [-9.4, 9.4]) {
    const p = new THREE.Group(); p.position.set(x, 0, z); scene.add(p);
    cyl(p, 0x3e5059, 0, .45, 0, .5, .9); cyl(p, 0xb39d68, 0, .9, 0, .38, .16);
    const lamp = mesh(p, crystalGeo, mat(x < 0 ? colors.blue : colors.purple, .3, .25, 1.7), 0, 1.36, 0, .24, .5, .24); lamp.rotation.y = Math.PI / 4;
  }
  for (const sign of [-1, 1]) {
    const gate = new THREE.Group(); gate.position.x = sign * 35; scene.add(gate);
    ring(gate, sign < 0 ? colors.blue : colors.purple, 6.3, .1, .09, .4);
    for (const z of [-6.2, 6.2]) {
      const p = new THREE.Group(); p.position.set(0, 0, z); gate.add(p);
      cyl(p, 0x44525f, 0, .35, 0, 1.1, .7); box(p, 0x485867, 0, 2, 0, .85, 3.2, .85);
      box(p, 0xb9a071, 0, 3.5, 0, 1.2, .18, 1.2);
      mesh(p, crystalGeo, mat(sign < 0 ? colors.blue : colors.purple, .5, .3, 1), 0, 4.25, 0, .5, .85, .5);
    }
  }

  interface Visual { locomotion:Locomotion; actionSequence?:number; model?:ModelInstance; root: THREE.Group; body: THREE.Group; bar: THREE.Group; health: THREE.Mesh; mana?: THREE.Mesh; weapon?: THREE.Group; glow?: THREE.Object3D; facing: number; kind: string; hero: Hero; }
  const visuals = new Map<number, Visual>();
  let tower: Awaited<ReturnType<typeof loadArenaTower>> | undefined;
  let disposed = false;
  void loadArenaTower().then(asset => {
    if (disposed) { asset.dispose(); return; }
    tower = asset;
    for (const [id, visual] of visuals) {
      if (visual.kind !== 'tower') continue;
      scene.remove(visual.root);
      visuals.delete(id);
    }
  }).catch(error => console.warn('Arena tower asset unavailable. Using the built-in tower.', error));
  const hpBg = new THREE.MeshBasicMaterial({ color: 0x101b24, depthTest: false });
  const hpAlly = new THREE.MeshBasicMaterial({ color: 0x6ceac3, depthTest: false });
  const hpEnemy = new THREE.MeshBasicMaterial({ color: 0xff748a, depthTest: false });
  const manaMaterial = new THREE.MeshBasicMaterial({ color: 0x5b9fff, depthTest: false });
  const models=new HeroModels(hero=>{
    for(const [id,v] of visuals)if(v.hero===hero&&(v.kind==='hero'||v.kind==='dummy')){v.model?.dispose();scene.remove(v.root);visuals.delete(id);}
  });
  void models.loadDefaults();
  function healthbar(u: Unit, root: THREE.Group, y: number, width: number) {
    const bar = new THREE.Group(); bar.position.y = y; root.add(bar); bar.renderOrder = 30;
    const bg = mesh(bar, plane, hpBg, 0, 0, 0, width + .09, .18, 1); bg.castShadow = false; bg.renderOrder = 30;
    const health = mesh(bar, plane, u.team === 0 ? hpAlly : hpEnemy, 0, 0, .01, width, .085, 1); health.castShadow = false; health.renderOrder = 31;
    let mana: THREE.Mesh | undefined;
    if (u.kind === 'hero') { mana = mesh(bar, plane, manaMaterial, 0, -.095, .01, width, .035, 1); mana.renderOrder = 31; }
    return { bar, health, mana };
  }
  function makeUnit(u: Unit): Visual {
    const root = new THREE.Group(); root.position.set(u.x, 0, u.z); scene.add(root);
    const body = new THREE.Group(); root.add(body);
    const tc = u.team === 0 ? colors.blue : colors.purple;
    const armor = u.team === 0 ? 0x41768f : 0x80608a;
    const trim = mat(0xe4c389, .7, .35);
    let weapon: THREE.Group | undefined, glow: THREE.Object3D | undefined;
    let barHeight = 2.8, barWidth = 1.65;
    if (u.kind === 'hero' || u.kind === 'dummy') {
      ring(root, tc, u.hero === 'guardian' ? .98 : .8, .075, .08, .8);
      ring(root, 0xe6e3b0, u.hero === 'guardian' ? .87 : .69, .025, .085, .25);
      const skin = u.hero === 'frost' ? 0xe1ebeb : 0xd5ae91;
      const suit = u.hero === 'ranger' ? 0x304f62 : u.hero === 'frost' ? 0x6c8ab0 : armor;
      // The model faces +Z, its orientation follows movement and attack targets.
      const broad = u.hero === 'guardian' ? 1.2 : .8;
      for (const s of [-1, 1]) {
        box(body, 0x263a4b, s * .22, .49, 0, .26 * broad, .65, .29);
        box(body, 0x334858, s * .22, .19, .12, .3 * broad, .26, .49);
      }
      const torso = mesh(body, cone, mat(suit, .35, .55), 0, 1.2, 0, .56 * broad, .88, .4); torso.rotation.z = Math.PI;
      box(body, 0xc4a66d, 0, .91, .04, .8 * broad, .12, .42);
      orb(body, skin, 0, 1.98, .015, .25, .32, .25);
      box(body, 0x202d3d, 0, 1.66, 0, .28, .17, .24);
      for (const s of [-1, 1]) {
        orb(body, u.hero === 'guardian' ? 0xd3bf85 : suit, s * .48 * broad, 1.5, 0, .29 * broad, .27, .3);
        const arm = box(body, suit, s * .51 * broad, 1.17, .1, .23, .51, .23); arm.rotation.z = s * .16;
        orb(body, skin, s * .54 * broad, .91, .17, .13);
      }
      // Tailored cape, shoulder clasp, and a strong individual weapon silhouette.
      const cape = mesh(body, cone, mat(u.hero === 'ranger' ? 0x263949 : u.hero === 'frost' ? 0xcee1ed : 0x9b503a), 0, 1.03, -.27, .61 * broad, 1.26, .25); cape.rotation.z = Math.PI;
      cape.rotation.x = -.12;
      weapon = new THREE.Group(); body.add(weapon);
      if (u.hero === 'ranger') {
        mesh(body, ball, mat(0x293e52), 0, 2.04, -.08, .32, .38, .3);
        box(body, skin, 0, 1.97, .228, .31, .23, .06);
        for (const s of [-1, 1]) { const ear = mesh(body, cone, mat(skin), s * .3, 2.01, .02, .105, .32, .08); ear.rotation.z = -s * 1.15; }
        box(body, 0xc9ad74, 0, 1.45, .35, .14, .5, .08).rotation.z = -.55;
        const quiver = cyl(body, 0x6a4d38, .3, 1.49, -.4, .17, .74); quiver.rotation.z = -.3;
        for (let i = 0; i < 3; i++) { const arrow = cyl(body, 0xc5b698, .18 + i * .08, 1.9, -.42, .015, .5); arrow.rotation.z = -.3; }
        const bow = mesh(weapon, bowGeometry, trim, -.68, 1.25, .35); bow.rotation.set(0, .35, -Math.PI * .2);
        const string = box(weapon, 0xc4d8d1, -.66, 1.27, .35, .018, 1.03, .018); string.rotation.z = -.12;
        box(weapon, 0xddd0ac, -.33, 1.2, .53, .8, .025, .025);
        barHeight = 2.75;
      } else if (u.hero === 'frost') {
        const hair = mesh(body, cone, mat(0xe5eff7, .2, .35), 0, 2.19, -.02, .31, .52, .3); hair.rotation.x = -.2;
        for (const s of [-1, 1]) {
          mesh(body, crystalGeo, mat(0x9fdaed, .4, .25, .3), s * .45, 1.6, -.02, .16, .34, .23).rotation.z = -s * .5;
          box(body, 0xc8d6e4, s * .29, .68, .02, .15, .78, .42).rotation.z = -s * .2;
        }
        const staff = cyl(weapon, 0xc9b181, .68, 1.33, .13, .045, 2.45); staff.rotation.z = -.06;
        glow = mesh(weapon, crystalGeo, mat(0x8ceaff, .4, .2, 1.2), .75, 2.65, .13, .23, .42, .23);
        ring(weapon, 0xb6f0ff, .35, .025, 2.57, .8).position.x = .75;
        barHeight = 3.15;
      } else {
        box(body, 0xb8b6a1, 0, 2.03, 0, .61, .53, .53);
        box(body, 0x172d3b, 0, 2.07, .28, .44, .08, .025);
        box(body, 0xd1ae70, 0, 2.35, 0, .12, .16, .5);
        box(body, 0xd5b980, 0, 1.39, .35, .46, .48, .09);
        mesh(body, crystalGeo, mat(tc, .5, .2, .7), 0, 1.45, .44, .13, .17, .065);
        const shield = new THREE.Group(); shield.position.set(-.75, 1.1, .38); body.add(shield);
        const face = mesh(shield, shieldGeometry, trim, 0, 0, 0); face.rotation.x = Math.PI / 2;
        const enamel = mesh(shield, enamelGeometry, mat(armor), 0, 0, .04); enamel.rotation.x = Math.PI / 2;
        box(shield, 0xe5c98e, 0, 0, .15, .1, .75, .05); box(shield, 0xe5c98e, 0, 0, .15, .61, .1, .05);
        cyl(weapon, 0x9d7e50, .77, 1.08, .15, .07, 1.45);
        box(weapon, 0xc9b78d, .77, 1.83, .15, .74, .4, .4);
        box(weapon, 0x7c959f, .77, 1.83, .15, .39, .46, .45);
        barHeight = 2.95; barWidth = 1.9;
      }
    } else if (u.kind === 'minion') {
      for (const s of [-1, 1]) box(body, 0x253b4e, s * .15, .25, 0, .19, .42, .23);
      orb(body, armor, 0, .65, 0, .35, .43, .29);
      orb(body, 0xa8aaa1, 0, 1.08, .03, .25, .25, .23);
      box(body, 0x21333f, 0, 1.08, .23, .3, .065, .03);
      box(body, tc, 0, .76, .27, .17, .27, .05);
      box(body, 0xacb3a7, .39, .72, .21, .09, .8, .1).rotation.z = -.25;
      box(body, armor, -.33, .7, .2, .16, .48, .36);
      ring(root, tc, .42, .035, .05, .3); barHeight = 1.65; barWidth = .88;
    } else if (u.kind === 'tower') {
      if (tower) {
        const asset = tower.instantiate(u.team);
        body.add(asset.root);
        glow = asset.crystal;
      } else {
        cyl(body, 0x303e4b, 0, .24, 0, 1.37, .48); cyl(body, 0x74828a, 0, .58, 0, 1.1, .24);
        cyl(body, 0x425868, 0, 1.38, 0, .77, 1.5); cyl(body, 0xd0b07a, 0, 2.12, 0, 1, .17);
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + Math.PI / 4;
          const buttress = box(body, 0x70808a, Math.sin(a) * .78, 1.19, Math.cos(a) * .78, .33, 1.5, .37); buttress.rotation.y = a;
          mesh(body, cone, trim, Math.sin(a) * .73, 2.57, Math.cos(a) * .73, .19, .8, .19);
        }
        glow = mesh(body, crystalGeo, mat(tc, .45, .18, 1.2), 0, 2.9, 0, .53, 1, .53);
      }
      ring(root, tc, 1.75, .055, .09, .4); barHeight = 4.15; barWidth = 2.45;
    } else {
      cyl(body, 0x3a4759, 0, .3, 0, 2.35, .6); cyl(body, 0x9b9d91, 0, .65, 0, 1.95, .18);
      cyl(body, 0x56667b, 0, .98, 0, 1.47, .55);
      ring(root, tc, 2.65, .08, .09, .6);
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        const arm = box(body, 0xbca576, Math.sin(a) * 1.39, 1.69, Math.cos(a) * 1.39, .34, 1.9, .34); arm.rotation.set(Math.cos(a) * .35, a, -Math.sin(a) * .35);
        mesh(body, crystalGeo, mat(tc, .45, .25, .6), Math.sin(a) * 1.65, 2.6, Math.cos(a) * 1.65, .24, .55, .24);
      }
      glow = mesh(body, crystalGeo, mat(tc, .4, .2, 1.5), 0, 2.75, 0, 1.05, 1.75, 1.05);
      const halo = mesh(body, haloGeometry, trim, 0, 2.8, 0); halo.rotation.x = .5;
      barHeight = 4.9; barWidth = 3;
    }
    const model=(u.kind==='hero'||u.kind==='dummy')?models.instantiate(u.hero):null;
    if(model){body.clear();body.add(model.root);weapon=undefined;glow=undefined;}
    body.rotation.y=u.team===0?Math.PI/2:-Math.PI/2;
    const bars = healthbar(u, root, barHeight, barWidth);
    return { locomotion:new Locomotion(u.x,u.z), model:model??undefined, root, body, ...bars, weapon, glow, facing: u.team === 0 ? Math.PI / 2 : -Math.PI / 2, kind: u.kind, hero: u.hero };
  }
  const destination = new THREE.Group(); scene.add(destination);
  ring(destination, 0xf6deb0, .44, .045, .15, .85);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const mark = box(destination, 0xf6deb0, Math.sin(a) * .63, .12, Math.cos(a) * .63, .1, .055, .19); mark.rotation.y = a; }
  interface FX { root: THREE.Group; ring: THREE.Mesh; motes: THREE.Mesh[]; initialLife: number; }
  const effects = new Map<Effect, FX>();
  const projectileView=new ProjectileView(scene);
  const fxMaterials = [0x6be6ff, 0xff7aab, 0x78efb6].map(color => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .65, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  const selection = new THREE.Group(); scene.add(selection); ring(selection, 0xffe3a0, 1.08, .035, .1, 1.1);
  const effectRingGeo = geo(new THREE.RingGeometry(.84, 1, 48));
  const active = new Set<number>(); const fxActive = new Set<Effect>();
  let elapsed = 0; let lastState:State|undefined;
  function resize() { const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  function update(s: State, dt: number) {
    if(lastState!==s){visuals.forEach(v=>{v.model?.dispose();scene.remove(v.root);});visuals.clear();projectileView.clear();lastState=s;}
    const frame = Math.min(Math.max(dt, 0), .1); elapsed += frame;
    active.clear();
    const player = s.units.find(u => u.id === s.playerId);
    if (player) { focus.x += (player.x * .28 - focus.x) * smoothing(2.7,frame); focus.z += (player.z * .28 - focus.z) * smoothing(2.7,frame); }
    camera.position.set(focus.x, distance * .87, focus.z + distance * .71); camera.lookAt(focus.x, 0, focus.z);
    for (const u of s.units) {
      active.add(u.id); let v = visuals.get(u.id);
      if (v && (v.kind !== u.kind || v.hero !== u.hero)) { v.model?.dispose(); scene.remove(v.root); visuals.delete(u.id); v = undefined; }
      if (!v) { v = makeUnit(u); visuals.set(u.id, v); }
      v.root.visible = u.alive;
      if (!u.alive) {v.actionSequence=u.visualAction?.sequence;continue;}
      const {dx,dz,moving,displaced}=v.locomotion.sample(u.x,u.z,s.time);
      const target = u.target === null ? undefined : s.units.find(other => other.id === u.target && other.alive);
      const action=u.visualAction;
      const newAction=action&&action.sequence!==v.actionSequence&&s.time-action.time<.3;
      if(newAction){v.facing=Math.atan2(action.x-u.x,action.z-u.z);v.model?.play(action.kind);}
      v.actionSequence=action?.sequence;
      if (!newAction&&displaced) v.facing = Math.atan2(dx, dz);
      else if (!newAction&&!moving&&target) v.facing = Math.atan2(target.x - u.x, target.z - u.z);
      const rotationDelta = Math.atan2(Math.sin(v.facing - v.body.rotation.y), Math.cos(v.facing - v.body.rotation.y));
      v.body.rotation.y += rotationDelta * smoothing(13,frame);
      v.root.position.x += (u.x - v.root.position.x) * smoothing(20,frame);
      v.root.position.z += (u.z - v.root.position.z) * smoothing(20,frame);
      if(v.model){v.model.update(moving?'run':'idle',frame);}
      else if (u.kind === 'hero' || u.kind === 'minion' || u.kind === 'dummy') {
        v.body.position.y = moving ? Math.abs(Math.sin(elapsed * 10 + u.id)) * .09 : Math.sin(elapsed * 2 + u.id) * .025;
        v.body.rotation.z = moving ? Math.sin(elapsed * 10 + u.id) * .035 : 0;
        if (v.weapon) v.weapon.rotation.x = target && u.attackCooldown > .25 ? Math.sin(elapsed * 13) * .25 : Math.sin(elapsed * 2) * .025;
      }
      if (v.glow) { v.glow.rotation.y += frame * .8; v.glow.position.y += Math.sin(elapsed * 2 + u.id) * frame * .08; }
      v.bar.quaternion.copy(camera.quaternion);
      const width = u.kind === 'core' ? 3 : u.kind === 'tower' ? 2.45 : u.kind === 'minion' ? .88 : u.hero === 'guardian' ? 1.9 : 1.65;
      const hp = Math.max(0, Math.min(1, u.hp / u.maxHp));
      v.health.scale.x = width * hp; v.health.position.x = -width * (1 - hp) / 2;
      if (v.mana) { const mana = Math.max(0, Math.min(1, u.mana / u.maxMana)); v.mana.scale.x = width * mana; v.mana.position.x = -width * (1 - mana) / 2; }
    }
    for (const [id, v] of visuals) if (!active.has(id)) { v.model?.dispose(); scene.remove(v.root); visuals.delete(id); }
    destination.visible = !!player?.alive && !!player.dest;
    selection.visible = !!player?.alive;
    if (player) { selection.position.set(player.x, 0, player.z); selection.scale.setScalar(1 + Math.sin(elapsed * 3) * .025); }
    if (player?.dest) { destination.position.set(player.dest.x, 0, player.dest.z); destination.rotation.y = elapsed * .6; destination.scale.setScalar(1 + Math.sin(elapsed * 6) * .07); }
    fxActive.clear();
    for (const e of s.effects) {
      fxActive.add(e); let fx = effects.get(e);
      if (!fx) {
        const root = new THREE.Group(); root.position.set(e.x, .15, e.z); scene.add(root);
        const r = mesh(root, effectRingGeo, fxMaterials[e.kind === 'heal' ? 2 : e.team === 0 ? 0 : 1], 0, 0, 0); r.rotation.x = -Math.PI / 2; r.castShadow = false;
        const motes: THREE.Mesh[] = [];
        for (let i = 0; i < (e.kind === 'attack' ? 0 : 7); i++) { const p = mesh(root, crystalGeo, mat(e.kind === 'heal' ? 0xa8ffd1 : e.team === 0 ? 0xb7f4ff : 0xffb2ce, .2, .2, 1.2), 0, 0, 0, .09, .24, .09); p.castShadow = false; motes.push(p); }
        fx = { root, ring: r, motes, initialLife: e.life }; effects.set(e, fx);
      }
      const r = Math.max(.3, e.radius); const progress = 1 - Math.max(0, e.life / fx.initialLife); const pulse = .65 + progress * .4;
      fx.root.scale.setScalar(Math.min(1, Math.max(.05, e.life * 9)));
      const height = e.kind === 'ultimate' ? 3.1 : e.kind === 'heal' ? 1.7 : .9;
      fx.ring.scale.set(r * pulse, r * pulse, 1);
      fx.root.rotation.y = elapsed * .4;
      for (let i = 0; i < fx.motes.length; i++) { const a = i * Math.PI * 2 / fx.motes.length + elapsed; const p = fx.motes[i]; p.position.set(Math.cos(a) * r * .8, .25 + Math.abs(Math.sin(a * 2 + elapsed * 5)) * height, Math.sin(a) * r * .8); p.rotation.y = elapsed * 3; }
    }
    for (const [e, fx] of effects) if (!fxActive.has(e)) { scene.remove(fx.root); effects.delete(e); }
    projectileView.update(s.projectiles,s.tick,frame);
    renderer.render(scene, camera);
  }
  return {
    update,
    importModel(hero,data){return models.import(hero,data);},
    setQuality(value){
      const preset=QUALITY[value];renderer.setPixelRatio(Math.min(window.devicePixelRatio,preset.pixelRatio));
      renderer.shadowMap.enabled=preset.shadows;sun.shadow.mapSize.set(preset.shadowSize,preset.shadowSize);
      sun.shadow.map?.dispose();sun.shadow.map=null;renderer.shadowMap.needsUpdate=true;resize();
    },
    pick(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect(); mouse.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
      ray.setFromCamera(mouse, camera); ray.ray.intersectPlane(ground, intersection);
      return { x: THREE.MathUtils.clamp(intersection.x, -36, 36), z: THREE.MathUtils.clamp(intersection.z, -8, 8) };
    },
    zoom(delta) { distance = THREE.MathUtils.clamp(distance + delta * .018, 28, 65); },
    dispose() { disposed = true; tower?.dispose(); projectileView.dispose(); visuals.forEach(v=>v.model?.dispose()); models.dispose(); observer.disconnect(); tiles.dispose(); leaves.dispose(); rocks.dispose(); geometries.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); [hpBg, hpAlly, hpEnemy, manaMaterial, ...fxMaterials].forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove(); }
  };
}

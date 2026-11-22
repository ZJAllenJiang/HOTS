import {CombatFx} from './combat-fx';
import {AbilityAim} from './ability-aim';
import {DamageNumbers} from './damage-numbers';
import {createLaneMinionArt} from './lane-minion-art';
import {HeroShowcase} from './hero-showcase';
import {loadArenaTower} from './arena-tower';
import {batchStaticArena} from './static-arena';
import {ProjectileView} from './projectile-view';
import {Locomotion,gaitRate,smoothing} from './locomotion';
import * as THREE from 'three';
import {QUALITY,type Quality} from './settings';
import {HeroModels,type ModelInstance} from './model-assets';
import type {CastAim, Projectile, Renderer, State, Unit, Hero} from './contracts';
import {PROJECTILE_RULES} from './projectiles';
import {FROST_AREA_RULES,isProjectileCast} from './sim';

// Original, procedural arena art. All geometry is local to this prototype.
export function createRenderer(container: HTMLElement,quality:Quality='balanced'): Renderer {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111d2b');
  scene.fog = new THREE.FogExp2('#192c39', 0.009);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
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
  let buildingArena = true;
  const arenaMeshes: THREE.Mesh<THREE.BufferGeometry, THREE.Material>[] = [];
  function geo<T extends THREE.BufferGeometry>(g: T): T { geometries.push(g); return g; }
  const cube = geo(new THREE.BoxGeometry(1, 1, 1));
  const cone = geo(new THREE.ConeGeometry(1, 1, 6));
  const cylinder = geo(new THREE.CylinderGeometry(1, 1, 1, 10));
  const crystalGeo = geo(new THREE.OctahedronGeometry(1, 0));
  const plane = geo(new THREE.PlaneGeometry(1, 1));
  const ringGeometries = new Map<string, THREE.RingGeometry>();
  const haloGeometry = geo(new THREE.TorusGeometry(1.3, .055, 6, 48));
  function mat(color: number, metalness = .12, roughness = .75, glow = 0): THREE.MeshStandardMaterial {
    const key = `${color}/${metalness}/${roughness}/${glow}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive: color, emissiveIntensity: glow }));
    return mats.get(key)!;
  }
  function mesh(parent: THREE.Object3D, g: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(g, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; parent.add(m); if (buildingArena) arenaMeshes.push(m); return m;
  }
  function box(p: THREE.Object3D, c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) { return mesh(p, cube, mat(c), x, y, z, sx, sy, sz); }
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
  buildingArena = false;
  geometries.push(...batchStaticArena(scene, arenaMeshes));
  arenaMeshes.length = 0;

  interface Visual { positionEpoch?:number; wasAlive:boolean; speed:number; locomotion:Locomotion; actionSequence?:number; model?:ModelInstance; minion?:ReturnType<ReturnType<typeof createLaneMinionArt>['instantiate']>; root: THREE.Group; body: THREE.Group; bar: THREE.Group; health: THREE.Mesh; hit:THREE.Mesh; slow?:THREE.Mesh; mana?: THREE.Mesh; glow?: THREE.Object3D; facing: number; kind: string; hero: Hero; }
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
  const hitMaterial = new THREE.MeshBasicMaterial({color:0xfff4db,depthTest:false,depthWrite:false,toneMapped:false});
  const slowGeometry = geo(new THREE.RingGeometry(.88,1.04,6));
  const slowMaterial = new THREE.MeshBasicMaterial({color:0xb8f1ff,transparent:true,opacity:.84,depthWrite:false,toneMapped:false});
  const showcase = new HeroShowcase();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const models=new HeroModels(hero=>{
    showcase.invalidate(hero);
    for(const [id,v] of visuals)if(v.hero===hero&&(v.kind==='hero'||v.kind==='dummy')){v.model?.dispose();scene.remove(v.root);visuals.delete(id);}
  });
  const laneMinions=createLaneMinionArt();
  function healthbar(u: Unit, root: THREE.Group, y: number, width: number) {
    const bar = new THREE.Group(); bar.position.y = y; root.add(bar); bar.renderOrder = 30;
    const bg = mesh(bar, plane, hpBg, 0, 0, 0, width + .09, .18, 1); bg.castShadow = false; bg.renderOrder = 30;
    const health = mesh(bar, plane, u.team === 0 ? hpAlly : hpEnemy, 0, 0, .01, width, .085, 1); health.castShadow = false; health.renderOrder = 31;
    const hit = mesh(bar,plane,hitMaterial,0,.085,.02,width,.04,1);
    hit.castShadow = hit.receiveShadow = hit.visible = false;
    hit.renderOrder = 32;
    let mana: THREE.Mesh | undefined;
    if (u.kind === 'hero') { mana = mesh(bar, plane, manaMaterial, 0, -.095, .01, width, .035, 1); mana.castShadow = false; mana.renderOrder = 31; }
    return { bar, health, hit, mana };
  }
  function makeUnit(u: Unit): Visual {
    const root = new THREE.Group(); root.position.set(u.x, 0, u.z); scene.add(root);
    const body = new THREE.Group(); root.add(body);
    const tc = u.team === 0 ? colors.blue : colors.purple;
    const trim = mat(0xe4c389, .7, .35);
    let minion: Visual['minion'];
    let glow: THREE.Object3D | undefined;
    let model: ModelInstance | null = null;
    let barHeight = 2.8, barWidth = 1.65;
    if (u.kind === 'hero' || u.kind === 'dummy') {
      ring(root, tc, u.hero === 'guardian' ? .98 : .8, .075, .08, .8);
      ring(root, 0xe6e3b0, u.hero === 'guardian' ? .87 : .69, .025, .085, .25);
      model = models.instantiate(u.hero);
      if (model) body.add(model.root);
      if (u.hero === 'guardian') { barHeight = 2.95; barWidth = 1.9; }
      if (u.hero === 'frost') barHeight = 3.15;
    } else if (u.kind === 'minion') {
      minion=laneMinions.instantiate(u.team,u.id);
      body.add(minion.root);
      barHeight = 1.8; barWidth = .88;
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
    body.rotation.y=u.team===0?Math.PI/2:-Math.PI/2;
    const bars = healthbar(u, root, barHeight, barWidth);
    let slow:THREE.Mesh|undefined;
    if(u.kind==='hero'||u.kind==='minion'){
      const scale=u.kind==='hero'?1.22:.66;
      slow=mesh(root,slowGeometry,slowMaterial,0,.16,0,scale,scale,1);
      slow.rotation.x=-Math.PI/2;
      slow.castShadow=slow.receiveShadow=slow.visible=false;
    }
    return { positionEpoch:u.positionEpoch, wasAlive:u.alive, speed:0, locomotion:new Locomotion(u.x,u.z), model:model??undefined, minion, root, body, ...bars, slow, glow, facing: u.team === 0 ? Math.PI / 2 : -Math.PI / 2, kind: u.kind, hero: u.hero };
  }
  const destination = new THREE.Group(); scene.add(destination);
  ring(destination, 0xf6deb0, .44, .045, .15, .85);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const mark = box(destination, 0xf6deb0, Math.sin(a) * .63, .12, Math.cos(a) * .63, .1, .055, .19); mark.rotation.y = a; }
  const combatFx = new CombatFx(scene);
  const damageNumbers = new DamageNumbers(container);
  const projectileView = new ProjectileView(scene);
  const abilityAim = new AbilityAim();
  scene.add(abilityAim.root);
  const releasePoint = new THREE.Vector3();
  function projectileRelease(projectile: Readonly<Projectile>) {
    const visual=visuals.get(projectile.sourceId);
    const source=unitsById.get(projectile.sourceId);
    if(!visual||!source?.alive||source.visualAction?.ability!=='q')return;
    const anchor=visual.model?.projectileAnchor;
    if(anchor)return anchor.getWorldPosition(releasePoint);
    const position=visual.root.position;
    return releasePoint.set(position.x+projectile.dirX*.6,1.5,position.z+projectile.dirZ*.6);
  }
  const selection = new THREE.Group(); scene.add(selection); ring(selection, 0xffe3a0, 1.08, .035, .1, 1.1);
  const unitsById = new Map<number, Unit>();
  const latestHits = new Map<number,number>();
  let elapsed = 0; let lastState:State|undefined;
  let surface = container;
  function resize() {
    const width = Math.max(1, surface.clientWidth);
    const height = Math.max(1, surface.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    showcase.resize(width, height);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(surface);
  resize();
  function attach(host: HTMLElement) {
    if (surface === host) return;
    observer.unobserve(surface);
    surface = host;
    host.appendChild(renderer.domElement);
    observer.observe(host);
    resize();
  }
  function showHero(hero: Hero, host: HTMLElement, dt: number) {
    if (!showcase.select(hero, models)) {
      attach(container);
      return false;
    }
    attach(host);
    showcase.update(Math.min(Math.max(dt, 0), .1), reducedMotion.matches);
    renderer.render(showcase.scene, showcase.camera);
    return true;
  }
  function update(s: State, dt: number, aim?: CastAim) {
    if (surface !== container) {
      showcase.clear();
      attach(container);
    }
    if (lastState !== s) {
      visuals.forEach(v => { v.model?.dispose(); scene.remove(v.root); });
      visuals.clear();
      projectileView.clear();
      combatFx.clear();
      damageNumbers.clear();
      const player = s.units.find(u => u.id === s.playerId);
      if (player) focus.set(player.x * .28, 0, player.z * .28);
      lastState = s;
    }
    const frame = Math.min(Math.max(dt, 0), .1); elapsed += frame;
    unitsById.clear();
    for (const u of s.units) unitsById.set(u.id, u);
    latestHits.clear();
    for(const hit of s.damageEvents)if(s.time-hit.time<.15)latestHits.set(hit.targetId,hit.time);
    const player = unitsById.get(s.playerId);
    if (player) { focus.x += (player.x * .28 - focus.x) * smoothing(2.7,frame); focus.z += (player.z * .28 - focus.z) * smoothing(2.7,frame); }
    camera.position.set(focus.x, distance * .87, focus.z + distance * .71); camera.lookAt(focus.x, 0, focus.z);
    for (const u of s.units) {
      let v = visuals.get(u.id);
      if (v && (v.kind !== u.kind || v.hero !== u.hero || (!v.wasAlive && u.alive))) { v.model?.dispose(); scene.remove(v.root); visuals.delete(u.id); v = undefined; }
      if (!v) { v = makeUnit(u); visuals.set(u.id, v); }
      v.root.visible = u.alive;
      v.wasAlive = u.alive;
      if (!u.alive) {v.actionSequence=u.visualAction?.sequence;continue;}
      if (v.positionEpoch !== u.positionEpoch) {
        v.root.position.set(u.x, 0, u.z);
        v.locomotion.reset(u.x, u.z);
        v.positionEpoch = u.positionEpoch;
        v.speed = 0;
      }
      const {dx,dz,moving,displaced}=v.locomotion.sample(u.x,u.z,s.time);
      const candidate = u.target === null ? undefined : unitsById.get(u.target);
      const target = candidate?.alive ? candidate : undefined;
      const action=u.visualAction;
      const newAction=action&&action.sequence!==v.actionSequence&&s.time-action.time<.3;
      let windup=0;
      if(action?.ability&&isProjectileCast(u.hero,action.ability))windup=PROJECTILE_RULES.windupTicks*.05;
      if(action?.ability==='w'&&u.hero==='frost')windup=FROST_AREA_RULES.telegraphSeconds;
      const releasing=!!action&&windup>0&&s.time-action.time<=windup+1e-8;
      if(newAction){
        const dx = action.x - u.x, dz = action.z - u.z;
        if (Math.hypot(dx, dz) > .001) v.facing = Math.atan2(dx,dz);
        v.model?.play(action.kind,action.ability);
        if (action.kind === 'attack') v.minion?.attack();
      }
      v.actionSequence=action?.sequence;
      if (!releasing&&!newAction&&displaced) v.facing = Math.atan2(dx, dz);
      else if (!releasing&&!newAction&&!moving&&target) v.facing = Math.atan2(target.x - u.x, target.z - u.z);
      const rotationDelta = Math.atan2(Math.sin(v.facing - v.body.rotation.y), Math.cos(v.facing - v.body.rotation.y));
      v.body.rotation.y += rotationDelta * smoothing(releasing?27:13,frame);
      const positionBlend = smoothing(20,frame);
      const renderDx = (u.x - v.root.position.x) * positionBlend;
      const renderDz = (u.z - v.root.position.z) * positionBlend;
      v.root.position.x += renderDx;
      v.root.position.z += renderDz;
      const speed = frame > 0 ? Math.hypot(renderDx, renderDz) / frame : 0;
      v.speed += (speed - v.speed) * smoothing(10,frame);
      if(v.model){v.model.update(moving?'run':'idle',frame,gaitRate(v.speed));}
      else if (v.minion) {
        v.minion.root.position.y = Math.hypot(v.root.position.x, v.root.position.z) < 5.3 ? .088 : 0;
        v.minion.update(v.speed,frame);
      }
      if (v.glow) { v.glow.rotation.y += frame * .8; v.glow.position.y += Math.sin(elapsed * 2 + u.id) * frame * .08; }
      v.bar.quaternion.copy(camera.quaternion);
      const width = u.kind === 'core' ? 3 : u.kind === 'tower' ? 2.45 : u.kind === 'minion' ? .88 : u.hero === 'guardian' ? 1.9 : 1.65;
      const hp = Math.max(0, Math.min(1, u.hp / u.maxHp));
      v.health.scale.x = width * hp; v.health.position.x = -width * (1 - hp) / 2;
      const hitTime=latestHits.get(u.id);
      v.hit.visible=hitTime!==undefined;
      if(hitTime!==undefined)v.hit.scale.x=width*(1-(s.time-hitTime)/.15);
      if(v.slow)v.slow.visible=u.slowUntilTick!==undefined&&s.tick<=u.slowUntilTick;
      if (v.mana) { const mana = Math.max(0, Math.min(1, u.mana / u.maxMana)); v.mana.scale.x = width * mana; v.mana.position.x = -width * (1 - mana) / 2; }
    }
    for (const [id, v] of visuals) if (!unitsById.has(id)) { v.model?.dispose(); scene.remove(v.root); visuals.delete(id); }
    destination.visible = !!player?.alive && !!player.dest;
    selection.visible = !!player?.alive;
    if (player) { const position = visuals.get(player.id)?.root.position ?? player; selection.position.set(position.x, 0, position.z); selection.scale.setScalar(1 + Math.sin(elapsed * 3) * .025); }
    if (player?.dest) { destination.position.set(player.dest.x, 0, player.dest.z); destination.rotation.y = elapsed * .6; destination.scale.setScalar(1 + Math.sin(elapsed * 6) * .07); }
    abilityAim.update(s,player,aim);
    projectileView.update(s.projectiles,s.tick,frame,s.effects,projectileRelease);
    combatFx.update(s.effects,frame,s.playerId);
    camera.updateMatrixWorld();
    damageNumbers.update(s.damageEvents,s.time,frame,camera,container.clientWidth,container.clientHeight);
    renderer.render(scene, camera);
  }
  return {
    update,
    showHero,
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
    dispose() { disposed = true; tower?.dispose(); abilityAim.dispose(); projectileView.dispose(); combatFx.dispose(); damageNumbers.dispose(); laneMinions.dispose(); showcase.clear(); visuals.forEach(v=>v.model?.dispose()); models.dispose(); observer.disconnect(); tiles.dispose(); leaves.dispose(); rocks.dispose(); geometries.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); [hpBg, hpAlly, hpEnemy, manaMaterial, hitMaterial, slowMaterial].forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove(); }
  };
}

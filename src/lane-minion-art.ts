import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

type Team = 0 | 1;

export interface LaneMinionVisual {
  root: THREE.Group;
  attack(): void;
  update(speed: number, dt: number): void;
}

const PALETTES = [
  {enamel: 0x007c8d, cloth: 0x0d5361, light: 0x53e4de, mark: 0xa2fff2},
  {enamel: 0xa6294b, cloth: 0x762b40, light: 0xff6a82, mark: 0xffb9ba},
] as const;

const STONE = 0x53626a;
const PALE_STONE = 0xa5b4ae;
const DARK = 0x242f36;
const BRONZE = 0xa47846;
const BRASS = 0xe5bb77;

const UPPER_LEG = .26;
const LOWER_LEG = .255;
const ANKLE = .095;
const HIP = .552;
const TORSO = .605;
const STRIDE_TRAVEL = .46;
const STANCE_FRACTION = .57;
const TAU = Math.PI * 2;

// Bevelled, flat-shaded plates give the small silhouettes readable edges.
function plate(profile: readonly (readonly [number, number])[], bevel = .075) {
  const shape = new THREE.Shape();
  shape.moveTo(...profile[0]);
  for (const [x, y] of profile.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 1 - 2 * bevel,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    steps: 1,
  }).center();
}

function stamp(
  shape: THREE.BufferGeometry, tint: number,
  x: number, y: number, z: number,
  width: number, height: number, depth: number,
  pitch = 0, yaw = 0, roll = 0,
) {
  const geometry = shape.index ? shape.toNonIndexed() : shape.clone();
  geometry.deleteAttribute('uv');
  geometry.scale(width, height, depth).rotateX(pitch).rotateY(yaw).rotateZ(roll).translate(x, y, z);
  const color = new THREE.Color(tint);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function bake(...pieces: THREE.BufferGeometry[]) {
  const geometry = mergeGeometries(pieces);
  pieces.forEach(piece => piece.dispose());
  return geometry;
}

function shadowGeometry() {
  const shadow = new THREE.RingGeometry(0, 1, 24, 6);
  const positions = shadow.attributes.position;
  const colors = new Float32Array(positions.count * 4);
  for (let i = 0; i < positions.count; i++) {
    const radius = Math.hypot(positions.getX(i), positions.getY(i));
    colors.set([1, 1, 1, .48 * Math.max(0, 1 - radius) ** 1.65], 4 * i);
  }
  shadow.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  return shadow.rotateX(-Math.PI / 2).scale(.65, 1, .56);
}

function markGeometry() {
  const arcs = [-Math.PI * .32, Math.PI * .68].map(start =>
    new THREE.RingGeometry(.386, .426, 13, 1, start, Math.PI * .65),
  );
  return bake(...arcs).rotateX(-Math.PI / 2);
}

export function createLaneMinionArt() {
  const block = plate([
    [-.31, -.43], [.31, -.43], [.43, -.31], [.43, .31],
    [.31, .43], [-.31, .43], [-.43, .31], [-.43, -.31],
  ]);
  const cuirass = plate([
    [-.24, -.43], [.24, -.43], [.44, .18], [.30, .43],
    [-.30, .43], [-.44, .18],
  ]);
  const mask = plate([
    [-.21, -.42], [.21, -.42], [.36, -.18], [.41, .21],
    [.24, .42], [-.24, .42], [-.41, .21], [-.36, -.18],
  ]);
  const shield = plate([
    [-.39, .37], [-.27, .43], [.27, .43], [.39, .37],
    [.39, .03], [.28, -.22], [0, -.44], [-.28, -.22], [-.39, .03],
  ], .055);
  const axe = plate([
    [-.35, -.30], [-.10, -.22], [.19, -.40], [.38, -.30], [.45, .05],
    [.35, .38], [.06, .43], [-.20, .23], [-.35, .23],
  ], .045);
  const lozenge = new THREE.OctahedronGeometry(1);
  const shaft = new THREE.CylinderGeometry(.5, .5, 1, 6);

  const upperLeg = bake(
    stamp(shaft, DARK, 0, -.095, 0, .17, .26, .17),
    stamp(block, STONE, 0, -.105, .034, .162, .176, .14, -.05),
  );
  const lowerLeg = bake(
    stamp(shaft, DARK, 0, -.122, 0, .115, .26, .12),
    stamp(block, BRONZE, 0, -.025, .065, .165, .105, .112, .15),
    stamp(block, PALE_STONE, 0, -.134, .046, .14, .15, .105, -.08),
  );
  const foot = bake(
    stamp(block, DARK, 0, -.020, .047, .185, .087, .278),
    stamp(block, STONE, 0, .008, .054, .172, .105, .247),
    stamp(block, BRONZE, 0, .005, .146, .158, .052, .075),
  );

  const kit = PALETTES.map(team => ({
    body: bake(
      stamp(block, DARK, 0, .018, 0, .405, .187, .30),
      stamp(cuirass, STONE, 0, .294, .006, .604, .477, .407, .10),
      stamp(cuirass, PALE_STONE, 0, .327, .165, .475, .334, .145, .11),
      stamp(cuirass, team.cloth, 0, .137, -.168, .533, .446, .122, .20),
      stamp(block, team.enamel, 0, .360, -.19, .397, .215, .17, -.29),
      stamp(block, BRONZE, 0, .375, -.285, .386, .042, .048, -.29),
      stamp(block, BRONZE, 0, .099, .005, .459, .093, .365),
      stamp(block, team.enamel, 0, .049, .199, .193, .245, .077, -.18),
      stamp(lozenge, team.light, 0, .30, .249, .091, .118, .041),
      stamp(shaft, DARK, 0, .530, .022, .19, .176, .174),
      stamp(mask, STONE, 0, .692, .042, .357, .318, .317, -.06),
      stamp(mask, PALE_STONE, 0, .758, .020, .353, .191, .329, -.09),
      stamp(block, DARK, 0, .699, .202, .262, .077, .057, .04),
      stamp(block, team.light, -.057, .704, .233, .065, .030, .03, .03, -.11),
      stamp(block, team.light, .057, .704, .233, .065, .030, .03, .03, .11),
      stamp(block, BRONZE, 0, .792, .123, .086, .084, .234, .22),
      stamp(block, team.enamel, 0, .836, -.001, .131, .110, .248, .10),
      stamp(block, team.light, 0, .897, -.035, .086, .040, .160, .10),
      stamp(block, BRASS, 0, .432, .181, .271, .034, .117, .20),
    ),
    shieldArm: bake(
      stamp(block, DARK, -.031, -.156, .003, .193, .366, .229, -.26, 0, -.12),
      stamp(cuirass, BRONZE, -.024, -.025, .006, .317, .260, .353, .14, 0, -.57),
      stamp(cuirass, team.enamel, -.036, .009, .020, .278, .206, .327, .14, 0, -.57),
      stamp(block, BRASS, -.097, .061, .008, .059, .045, .235, -.03, .13, -.40),
      bake(
        stamp(shield, BRONZE, 0, 0, 0, .52, .62, .133),
        stamp(shield, BRASS, 0, .008, .046, .489, .583, .057),
        stamp(shield, team.enamel, 0, .016, .080, .417, .506, .062),
        stamp(lozenge, BRONZE, 0, .02, .122, .129, .149, .055),
        stamp(lozenge, team.light, 0, .025, .167, .076, .095, .039),
        stamp(block, team.mark, -.091, -.081, .117, .037, .21, .026, 0, 0, -.73),
        stamp(block, team.mark, .091, -.081, .117, .037, .21, .026, 0, 0, .73),
        stamp(block, BRASS, -.131, .154, .113, .035, .034, .025),
        stamp(block, BRASS, .131, .154, .113, .035, .034, .025),
      ).rotateX(-.83).rotateY(-.20).translate(-.085, -.226, .268),
    ),
    weaponArm: bake(
      stamp(block, DARK, .046, -.146, .033, .207, .353, .202, -.29, 0, .26),
      stamp(cuirass, BRONZE, .026, -.016, .006, .290, .245, .305, .21, 0, .58),
      stamp(cuirass, team.enamel, .035, .011, .019, .246, .186, .278, .21, 0, .58),
      stamp(block, BRASS, .090, .067, .023, .052, .043, .184, .14, 0, .48),
      stamp(block, PALE_STONE, .107, -.279, .143, .161, .163, .187, .06, -.18),
      bake(
        stamp(shaft, 0x60483c, 0, .067, 0, .071, .646, .082),
        stamp(shaft, BRONZE, 0, -.242, 0, .108, .071, .108),
        stamp(shaft, BRASS, 0, .157, 0, .103, .116, .105),
        stamp(axe, BRONZE, .08, .287, 0, .37, .337, .12),
        stamp(axe, PALE_STONE, .111, .294, .009, .326, .310, .123),
        stamp(axe, STONE, .049, .291, .009, .192, .224, .138),
        stamp(lozenge, team.light, .074, .284, 0, .052, .059, .082),
      ).rotateX(.83).rotateZ(-.16).translate(.107, -.290, .143),
    ),
  }));
  [axe, block, cuirass, lozenge, mask, shaft, shield].forEach(geometry => geometry.dispose());

  const contact = shadowGeometry();
  const marker = markGeometry();
  const armor = new THREE.MeshStandardMaterial({vertexColors: true, metalness: .24, roughness: .66});
  const shadow = new THREE.MeshBasicMaterial({
    color: 0x101924, vertexColors: true, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1,
  });
  const marks = PALETTES.map(team => new THREE.MeshBasicMaterial({
    color: team.light, transparent: true, opacity: .83, depthWrite: false, toneMapped: false,
  }));

  function sculpt(geometry: THREE.BufferGeometry, parent: THREE.Object3D, name: string) {
    const mesh = new THREE.Mesh(geometry, armor);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  return {
    instantiate(team: Team, id: number): LaneMinionVisual {
      const root = new THREE.Group();
      root.name = 'Lane sentry';
      // Ground overlays stay level while the upper body leans and the feet lift.
      const contactMesh = new THREE.Mesh(contact, shadow);
      contactMesh.position.y = .043;
      const markerMesh = new THREE.Mesh(marker, marks[team]);
      markerMesh.position.y = .054;
      markerMesh.renderOrder = 1;
      root.add(contactMesh, markerMesh);

      const frame = new THREE.Group();
      frame.scale.x = id % 2 ? 1 : -1;
      root.add(frame);
      const torso = new THREE.Group();
      frame.add(torso);
      sculpt(kit[team].body, torso, 'Cuirass and helm');
      const shieldArm = sculpt(kit[team].shieldArm, torso, 'Shield arm');
      const weaponArm = sculpt(kit[team].weaponArm, torso, 'Axe arm');
      shieldArm.position.set(-.268, .464, 0);
      weaponArm.position.set(.268, .464, .01);

      const legs = [-1, 1].map(side => ({
        side,
        upper: sculpt(upperLeg, frame, 'Thigh'),
        lower: sculpt(lowerLeg, frame, 'Shin'),
        boot: sculpt(foot, frame, 'Boot'),
      }));
      let cycle = (id * .381966) % 1;
      let time = 0;
      let attackTime = Infinity;

      // Solve the knee in the sagittal plane from the planted or swinging foot.
      function poseLeg(leg: typeof legs[number], hipY: number, hipZ: number, ankleY: number, ankleZ: number) {
        const dy = ankleY - hipY;
        const dz = ankleZ - hipZ;
        const length = Math.max(.001, Math.hypot(dy, dz));
        const distance = Math.min(length, UPPER_LEG + LOWER_LEG - .0001);
        const along = (UPPER_LEG ** 2 - LOWER_LEG ** 2 + distance ** 2) / (2 * distance);
        const bend = Math.sqrt(Math.max(0, UPPER_LEG ** 2 - along ** 2));
        const kneeY = hipY + (dy * along + dz * bend) / length;
        const kneeZ = hipZ + (dz * along - dy * bend) / length;
        const x = leg.side * .132;
        leg.upper.position.set(x, hipY, hipZ);
        leg.upper.rotation.x = Math.atan2(hipZ - kneeZ, hipY - kneeY);
        leg.lower.position.set(x, kneeY, kneeZ);
        leg.lower.rotation.x = Math.atan2(kneeZ - ankleZ, kneeY - ankleY);
        leg.boot.position.set(x, ankleY, ankleZ);
      }

      function update(speed: number, dt: number) {
        const weight = THREE.MathUtils.clamp(speed / 1.55, 0, 1);
        time += dt;
        if (weight > .01) cycle = (cycle + speed * dt * STANCE_FRACTION / (STRIDE_TRAVEL * weight)) % 1;
        attackTime += dt;
        const armSwing = Math.cos(cycle * TAU) * .26 * weight;
        const impact = Math.max(0, 1 - Math.abs(attackTime - .084) / .084);
        const recovery = attackTime > .084 ? Math.max(0, 1 - (attackTime - .084) / .24) ** 2 : 0;
        const strike = Math.max(impact, recovery);
        const bob = (.5 - .5 * Math.cos(cycle * TAU * 2)) * .019 * weight;
        const breathe = Math.sin(time * 3 + id) * .009 * (1 - weight);
        const lean = strike * .080;

        torso.position.set(0, TORSO + bob + breathe - strike * .022, lean);
        torso.rotation.set(.08 + weight * .06 + strike * .17, strike * .23, armSwing * .16);
        shieldArm.rotation.set(.09 + armSwing - strike * .22, strike * .17, -.06);
        weaponArm.rotation.set(.08 - armSwing - strike * 1.27, -.16 + strike * .74, .06 + strike * .28);

        legs.forEach((leg, index) => {
          const step = (cycle + index * .5) % 1;
          const swing = Math.max(0, (step - STANCE_FRACTION) / (1 - STANCE_FRACTION));
          const reach = step < STANCE_FRACTION
            ? .5 - step / STANCE_FRACTION
            : -.5 + swing * swing * (3 - 2 * swing);
          const lift = .134 * Math.sin(Math.PI * swing) ** 2 * weight;
          poseLeg(leg, HIP + bob - strike * .022, lean, ANKLE + lift, STRIDE_TRAVEL * reach * weight);
        });
      }

      update(0, 0);
      return {root, update, attack() { attackTime = 0; }};
    },
    dispose() {
      [contact, marker, upperLeg, lowerLeg, foot].forEach(geometry => geometry.dispose());
      kit.forEach(({body, shieldArm, weaponArm}) => {
        body.dispose();
        shieldArm.dispose();
        weaponArm.dispose();
      });
      [armor, shadow, ...marks].forEach(material => material.dispose());
    },
  };
}

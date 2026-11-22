import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {ModelInstance} from './model-assets';

/** Original field scout: all rigid parts are baked once, then reused by every actor. */
export function createRangerArt() {
  const colors = {
    moss: 0x496445, leaf: 0x778557, shade: 0x24382f, leather: 0x61442f,
    ochre: 0xc6954d, ivory: 0xe1d6ac, copper: 0xac673c, steel: 0x88978b,
    skin: 0xc7936d, string: 0xeddfba, arrow: 0xd0f3b7,
  };
  const surface = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .72, metalness: .12});
  const luminous = new THREE.MeshStandardMaterial({color: colors.arrow, emissive: colors.arrow, emissiveIntensity: .7, roughness: .5});
  const primitives = {
    box: new THREE.BoxGeometry(), shell: new THREE.IcosahedronGeometry(1, 0),
    plate: new THREE.CylinderGeometry(1, .82, 1, 8), tube: new THREE.CylinderGeometry(1, 1, 1, 6),
    point: new THREE.OctahedronGeometry(1),
  };
  const geometries: THREE.BufferGeometry[] = [];
  type Part = {shape: THREE.BufferGeometry; color: number; p: [number, number, number]; s: [number, number, number]; r?: [number, number, number]};
  const part = (shape: THREE.BufferGeometry, color: number, p: Part['p'], s: Part['s'], r?: Part['r']): Part => ({shape, color, p, s, r});
  const {box, shell, plate, tube, point} = primitives;
  function bake(parts: Part[]) {
    const transform = new THREE.Object3D();
    const pieces = parts.map(spec => {
      const geometry = spec.shape.index ? spec.shape.toNonIndexed() : spec.shape.clone();
      transform.position.set(...spec.p); transform.scale.set(...spec.s); transform.rotation.set(...(spec.r ?? [0, 0, 0])); transform.updateMatrix();
      geometry.applyMatrix4(transform.matrix);
      // One opaque material, including trim, avoids a draw call for every tiny plate.
      const color = new THREE.Color(spec.color), data = new Float32Array(geometry.getAttribute('position').count * 3);
      for (let i = 0; i < data.length; i += 3) { data[i] = color.r; data[i + 1] = color.g; data[i + 2] = color.b; }
      geometry.setAttribute('color', new THREE.BufferAttribute(data, 3));
      geometry.deleteAttribute('uv');
      return geometry;
    });
    const geometry = mergeGeometries(pieces, false)!;
    pieces.forEach(piece => piece.dispose());
    geometry.computeBoundingSphere(); geometries.push(geometry);
    return geometry;
  }
  function beam(a: [number, number, number], b: [number, number, number], width: number, color: number): Part {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return part(tube, color, from.add(to).multiplyScalar(.5).toArray() as Part['p'], [width, direction.length(), width], [euler.x, euler.y, euler.z]);
  }

  const torsoGeometry = bake([
    part(plate, colors.moss, [0, .37, 0], [.32, .67, .21]),
    part(plate, colors.shade, [0, .09, 0], [.30, .14, .23]),
    part(shell, colors.leather, [0, .38, .15], [.30, .34, .115]),
    part(box, colors.ochre, [-.065, .39, .254], [.072, .60, .036], [0, 0, -.46]),
    part(box, colors.ivory, [.12, .43, .248], [.06, .34, .04], [0, 0, .6]),
    part(box, colors.copper, [0, .11, .25], [.18, .095, .045]),
    part(point, colors.ivory, [0, .11, .279], [.066, .043, .025]),
    part(shell, colors.ochre, [-.34, .62, -.008], [.255, .19, .265]),
    part(shell, colors.ivory, [-.37, .68, .015], [.24, .12, .245]),
    part(shell, colors.leaf, [.34, .60, 0], [.21, .16, .22]),
    part(box, colors.leather, [.29, .13, .09], [.18, .18, .16], [0, 0, -.18]),
    part(box, colors.copper, [.29, .19, .18], [.13, .04, .02]),
  ]);
  const headGeometry = bake([
    part(shell, colors.moss, [0, .17, -.035], [.33, .37, .305]),
    part(shell, colors.shade, [0, .135, .18], [.242, .25, .145]),
    part(shell, colors.skin, [0, .13, .255], [.178, .20, .072]),
    part(shell, colors.leaf, [0, .34, .115], [.30, .16, .26], [.2, 0, 0]),
    part(box, colors.ochre, [0, .363, .21], [.36, .043, .085], [.13, 0, 0]),
    part(shell, colors.shade, [0, .014, .24], [.21, .123, .092]),
    part(box, colors.ivory, [-.077, .175, .311], [.082, .024, .018], [0, 0, -.1]),
    part(box, colors.ivory, [.077, .175, .311], [.082, .024, .018], [0, 0, .1]),
    part(point, colors.copper, [0, .125, .329], [.032, .051, .025]),
  ]);
  const thighGeometry = bake([
    part(plate, colors.shade, [0, -.235, 0], [.145, .47, .14]),
    part(shell, colors.leather, [0, -.18, .105], [.14, .21, .065]),
  ]);
  const shinGeometry = bake([
    part(plate, colors.leather, [0, -.19, 0], [.12, .39, .13]),
    part(shell, colors.ivory, [0, -.065, .10], [.13, .15, .065]),
    part(box, colors.ochre, [0, -.23, .115], [.19, .045, .038]),
  ]);
  const footGeometry = bake([
    part(box, colors.shade, [0, -.07, .075], [.235, .105, .36]),
    part(shell, colors.leather, [0, -.01, .13], [.145, .115, .24]),
    part(box, colors.copper, [0, -.038, .24], [.17, .04, .07]),
  ]);
  const upperArmGeometry = bake([
    part(plate, colors.moss, [0, -.5, 0], [.122, 1, .128]),
    part(shell, colors.leaf, [0, -.19, 0], [.15, .28, .15]),
  ]);
  const forearmGeometry = bake([
    part(plate, colors.leather, [0, -.5, 0], [.106, 1, .11]),
    part(box, colors.copper, [0, -.42, .105], [.14, .55, .035]),
    part(box, colors.ivory, [0, -.34, .128], [.045, .37, .014]),
  ]);
  const handGeometry = bake([part(shell, colors.leather, [0, 0, 0], [.115, .12, .115])]);
  const cloakShape = new THREE.Shape();
  cloakShape.moveTo(-.31, 0); cloakShape.lineTo(.31, 0); cloakShape.lineTo(.54, -.89);
  cloakShape.lineTo(.18, -.75); cloakShape.lineTo(.07, -1.03); cloakShape.lineTo(-.07, -.83);
  cloakShape.lineTo(-.47, -.94); cloakShape.closePath();
  const cape = new THREE.ExtrudeGeometry(cloakShape, {depth: .045, bevelEnabled: false});
  const cloakGeometry = bake([
    part(cape, colors.moss, [0, 0, 0], [1, 1, 1]),
    part(box, colors.ochre, [-.31, -.42, -.016], [.075, .75, .025], [0, 0, -.12]),
    part(shell, colors.leaf, [.1, -.35, -.025], [.28, .42, .035]),
    part(box, colors.leather, [.19, -.27, -.044], [.10, .59, .028], [0, 0, -.43]),
  ]);
  cape.dispose();
  // A diagonal quiver remains visible above the cape from the playing camera.
  const quiverParts: Part[] = [
    part(plate, colors.leather, [.20, .32, -.29], [.17, .70, .14], [0, 0, -.38]),
    part(plate, colors.copper, [.32, .64, -.29], [.18, .075, .15], [0, 0, -.38]),
  ];
  for (let i = 0; i < 3; i++) {
    const x = .25 + i * .067;
    quiverParts.push(beam([x, .60, -.29], [x + .13, .93 + i * .02, -.29], .014, colors.ochre));
    quiverParts.push(part(shell, colors.ivory, [x + .12, .90 + i * .02, -.29], [.056, .11, .026], [0, 0, -.38]));
  }
  const quiverGeometry = bake(quiverParts);

  // Wide recurved limbs lie obliquely across the ground plane, so the weapon reads at RTS scale.
  const bowParts: Part[] = [part(plate, colors.leather, [0, 0, .23], [.065, .20, .065], [0, 0, Math.PI / 2])];
  const bowPoints: [number, number, number][] = [
    [-.89, .10, -.06], [-.79, .055, .17], [-.56, .015, .35], [-.29, 0, .35], [0, 0, .23],
    [.29, 0, .35], [.56, .015, .35], [.79, .055, .17], [.89, .10, -.06],
  ];
  for (let i = 1; i < bowPoints.length; i++) {
    bowParts.push(beam(bowPoints[i - 1], bowPoints[i], i === 1 || i === 8 ? .035 : .053, colors.copper));
    if (i === 3 || i === 6) bowParts.push(part(point, colors.ivory, bowPoints[i], [.075, .065, .10]));
  }
  bowParts.push(part(point, colors.ivory, [-.89, .10, -.06], [.068, .05, .12]));
  bowParts.push(part(point, colors.ivory, [.89, .10, -.06], [.068, .05, .12]));
  const bowGeometry = bake(bowParts);
  const stringGeometry = bake([part(tube, colors.string, [0, 0, 0], [1, 1, 1])]);
  const arrowGeometry = bake([
    part(tube, colors.ochre, [0, 0, .14], [.013, 1.0, .013], [Math.PI / 2, 0, 0]),
    part(box, colors.ivory, [0, 0, -.29], [.10, .018, .14], [0, .35, 0]),
    part(box, colors.ivory, [0, 0, -.29], [.018, .10, .14]),
  ]);

  function instantiate(): ModelInstance & {projectileAnchor: THREE.Object3D} {
    const root = new THREE.Group(); root.name = 'Briarpath Ranger';
    function joint(parent: THREE.Object3D, name: string, x: number, y: number, z: number) {
      const group = new THREE.Group(); group.name = name; group.position.set(x, y, z); parent.add(group); return group;
    }
    function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material = surface) {
      const object = new THREE.Mesh(geometry, material); parent.add(object);
      object.castShadow = material === surface; object.receiveShadow = material === surface; return object;
    }
    const hips = joint(root, 'hips', 0, .985, 0);
    const torso = joint(hips, 'aim', 0, 0, 0); mesh(torso, torsoGeometry);
    const head = joint(torso, 'hood', 0, .89, .01); mesh(head, headGeometry);
    const cloak = joint(torso, 'split cloak', 0, .65, -.21); mesh(cloak, cloakGeometry);
    mesh(torso, quiverGeometry);
    const legs = [-1, 1].map(side => {
      const thigh = joint(hips, `thigh ${side}`, side * .18, 0, 0); mesh(thigh, thighGeometry);
      const shin = joint(thigh, `shin ${side}`, 0, -.47, 0); mesh(shin, shinGeometry);
      const foot = joint(shin, `foot ${side}`, 0, -.40, 0); mesh(foot, footGeometry);
      return {thigh, shin, foot};
    });
    const arms = [-1, 1].map(side => {
      const upper = joint(torso, `upper arm ${side}`, side * .34, .60, 0); mesh(upper, upperArmGeometry);
      const lower = joint(torso, `bracer ${side}`, 0, 0, 0); mesh(lower, forearmGeometry);
      const hand = joint(torso, `hand ${side}`, 0, 0, 0); mesh(hand, handGeometry);
      return {upper, lower, hand};
    });
    const bow = joint(torso, 'recurve bow', 0, .55, .70); mesh(bow, bowGeometry);
    const strings = [mesh(bow, stringGeometry), mesh(bow, stringGeometry)];
    strings.forEach(string => { string.castShadow = false; string.receiveShadow = false; });
    const arrow = joint(bow, 'nocked arrow', 0, .015, 0); mesh(arrow, arrowGeometry);
    const arrowhead = mesh(arrow, point, luminous); arrowhead.position.z = .69; arrowhead.scale.set(.063, .035, .14);
    const projectileAnchor = joint(bow, 'projectile origin', 0, .015, .80);

    const down = new THREE.Vector3(0, -1, 0), up = new THREE.Vector3(0, 1, 0);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), direction = new THREE.Vector3();
    const shoulderPoint = new THREE.Vector3(), elbowPoint = new THREE.Vector3(), targetPoint = new THREE.Vector3();
    function limb(group: THREE.Group, from: THREE.Vector3, to: THREE.Vector3) {
      direction.subVectors(to, from); group.position.copy(from); group.scale.y = direction.length();
      group.quaternion.setFromUnitVectors(down, direction.normalize());
    }
    function stringLink(object: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) {
      direction.subVectors(to, from); object.position.copy(from).add(to).multiplyScalar(.5);
      object.scale.set(.009, direction.length(), .009); object.quaternion.setFromUnitVectors(up, direction.normalize());
    }
    let elapsed = 0, stride = 0, running = 0, actionTime = 10;
    let action: 'attack' | 'cast' | undefined;
    function update(motion: 'idle' | 'run', dt: number, rate = 1) {
      elapsed += dt;
      running = THREE.MathUtils.lerp(running, motion === 'run' ? 1 : 0, 1 - Math.exp(-14 * dt));
      stride += dt * 2.35 * rate * running;
      const cycle = stride * Math.PI * 2, step = Math.sin(cycle) * running;
      hips.position.y = .985 - running * (.065 + .023 * Math.abs(Math.cos(cycle))) + Math.sin(elapsed * 2.7) * .005;
      legs.forEach(({thigh, shin, foot}, i) => {
        const phase = (stride + i * .5) % 1;
        const forward = Math.cos(phase * Math.PI * 2) * .34 * running;
        const lift = phase < .5 ? 0 : -Math.sin(phase * Math.PI * 2) * .19 * running;
        const drop = hips.position.y - .1225 - lift;
        const reach = Math.min(Math.hypot(drop, forward), .869);
        const knee = Math.PI - Math.acos(THREE.MathUtils.clamp((.47 ** 2 + .40 ** 2 - reach ** 2) / (2 * .47 * .40), -1, 1));
        thigh.rotation.x = Math.atan2(-forward, drop) - Math.acos(THREE.MathUtils.clamp((.47 ** 2 + reach ** 2 - .40 ** 2) / (2 * .47 * reach), -1, 1));
        shin.rotation.x = knee; foot.rotation.x = -thigh.rotation.x - knee;
      });
      actionTime += dt;
      if (actionTime > (action === 'cast' ? .56 : .40)) action = undefined;
      const active = action !== undefined;
      const charging = active && actionTime < .15;
      const draw = active ? charging ? .45 + .55 * Math.sin(Math.min(actionTime / .15, 1) * Math.PI * .5)
        : Math.max(0, 1 - (actionTime - .15) / .035) + .34 * THREE.MathUtils.smoothstep(actionTime, .27, .40) : .34;
      const recovery = active ? Math.max(0, 1 - Math.max(0, actionTime - .15) / .25) : 0;
      const cast = action === 'cast' ? Math.sin(Math.min(actionTime / .56, 1) * Math.PI) : 0;
      torso.rotation.set(.10 * running - .12 * cast, -.08 * step - .19 * recovery, .025 * step);
      head.rotation.set(-.06 * running - .03 * cast, .16 * recovery, 0);
      cloak.rotation.set(-.16 - .43 * running + .05 * Math.sin(elapsed * 3), .045 * step, -.035 * step);
      bow.position.set(-.055, .54 + .12 * cast - .035 * running, .70 - .05 * running);
      bow.rotation.set(-.16 * cast, .04 * step, -.10 - .04 * step);
      bow.updateMatrix();
      // The string is two rigid, shared beams. Only its pose changes per ranger.
      const nock = a.set(0, .015, -.04 - .40 * draw);
      stringLink(strings[0], b.set(-.89, .10, -.06), nock);
      stringLink(strings[1], b.set(.89, .10, -.06), nock);
      arrow.position.z = nock.z + .34;
      arrow.visible = !active || charging || actionTime > .32;
      projectileAnchor.position.z = arrow.position.z + .83;
      // Explicit endpoints keep the grip and draw hand attached through locomotion and recoil.
      arms.forEach(({upper, lower, hand}, i) => {
        const side = i === 0 ? -1 : 1;
        const shoulder = shoulderPoint.set(side * .34, .60, 0);
        const elbow = elbowPoint.set(i === 0 ? -.44 : .58 + .11 * draw, .51 + .07 * cast, i === 0 ? .47 : .10 - .15 * draw);
        const target = targetPoint.set(i === 0 ? 0 : .045, i === 0 ? 0 : .015, i === 0 ? .23 : nock.z).applyMatrix4(bow.matrix);
        limb(upper, shoulder, elbow); limb(lower, elbow, target); hand.position.copy(target);
        hand.rotation.set(0, i === 0 ? 0 : Math.PI / 2, i === 0 ? .5 : -.4);
      });
    }
    update('idle', 0);
    return {root, projectileAnchor, update, play(motion) {action = motion; actionTime = 0;}, dispose() {root.removeFromParent();}};
  }
  return {instantiate, dispose() {
    geometries.forEach(geometry => geometry.dispose());
    Object.values(primitives).forEach(geometry => geometry.dispose());
    surface.dispose(); luminous.dispose();
  }};
}

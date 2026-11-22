import * as THREE from 'three';
import type { ModelInstance } from './model-assets';

export function createPrismWardenArt() {
  // One renderer owns these resources, while each actor owns its pose.
  const box = new THREE.BoxGeometry();
  const shell = new THREE.IcosahedronGeometry(1, 0);
  const prismShape = new THREE.OctahedronGeometry();
  const plate = new THREE.CylinderGeometry(1, .79, 1, 8);
  const tube = new THREE.CylinderGeometry(1, 1, 1, 6);
  const material = (color: number, metalness = 0, glow = 0) => new THREE.MeshStandardMaterial({
    color, metalness, roughness: glow ? .28 : .75, emissive: color, emissiveIntensity: glow,
  });
  const coat = material(0x277c7f), quilt = material(0x355869), slate = material(0x435064, .22);
  const fleece = material(0xe7ebe2), armor = material(0xc3d0ce, .28), dark = material(0x192f3f);
  const brass = material(0xcd9c62, .35), crystal = material(0x56eada, .24, .65);
  const light = material(0xbdfff1, .1, 1.1);

  function instantiate(): ModelInstance {
    const root = new THREE.Group();
    root.name = 'Prism Warden';
    function joint(parent: THREE.Object3D, x: number, y: number, z: number) {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      parent.add(group);
      return group;
    }
    function piece(parent: THREE.Object3D, shape: THREE.BufferGeometry, surface: THREE.Material,
      x: number, y: number, z: number, width: number, height: number, depth: number) {
      const mesh = new THREE.Mesh(shape, surface);
      mesh.position.set(x, y, z);
      mesh.scale.set(width, height, depth);
      mesh.castShadow = surface !== crystal && surface !== light;
      mesh.receiveShadow = mesh.castShadow;
      parent.add(mesh);
      return mesh;
    }

    const hips = joint(root, 0, .985, 0);
    const torso = joint(hips, 0, 0, 0);
    piece(torso, plate, quilt, 0, .39, 0, .38, .83, .225);
    piece(torso, plate, coat, 0, .53, .055, .425, .61, .242);
    piece(torso, plate, fleece, 0, .79, .005, .36, .2, .262).rotation.x = .12;
    piece(torso, plate, slate, 0, .13, .008, .367, .135, .252);
    piece(torso, box, brass, 0, .14, .259, .16, .106, .034);
    piece(torso, box, quilt, 0, .14, .278, .091, .051, .012);
    piece(torso, box, fleece, -.13, .48, .288, .065, .49, .048).rotation.z = -.46;
    piece(torso, prismShape, slate, .175, .63, .294, .106, .103, .04);
    piece(torso, prismShape, crystal, .175, .63, .329, .057, .058, .021);
    piece(torso, box, dark, -.25, .15, .201, .144, .167, .12).rotation.z = -.13;

    const head = joint(torso, 0, .99, .006);
    piece(head, shell, coat, 0, .203, -.041, .374, .454, .32).rotation.y = Math.PI / 10;
    piece(head, shell, slate, 0, .177, .102, .292, .321, .235);
    piece(head, prismShape, armor, 0, .129, .225, .235, .216, .098);
    for (const side of [-1, 1]) {
      const brow = piece(head, box, dark, side * .105, .24, .268, .205, .067, .056);
      brow.rotation.set(0, side * .29, side * .23);
      const eye = piece(head, box, light, side * .102, .244, .302, .13, .023, .019);
      eye.rotation.copy(brow.rotation);
      piece(head, shell, quilt, side * .257, .153, .015, .089, .19, .208);
    }

    const upperLeg = .46, lowerLeg = .40, ankleHeight = .13;
    const legs = [-1, 1].map(side => {
      const thigh = joint(hips, side * .203, 0, 0);
      piece(thigh, plate, quilt, 0, -.223, 0, .158, .46, .148);
      const shin = joint(thigh, 0, -upperLeg, 0);
      piece(shin, plate, slate, 0, -.178, 0, .135, .407, .139);
      piece(shin, shell, armor, 0, -.122, .105, .143, .193, .062);
      const foot = joint(shin, 0, -lowerLeg, 0);
      piece(foot, box, dark, 0, -.097, .077, .274, .066, .396);
      piece(foot, plate, slate, 0, -.018, .071, .146, .15, .211).rotation.y = Math.PI / 8;
      piece(foot, plate, armor, 0, -.025, .164, .124, .12, .119).rotation.y = Math.PI / 8;
      return { thigh, shin, foot };
    });
    const hems = [-1, 1].map(side => {
      const hem = joint(torso, side * .235, .125, -.133);
      hem.rotation.z = side * .24;
      piece(hem, plate, coat, 0, -.326, -.06, .189, .635, .12);
      piece(hem, plate, fleece, 0, -.601, -.073, .174, .09, .117);
      piece(hem, shell, quilt, 0, -.272, -.165, .123, .268, .035);
      return hem;
    });
    const arms = [-1, 1].map(side => {
      const shoulder = joint(torso, side * .428, .688, .005);
      piece(shoulder, plate, coat, 0, -.196, 0, .147, .37, .151);
      piece(shoulder, shell, side > 0 ? armor : fleece, side * .06, -.063, .004, .279, .194, .245);
      piece(shoulder, shell, slate, side * .135, -.15, .038, .137, .151, .184);
      const elbow = joint(shoulder, 0, -.34, 0);
      piece(elbow, plate, slate, 0, -.141, 0, .125, .295, .133);
      piece(elbow, shell, armor, 0, -.123, .107, .128, .145, .05);
      piece(elbow, shell, dark, 0, -.31, .016, .121, .145, .114);
      return { shoulder, elbow };
    });

    const conductor = joint(arms[1].elbow, .111, -.303, .051);
    piece(conductor, tube, dark, 0, .074, 0, .067, .53, .067);
    piece(conductor, tube, brass, 0, .289, 0, .085, .075, .083);
    for (const side of [-1, 1]) {
      piece(conductor, box, slate, side * .103, .357, 0, .102, .27, .135).rotation.z = -side * .62;
      piece(conductor, box, armor, side * .18, .518, 0, .079, .217, .113).rotation.z = side * .14;
      piece(conductor, prismShape, brass, side * .18, .595, .012, .066, .1, .067);
    }
    const focus = joint(conductor, 0, .545, 0);
    piece(focus, prismShape, crystal, 0, 0, 0, .124, .242, .124);
    piece(focus, prismShape, light, 0, .258, 0, .034, .064, .034);

    let elapsed = 0, stride = 0, running = 0, actionTime = 0;
    let action: 'attack' | 'cast' | undefined;
    function update(motion: 'idle' | 'run', dt: number, rate = 1) {
      elapsed += dt;
      running = THREE.MathUtils.lerp(running, motion === 'run' ? 1 : 0, 1 - Math.exp(-14 * dt));
      stride += dt * 2.25 * rate * running;
      const cycle = stride * Math.PI * 2;
      const step = Math.sin(cycle) * running;
      hips.position.y = .985 + .005 * Math.sin(elapsed * 3) - running * (.07 + .026 * Math.abs(Math.cos(cycle)));
      // Plant each foot for half the cycle, then solve the two-link leg to reach it.
      legs.forEach(({ thigh, shin, foot }, i) => {
        const phase = (stride + i * .5) % 1;
        const forward = Math.cos(phase * Math.PI * 2) * .32 * running;
        const lift = phase < .5 ? 0 : -Math.sin(phase * Math.PI * 2) * .22 * running;
        const drop = hips.position.y - ankleHeight - lift;
        const reach = Math.min(Math.hypot(drop, forward), upperLeg + lowerLeg - .001);
        const knee = Math.PI - Math.acos((upperLeg ** 2 + lowerLeg ** 2 - reach ** 2) / (2 * upperLeg * lowerLeg));
        thigh.rotation.x = Math.atan2(-forward, drop) - Math.acos((upperLeg ** 2 + reach ** 2 - lowerLeg ** 2) / (2 * upperLeg * reach));
        shin.rotation.x = knee;
        foot.rotation.x = -thigh.rotation.x - knee;
      });

      actionTime += dt;
      const duration = action === 'cast' ? .61 : .36;
      if (actionTime >= duration) action = undefined;
      const progress = Math.min(actionTime / duration, 1);
      const charge = Math.sin(progress * Math.PI);
      const cast = action === 'cast' ? charge : 0;
      const strike = action === 'attack' ? Math.sin(progress * 2 * Math.PI - .7) * charge : 0;
      torso.rotation.set(.16 * running - .09 * cast + .12 * strike, -.12 * step - .35 * strike, .035 * step);
      head.rotation.set(-torso.rotation.x * .67 - cast * .09, .07 * step + .22 * strike, .026 * Math.sin(elapsed * 1.8));
      hems.forEach((hem, i) => { hem.rotation.x = -.16 - .48 * running + (i === 0 ? .24 : -.24) * step; });
      arms[0].shoulder.rotation.set(.51 * step - 1.06 * cast, .33 * cast, -.15 - .31 * cast);
      arms[0].elbow.rotation.x = -.26 - .52 * running - .51 * cast;
      arms[1].shoulder.rotation.set(-.2 - .34 * step - .91 * cast - 1.37 * strike, -.27 * strike, .23 + .22 * cast);
      arms[1].elbow.rotation.x = -.58 + .33 * cast + .34 * strike;
      conductor.rotation.set(.72 + .29 * step + .32 * cast, .26 + .72 * strike, -.27 + .3 * cast);
      focus.position.y = .568 + .027 * Math.sin(elapsed * 5) + .082 * cast;
      focus.rotation.y = elapsed * 2 + 2.3 * cast;
      focus.scale.setScalar(1 + .27 * cast + .12 * Math.abs(strike));
    }
    update('idle', 0);
    return { root, update, play(motion) { action = motion; actionTime = 0; }, dispose() { root.removeFromParent(); } };
  }

  return { instantiate, dispose() {
    for (const geometry of [box, shell, prismShape, plate, tube]) geometry.dispose();
    for (const surface of [coat, quilt, slate, fleece, armor, dark, brass, crystal, light]) surface.dispose();
  } };
}

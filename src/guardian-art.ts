import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {ModelInstance} from './model-assets';

const INK = 0x172d3e, NAVY = 0x295675, STEEL = 0x80979d;
const IVORY = 0xe3e0c8, GOLD = 0xe4ad51, BRONZE = 0x8c673b, SUN = 0xffe7a3;
const HIP = .98, THIGH = .46, SHIN = .40, ANKLE = .14, TAU = Math.PI * 2;

function plate(profile: readonly (readonly [number, number])[], bevel = .035) {
  const shape = new THREE.Shape();
  shape.moveTo(...profile[0]);
  profile.slice(1).forEach(p => shape.lineTo(...p));
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 1 - bevel * 2, bevelEnabled: true, bevelSegments: 1,
    bevelSize: bevel, bevelThickness: bevel, steps: 1,
  }).center();
}

/** A shared, articulated low-draw-call heavy infantry silhouette, authored facing +Z. */
export function createGuardianArt() {
  const block = plate([[-.35,-.5],[.35,-.5],[.5,-.35],[.5,.35],[.35,.5],[-.35,.5],[-.5,.35],[-.5,-.35]]);
  const cuirass = plate([[-.34,-.5],[.34,-.5],[.52,.22],[.35,.5],[-.35,.5],[-.52,.22]]);
  // The open crown and stepped lower corners form an original split-sun silhouette.
  const shield = plate([[-.43,-.39],[-.28,-.51],[.28,-.51],[.43,-.39],[.48,.34],[.33,.49],[.12,.39],[0,.51],[-.12,.39],[-.33,.49],[-.48,.34]], .024);
  const wedge = plate([[0,-.5],[.5,.23],[.3,.5],[-.3,.5],[-.5,.23]], .018);
  const cylinder = new THREE.CylinderGeometry(.5,.5,1,8);
  const pieces: THREE.BufferGeometry[] = [];
  function stamp(shape: THREE.BufferGeometry, color: number,
    x: number,y: number,z: number,w: number,h: number,d: number,rx = 0,ry = 0,rz = 0) {
    const g = shape.index ? shape.toNonIndexed() : shape.clone();
    g.deleteAttribute('uv');
    g.scale(w,h,d).rotateX(rx).rotateY(ry).rotateZ(rz).translate(x,y,z);
    const colors = new Float32Array(g.attributes.position.count * 3);
    const tint = new THREE.Color(color);
    for (let i = 0; i < colors.length; i += 3) tint.toArray(colors,i);
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));
    return g;
  }
  function bake(...parts: THREE.BufferGeometry[]) {
    const g = mergeGeometries(parts);
    parts.forEach(p => p.dispose());
    pieces.push(g);
    return g;
  }
  const torsoGeometry = bake(
    stamp(block,INK,0,.08,0,.73,.25,.48),
    stamp(cuirass,NAVY,0,.46,0,1.06,.72,.60,.06),
    stamp(cuirass,IVORY,0,.51,.24,.82,.43,.17,.07),
    stamp(block,GOLD,0,.48,.34,.11,.39,.04,0,0,.12),
    stamp(block,BRONZE,0,.13,.04,.86,.13,.57),
    stamp(block,GOLD,0,.14,.343,.23,.13,.06),
    stamp(block,INK,0,.14,.38,.12,.06,.018),
    stamp(cuirass,NAVY,-.27,-.09,.12,.33,.41,.31,.12,0,-.12),
    stamp(cuirass,NAVY,.27,-.09,.12,.33,.41,.31,.12,0,.12),
    stamp(block,IVORY,-.28,-.18,.30,.28,.12,.05,.12,0,-.12),
    stamp(block,IVORY,.28,-.18,.30,.28,.12,.05,.12,0,.12),
    stamp(block,INK,0,.44,-.33,.69,.67,.15,-.13),
    stamp(block,GOLD,0,.67,-.415,.43,.075,.04,-.13),
    stamp(cylinder,STEEL,0,.86,0,.34,.18,.32),
  );
  const headGeometry = bake(
    stamp(block,NAVY,0,.14,.015,.47,.44,.43,-.10),
    stamp(block,IVORY,0,.29,-.015,.46,.20,.44,-.10),
    stamp(block,BRONZE,0,.36,-.04,.16,.13,.39,-.10),
    stamp(block,GOLD,0,.39,-.05,.11,.07,.35,-.10),
    stamp(cuirass,STEEL,0,.07,.15,.40,.22,.21),
    stamp(block,INK,0,.19,.244,.365,.084,.034,-.07),
    stamp(block,SUN,-.095,.195,.266,.115,.027,.015,0,-.12),
    stamp(block,SUN,.095,.195,.266,.115,.027,.015,0,.12),
    stamp(block,IVORY,-.20,.13,.09,.09,.24,.23,0,0,-.10),
    stamp(block,IVORY,.20,.13,.09,.09,.24,.23,0,0,.10),
  );
  const armGeometry = [-1,1].map(side => bake(
    stamp(cylinder,INK,0,-.19,0,.27,.41,.28),
    stamp(block,BRONZE,side*.035,-.02,.015,.53,.29,.54,.07,0,side*.20),
    stamp(cuirass,IVORY,side*.05,.035,.025,.49,.24,.51,.07,0,side*.20),
    stamp(block,NAVY,side*.085,.116,-.015,.31,.085,.40,.07,0,side*.20),
    stamp(block,GOLD,side*.15,.10,.22,.13,.07,.08,0,0,side*.20),
    stamp(block,STEEL,0,-.35,.08,.29,.30,.31,-.24),
    stamp(block,GOLD,0,-.30,.24,.22,.08,.05,-.24),
    stamp(block,INK,0,-.52,.15,.22,.17,.23),
  ));
  const shieldGeometry = bake(
    stamp(shield,BRONZE,0,0,0,1.02,1.58,.22),
    stamp(shield,GOLD,0,.012,.095,.96,1.50,.11),
    stamp(shield,NAVY,0,.012,.16,.79,1.31,.075),
    // A six-segment sun wraps a dark central notch rather than a heraldic emblem.
    ...[-1,1].flatMap(side => [
      stamp(wedge,GOLD,side*.205,.31,.217,.21,.37,.055,0,0,-side*.48),
      stamp(wedge,IVORY,side*.25,.015,.22,.17,.29,.055,0,0,-side*1.36),
      stamp(wedge,GOLD,side*.16,-.24,.22,.18,.30,.055,0,0,-side*2.45),
      stamp(block,SUN,side*.28,.51,.205,.08,.08,.04),
    ]),
    stamp(block,BRONZE,0,.035,.21,.09,.83,.055),
    stamp(block,SUN,0,.08,.25,.035,.60,.024),
    stamp(block,GOLD,0,-.54,.21,.37,.07,.055),
    stamp(block,INK,0,-.02,-.17,.19,.55,.15),
  );
  const hammerGeometry = bake(
    stamp(cylinder,INK,0,.10,0,.10,.93,.10),
    stamp(cylinder,BRONZE,0,-.29,0,.15,.13,.15),
    stamp(cylinder,GOLD,0,.34,0,.15,.18,.15),
    stamp(block,BRONZE,0,.63,0,.72,.45,.43),
    stamp(block,STEEL,0,.65,0,.78,.36,.39),
    stamp(block,IVORY,-.36,.65,0,.16,.43,.46),
    stamp(block,IVORY,.36,.65,0,.16,.43,.46),
    stamp(block,NAVY,0,.65,.214,.23,.25,.035),
    stamp(block,GOLD,0,.65,.24,.09,.22,.025),
    stamp(block,GOLD,0,.857,0,.30,.065,.30),
  );
  const thighGeometry = bake(
    stamp(cylinder,INK,0,-.23,0,.29,.46,.30),
    stamp(cuirass,NAVY,0,-.19,.055,.33,.36,.28),
    stamp(block,IVORY,0,-.25,.17,.24,.23,.08,-.08),
  );
  const shinGeometry = bake(
    stamp(cylinder,INK,0,-.20,0,.23,.40,.24),
    stamp(cuirass,STEEL,0,-.18,.05,.28,.34,.28,-.06),
    stamp(block,GOLD,0,-.02,.15,.31,.13,.14,-.13),
    stamp(block,IVORY,0,-.20,.19,.18,.25,.06,-.06),
  );
  const bootGeometry = bake(
    stamp(block,INK,0,-.06,.08,.35,.16,.48),
    stamp(block,NAVY,0,-.005,.09,.34,.16,.46),
    stamp(block,IVORY,0,-.005,.24,.31,.14,.15),
    stamp(block,BRONZE,0,-.10,.09,.36,.065,.49),
  );
  [block,cuirass,shield,wedge,cylinder].forEach(g => g.dispose());
  const material = new THREE.MeshStandardMaterial({vertexColors:true,metalness:.32,roughness:.59});

  function instantiate(): ModelInstance {
    const root = new THREE.Group();
    root.name = 'Sunbreak Bulwark';
    function mesh(geometry: THREE.BufferGeometry,parent: THREE.Object3D,name: string,shadow = true) {
      const part = new THREE.Mesh(geometry,material);
      part.name = name; part.castShadow = shadow; part.receiveShadow = true;
      parent.add(part); return part;
    }
    const torso = mesh(torsoGeometry,root,'Broad infantry cuirass');
    const head = mesh(headGeometry,torso,'Slit visor helm');
    head.position.set(0,.91,.015);
    const arms = armGeometry.map((g,i) => {
      const arm = mesh(g,torso,i ? 'Hammer arm' : 'Shield arm');
      arm.position.set(i ? .58 : -.58,.70,.015); return arm;
    });
    const shieldPart = mesh(shieldGeometry,arms[0],'Split-sun tower shield');
    shieldPart.position.set(-.10,-.27,.37);
    const hammer = mesh(hammerGeometry,arms[1],'Stone-faced war hammer');
    hammer.position.set(.04,-.53,.17);
    const legs = [-1,1].map(side => ({
      side,
      thigh:mesh(thighGeometry,root,'Armored thigh',false),
      shin:mesh(shinGeometry,root,'Plated shin',false),
      boot:mesh(bootGeometry,root,'Heavy boot',false),
    }));
    let elapsed = 0,cycle = 0,running = 0,actionTime = Infinity;
    let action: 'attack'|'cast' = 'attack';
    function update(motion: 'idle'|'run',dt: number,rate = 1) {
      elapsed += dt;
      running = THREE.MathUtils.lerp(running,motion === 'run' ? 1 : 0,1-Math.exp(-13*dt));
      cycle = (cycle + dt*1.72*rate*running) % 1;
      actionTime += dt;
      const step = Math.sin(cycle*TAU)*running;
      // Lift, drive through the target, then recover. The impact arrives at .17 seconds.
      const windup = action === 'attack' ? Math.max(0,1-Math.abs(actionTime-.065)/.065) : 0;
      const strike = action === 'attack' ? Math.max(0,1-Math.abs(actionTime-.17)/.09) : 0;
      const settle = action === 'attack' && actionTime>.17 ? Math.max(0,1-(actionTime-.17)/.29)**2 : 0;
      const hit = Math.max(strike,settle);
      const guard = action === 'cast' ? Math.max(0,Math.sin(Math.min(1,actionTime/.65)*Math.PI)) : 0;
      const bob = .022*(1-Math.cos(cycle*TAU*2))*running;
      const hipY = HIP-.035*running+bob-.035*hit;
      const hipZ = .055*hit;
      torso.position.set(0,hipY,hipZ);
      torso.rotation.set(.08*running-.10*windup+.15*hit,.07*step-.22*windup+.33*hit,.025*step);
      head.rotation.set(-torso.rotation.x*.6,-torso.rotation.y*.4,0);
      arms[0].rotation.set(-.15+.16*step-.32*guard-.12*hit,-.10-.19*guard,-.07);
      shieldPart.rotation.set(-.29-.15*guard,-.11+.12*guard,-.04);
      arms[1].rotation.set(-.20-.28*step-1.38*windup-.96*hit,-.18+.57*hit,.11+.21*windup);
      hammer.rotation.set(.55+.30*windup+2.0*hit,-.08,-.10-.14*windup);
      torso.position.y += Math.sin(elapsed*2.6)*.006*(1-running);
      legs.forEach((leg,i) => {
        const phase = (cycle+i*.5)%1;
        const stance = .59;
        const swing = Math.max(0,(phase-stance)/(1-stance));
        const travel = phase<stance ? .5-phase/stance : -.5+swing*swing*(3-2*swing);
        const ankleZ = travel*.55*running;
        const ankleY = ANKLE+Math.sin(swing*Math.PI)**2*.16*running;
        const dy = ankleY-hipY,dz = ankleZ-hipZ;
        const distance = Math.max(.001,Math.min(Math.hypot(dy,dz),THIGH+SHIN-.001));
        const along = (THIGH**2-SHIN**2+distance**2)/(2*distance);
        const bend = Math.sqrt(Math.max(0,THIGH**2-along**2));
        const length = Math.max(.001,Math.hypot(dy,dz));
        const kneeY = hipY+(dy*along+dz*bend)/length;
        const kneeZ = hipZ+(dz*along-dy*bend)/length;
        const x = leg.side*.25;
        leg.thigh.position.set(x,hipY,hipZ);
        leg.thigh.rotation.x = Math.atan2(hipZ-kneeZ,hipY-kneeY);
        leg.shin.position.set(x,kneeY,kneeZ);
        leg.shin.rotation.x = Math.atan2(kneeZ-ankleZ,kneeY-ankleY);
        leg.boot.position.set(x,ankleY,ankleZ);
      });
    }
    update('idle',0);
    return {root,update,play(motion) { action=motion; actionTime=0; },dispose() { root.removeFromParent(); }};
  }
  return {instantiate,dispose() { pieces.forEach(g => g.dispose()); material.dispose(); }};
}

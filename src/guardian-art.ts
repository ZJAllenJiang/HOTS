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

/** Connected rings give armor a forged contour instead of stacked extruded boxes. */
function armorHull(rings: readonly (readonly [number, number, number, number])[]) {
  const outline = [[-1,-.55],[-.62,-1],[.62,-1],[1,-.55],[1,.52],[.62,1],[-.62,1],[-1,.52]];
  const positions: number[] = [];
  const points = rings.flatMap(([y,w,d,z]) => outline.map(([x,depth]) => [x*w,y,depth*d+z]));
  function face(a: number,b: number,c: number) { positions.push(...points[a],...points[c],...points[b]); }
  for (let row=0;row<rings.length-1;row++) for (let i=0;i<8;i++) {
    const a=row*8+i,b=row*8+(i+1)%8,c=b+8,d=a+8;
    face(a,b,c);face(a,c,d);
  }
  for (let i=1;i<7;i++) { face(0,i+1,i); const top=points.length-8;face(top,top+i,top+i+1); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  return geometry;
}

/** A shared, articulated heavy infantry silhouette, authored facing +Z. */
export function createGuardianArt() {
  const block = plate([[-.35,-.5],[.35,-.5],[.5,-.35],[.5,.35],[.35,.5],[-.35,.5],[-.5,.35],[-.5,-.35]]);
  const cuirass = plate([[-.34,-.5],[.34,-.5],[.52,.22],[.35,.5],[-.35,.5],[-.52,.22]]);
  const breast = armorHull([[-.5,.33,.32,0],[-.29,.39,.37,0],[.20,.50,.36,0],[.43,.39,.29,0],[.5,.25,.23,0]]);
  const helm = armorHull([[-.5,.31,.30,.01],[-.25,.45,.40,.035],[.13,.49,.44,0],[.40,.37,.35,-.045],[.5,.18,.22,-.055]]);
  const pauldron = armorHull([[-.5,.38,.35,0],[-.28,.50,.46,0],[.10,.48,.48,0],[.40,.31,.36,0],[.5,.12,.19,0]]);
  const greave = armorHull([[-.5,.29,.27,0],[-.28,.36,.32,0],[.33,.43,.35,0],[.5,.34,.28,0]]);
  const boot = armorHull([[-.5,.44,.46,0],[-.2,.47,.50,0],[.20,.40,.46,-.02],[.5,.29,.27,-.15]]);
  // Raised upper shoulders and a tapering foot make the tower shield identifiable from above.
  const shield = plate([[-.20,-.52],[.20,-.52],[.43,-.24],[.48,.27],[.32,.48],[.13,.42],[0,.51],[-.13,.42],[-.32,.48],[-.48,.27],[-.43,-.24]], .022);
  const shieldPosition=shield.getAttribute('position');
  for (let i=0;i<shieldPosition.count;i++) {
    const x=shieldPosition.getX(i);
    shieldPosition.setZ(i,shieldPosition.getZ(i)+.48*(1-Math.min(1,Math.abs(x)/.52)**2));
  }
  shield.computeVertexNormals();
  const wedge = plate([[0,-.5],[.5,.23],[.3,.5],[-.3,.5],[-.5,.23]], .018);
  const crest = plate([[-.48,-.40],[.40,-.44],[.50,-.12],[.28,.38],[-.25,.5],[-.5,.10]],.012);
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
    stamp(breast,INK,0,.38,0,1.12,.88,.87),
    stamp(breast,STEEL,0,.45,.015,1.04,.76,.80),
    // Two sloping breast plates meet at the sun-colored keel.
    stamp(cuirass,IVORY,-.205,.50,.253,.42,.40,.12,.13,-.24,-.14),
    stamp(cuirass,IVORY,.205,.50,.253,.42,.40,.12,.13,.24,.14),
    stamp(wedge,GOLD,0,.48,.333,.13,.40,.06),
    stamp(block,BRONZE,0,.10,.015,.76,.15,.59),
    stamp(block,GOLD,0,.105,.335,.21,.15,.075),
    stamp(wedge,INK,0,.10,.38,.09,.08,.018,0,0,Math.PI),
    // Articulated overlapping tassets leave visible space for the thighs.
    ...[-1,1].flatMap(side => [
      stamp(cuirass,NAVY,side*.26,-.075,.12,.33,.43,.32,.13,side*.12,side*.12),
      stamp(cuirass,STEEL,side*.27,-.08,.265,.27,.34,.07,.13,side*.12,side*.12),
      stamp(block,GOLD,side*.28,-.21,.30,.25,.055,.045,.13,0,side*.12),
      stamp(cuirass,NAVY,side*.37,-.04,-.05,.23,.34,.36,0,0,side*.25),
    ]),
    stamp(breast,NAVY,0,.43,-.22,.77,.67,.39),
    stamp(block,GOLD,0,.66,-.381,.43,.07,.035,-.13),
    stamp(cylinder,INK,0,.84,0,.38,.18,.34),
    stamp(cylinder,BRONZE,0,.885,0,.44,.07,.38),
    stamp(cylinder,IVORY,0,.91,0,.37,.06,.33),
  );
  const headGeometry = bake(
    stamp(helm,STEEL,0,.15,-.025,.54,.51,.59,-.06),
    stamp(helm,IVORY,0,.245,-.05,.53,.31,.58,-.06),
    // A narrow swept comb gives the closed helm a strong profile in the game camera.
    stamp(crest,BRONZE,0,.405,-.075,.44,.20,.12,0,Math.PI/2),
    stamp(crest,GOLD,0,.435,-.075,.43,.14,.075,0,Math.PI/2),
    stamp(cuirass,INK,0,.145,.254,.40,.11,.055,-.10),
    stamp(block,SUN,-.098,.155,.289,.123,.022,.014,0,-.12),
    stamp(block,SUN,.098,.155,.289,.123,.022,.014,0,.12),
    stamp(block,GOLD,0,.19,.282,.38,.041,.035,-.10),
    stamp(wedge,IVORY,0,.015,.236,.30,.23,.14,.10,0,Math.PI),
    stamp(wedge,STEEL,0,.02,.313,.10,.16,.035,.10,0,Math.PI),
    ...[-1,1].map(side=>stamp(cuirass,IVORY,side*.213,.055,.104,.13,.27,.28,.03,side*.18,-side*.16)),
  );
  const armGeometry = [-1,1].map(side => bake(
    stamp(cylinder,INK,0,-.22,0,.26,.43,.27),
    stamp(pauldron,BRONZE,side*.045,-.035,.015,.70,.45,.69,.08,0,side*.18),
    stamp(pauldron,IVORY,side*.055,.015,.015,.67,.39,.66,.08,0,side*.18),
    stamp(pauldron,NAVY,side*.085,.083,-.015,.49,.23,.50,.08,0,side*.18),
    stamp(block,GOLD,side*.14,.11,.184,.12,.055,.08,0,0,side*.18),
    stamp(greave,STEEL,0,-.37,.07,.37,.33,.42,-.22),
    stamp(block,GOLD,0,-.27,.245,.25,.07,.045,-.22),
    stamp(pauldron,INK,0,-.54,.12,.28,.20,.30),
    stamp(block,STEEL,0,-.53,.24,.22,.09,.07),
  ));
  const shieldGeometry = bake(
    stamp(shield,BRONZE,0,0,0,1.02,1.49,.20),
    stamp(shield,GOLD,0,.008,.075,.96,1.41,.13),
    stamp(shield,NAVY,0,.012,.14,.80,1.24,.095),
    // Broad embossed rays stay legible when the shield occupies a few dozen pixels.
    ...[-1,1].flatMap(side => [
      stamp(wedge,GOLD,side*.18,.28,.25,.19,.34,.045,0,-side*.15,-side*.48),
      stamp(wedge,IVORY,side*.23,.025,.255,.14,.29,.045,0,-side*.15,-side*1.38),
      stamp(wedge,GOLD,side*.15,-.22,.25,.15,.27,.045,0,-side*.15,-side*2.45),
      stamp(block,SUN,side*.29,.47,.204,.055,.055,.035),
    ]),
    stamp(wedge,BRONZE,0,.045,.268,.15,.89,.065,0,0,Math.PI),
    stamp(wedge,GOLD,0,.065,.305,.076,.65,.03,0,0,Math.PI),
    stamp(wedge,IVORY,0,-.48,.245,.24,.14,.04),
    stamp(block,INK,0,-.02,-.14,.19,.55,.15),
  );
  const hammerGeometry = bake(
    stamp(cylinder,INK,0,.10,0,.105,.96,.105),
    stamp(cylinder,BRONZE,0,-.30,0,.15,.13,.15),
    stamp(cylinder,GOLD,0,.33,0,.16,.17,.16),
    stamp(block,BRONZE,0,.63,0,.69,.43,.41),
    stamp(helm,STEEL,0,.64,0,.84,.42,.47,0,0,Math.PI/2),
    stamp(block,IVORY,-.36,.64,0,.16,.39,.43),
    stamp(block,IVORY,.36,.64,0,.16,.39,.43),
    stamp(wedge,NAVY,0,.65,.243,.25,.27,.028),
    stamp(wedge,GOLD,0,.65,.265,.10,.16,.025),
    stamp(block,GOLD,0,.852,0,.26,.065,.30),
  );
  const thighGeometry = bake(
    stamp(cylinder,INK,0,-.23,0,.30,.46,.31),
    stamp(greave,NAVY,0,-.20,.045,.40,.40,.38),
    stamp(cuirass,STEEL,0,-.25,.18,.27,.25,.075,-.10),
  );
  const shinGeometry = bake(
    stamp(cylinder,INK,0,-.20,0,.24,.40,.25),
    stamp(greave,STEEL,0,-.19,.045,.37,.37,.38,-.05),
    stamp(pauldron,GOLD,0,-.025,.11,.38,.17,.32,-.10),
    stamp(cuirass,IVORY,0,-.21,.196,.19,.26,.045,-.05),
  );
  const bootGeometry = bake(
    stamp(boot,BRONZE,0,-.082,.075,.41,.13,.55),
    stamp(boot,INK,0,-.045,.075,.40,.16,.54),
    stamp(boot,NAVY,0,.005,.075,.39,.19,.52),
    stamp(cuirass,STEEL,0,.015,.23,.32,.13,.16,Math.PI/2),
  );
  [block,cuirass,breast,helm,pauldron,greave,boot,shield,wedge,crest,cylinder].forEach(g => g.dispose());
  const material = new THREE.MeshStandardMaterial({vertexColors:true,metalness:.38,roughness:.54});

  function instantiate(): ModelInstance {
    const root = new THREE.Group();
    root.name = 'Sunbreak Bulwark';
    function mesh(geometry: THREE.BufferGeometry,parent: THREE.Object3D,name: string,shadow = true) {
      const part = new THREE.Mesh(geometry,material);
      part.name = name; part.castShadow = shadow; part.receiveShadow = true;
      parent.add(part); return part;
    }
    const torso = mesh(torsoGeometry,root,'Forged infantry cuirass');
    const head = mesh(headGeometry,torso,'Swept-comb closed helm');
    head.position.set(0,.91,.015);
    const arms = armGeometry.map((g,i) => {
      const arm = mesh(g,torso,i ? 'Hammer arm' : 'Shield arm');
      arm.position.set(i ? .56 : -.56,.70,.015); return arm;
    });
    const shieldPart = mesh(shieldGeometry,arms[0],'Split-sun tower shield');
    shieldPart.position.set(-.055,-.27,.37);
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

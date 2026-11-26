import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {ModelInstance} from './model-assets';

// Grayharbor pathfinder. Original geometry; no textures, external files or licensed character assets.
export const RANGER_PALETTE = {
  slate: 0x344a55, ink: 0x152d36, petrol: 0x226773, teal: 0x398493,
  ivory: 0xd5d4ba, pale: 0xf1e5bc, leather: 0x5b493b, brass: 0xb68a4c,
  ochre: 0xc99042, skin: 0xbb896c, skinLight: 0xd9a385, hair: 0x263138,
  glass: 0x84e2d8, string: 0xccd9cc,
};
type V = [number, number, number];
type Part = {geometry: THREE.BufferGeometry; color?: number; p: V; s: V; r?: V};
export const RANGER_STRIDE_HZ = 2.15;
const TAU = Math.PI * 2;

/** Elliptical section lofts form continuous tailored volumes, with rounded shoulder/knee seams. */
function loft(rings: readonly (readonly [number, number, number, number])[], sides = 16) {
  const positions: number[] = [], indices: number[] = [];
  rings.forEach(([y, width, depth, z]) => {
    for (let i = 0; i < sides; i++) {
      const angle = i / sides * TAU;
      positions.push(Math.cos(angle) * width, y, Math.sin(angle) * depth + z);
    }
  });
  for (let row = 0; row < rings.length - 1; row++) for (let i = 0; i < sides; i++) {
    const a = row * sides + i, b = row * sides + (i + 1) % sides, c = a + sides, d = b + sides;
    indices.push(a, c, b, b, c, d);
  }
  for (let i = 1; i < sides - 1; i++) {
    indices.push(0, i, i + 1);
    const end = (rings.length - 1) * sides; indices.push(end, end + i + 1, end + i);
  }
  if (rings[rings.length - 1][0] < rings[0][0]) for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
  geometry.computeVertexNormals(); return geometry;
}
function plaque(outline: readonly (readonly [number, number])[], depth = .04, bevel = .015) {
  const shape = new THREE.Shape(); shape.moveTo(...outline[0]);
  outline.slice(1).forEach(point => shape.lineTo(...point)); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: true, bevelSegments: 2, bevelSize: bevel, bevelThickness: bevel, curveSegments: 3});
  geometry.translate(0, 0, -depth / 2); return geometry;
}

export function createRangerArt() {
  const C = RANGER_PALETTE;
  const surface = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .69, metalness: .18});
  const luminous = new THREE.MeshStandardMaterial({color: C.glass, emissive: C.glass, emissiveIntensity: .65, roughness: .3, metalness: .25});
  const sphere = new THREE.SphereGeometry(1, 16, 10);
  const tube = new THREE.CylinderGeometry(1, 1, 1, 8);
  const gem = new THREE.OctahedronGeometry(1);
  const temporaries: THREE.BufferGeometry[] = [sphere, tube, gem];
  const geometries: THREE.BufferGeometry[] = [];
  const shape = (g: THREE.BufferGeometry) => {temporaries.push(g); return g;};
  const part = (geometry: THREE.BufferGeometry, color: number | undefined, p: V, s: V = [1, 1, 1], r?: V): Part => ({geometry, color, p, s, r});
  function bake(parts: Part[]) {
    const transform = new THREE.Object3D();
    const pieces = parts.map(spec => {
      const geometry = spec.geometry.index ? spec.geometry.toNonIndexed() : spec.geometry.clone();
      transform.position.set(...spec.p); transform.scale.set(...spec.s); transform.rotation.set(...(spec.r ?? [0, 0, 0])); transform.updateMatrix(); geometry.applyMatrix4(transform.matrix);
      if (spec.color !== undefined || !geometry.hasAttribute('color')) {
        const color = new THREE.Color(spec.color ?? 0xffffff), data = new Float32Array(geometry.getAttribute('position').count * 3);
        for (let i = 0; i < data.length; i += 3) {data[i] = color.r; data[i + 1] = color.g; data[i + 2] = color.b;}
        geometry.setAttribute('color', new THREE.BufferAttribute(data, 3));
      }
      geometry.deleteAttribute('uv'); return geometry;
    });
    const geometry = mergeGeometries(pieces, false)!; pieces.forEach(g => g.dispose());
    geometry.computeBoundingSphere(); geometries.push(geometry); return geometry;
  }
  function beam(a: V, b: V, width: number, color: number): Part {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from);
    const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()));
    return part(tube, color, from.add(to).multiplyScalar(.5).toArray() as V, [width, direction.length(), width], [euler.x, euler.y, euler.z]);
  }
  const chest = shape(loft([[.06,.245,.16,0],[.19,.24,.165,0],[.37,.27,.18,0],[.60,.35,.18,-.01],[.72,.31,.155,-.025],[.79,.16,.12,0]]));
  const chestPlate = shape(plaque([[-.28,.66],[-.13,.70],[0,.61],[.14,.69],[.29,.64],[.225,.39],[.08,.29],[-.13,.34],[-.24,.44]], .045, .022));
  const abdomen = shape(plaque([[-.205,.34],[0,.28],[.205,.34],[.18,.19],[0,.13],[-.18,.19]], .028, .012));
  const belt = shape(loft([[.06,.26,.18,0],[.14,.265,.18,0],[.17,.25,.17,0]]));
  const buckle = shape(plaque([[-.07,.06],[.045,.08],[.08,0],[.035,-.06],[-.07,-.04]], .028, .01));
  const shoulderPlate = shape(loft([[-.14,.16,.18,0],[-.06,.235,.225,0],[.05,.22,.22,0],[.12,.13,.14,0]], 16));
  const coatTail = shape(plaque([[-.25,.08],[-.02,.03],[-.04,-.36],[-.23,-.43],[-.32,-.23]], .035, .01));
  const torsoParts: Part[] = [
    part(chest,C.slate,[0,0,0]), part(chestPlate,C.ivory,[0,0,.165]), part(abdomen,C.slate,[0,0,.18]),
    part(belt,C.leather,[0,0,0]), part(buckle,C.brass,[0,.115,.20]), part(gem,C.glass,[.005,.122,.231],[.035,.035,.014]),
    part(shoulderPlate,C.ivory,[.34,.64,-.005],[1,1,1],[0,0,-.28]),
    part(sphere,C.slate,[-.34,.61,-.01],[.19,.18,.19]),
    part(coatTail,C.slate,[0,0,.10]), part(coatTail,C.petrol,[.01,0,-.135],[1.0,1,1],[0,Math.PI,0]),
    part(sphere,C.leather,[.29,.08,.02],[.11,.14,.09]),
    part(sphere,C.brass,[.29,.13,.09],[.075,.025,.025]),
    beam([-.20,.69,.22],[.15,.12,.213],.026,C.leather),
    beam([-.17,.68,.243],[.18,.13,.238],.006,C.brass),
  ];
  // A compact coastal compass badge is a motif, never a full-sized floating ornament.
  torsoParts.push(part(sphere,C.brass,[-.115,.48,.222],[.058,.058,.016]));
  torsoParts.push(part(gem,C.petrol,[-.115,.48,.241],[.036,.043,.012],[0,0,.2]));
  const torsoGeometry = bake(torsoParts);
  const scarf = shape(loft([[0,.115,.108,0],[.045,.16,.139,0],[.10,.155,.13,0],[.15,.12,.11,0]]));
  const scarfEnd = shape(plaque([[-.05,0],[.05,0],[.07,-.26],[-.03,-.32]], .018, .008));
  const neckGeometry = bake([part(sphere,C.skin,[0,.12,0],[.09,.17,.09]),part(scarf,C.ochre,[0,0,.015]),part(scarfEnd,C.ochre,[-.19,.045,.16],[1,1,1],[0,0,-.35])]);

  const face = shape(loft([[.015,.065,.075,.04],[.065,.115,.12,.035],[.14,.155,.145,.018],[.24,.171,.155,0],[.33,.164,.145,-.008],[.40,.135,.12,-.015],[.43,.075,.07,-.02]], 20));
  const eye = shape(plaque([[-.047,0],[-.025,.016],[.025,.015],[.046,0],[.02,-.009],[-.026,-.009]], .002,.001));
  const nose = shape(plaque([[-.023,.035],[.012,.038],[.029,-.024],[.003,-.04],[-.022,-.02]], .055,.006));
  const mouth = shape(plaque([[-.043,0],[0,.003],[.038,.008],[.028,-.005],[-.029,-.008]], .002,.001));
  const hairCap = shape(loft([[.29,.168,.155,-.02],[.365,.184,.162,-.02],[.445,.16,.145,-.028],[.49,.095,.095,-.045],[.50,.035,.05,-.04]], 20));
  const lock = shape(plaque([[-.07,.02],[-.01,.12],[.11,.10],[.17,.01],[.04,-.07],[-.055,-.10]], .035,.015));
  const headGeometry = bake([
    part(face,C.skin,[0,0,0]),
    part(sphere,C.skin,[-.168,.205,0],[.035,.061,.043]),part(sphere,C.skin,[.168,.205,0],[.035,.061,.043]),
    part(eye,C.ink,[-.074,.249,.139],[1,1,1],[0,-.28,0]),part(eye,C.ink,[.074,.249,.139],[1,1,1],[0,.28,0]),
    part(sphere,C.pale,[-.073,.249,.148],[.022,.006,.003]),part(sphere,C.pale,[.073,.249,.148],[.022,.006,.003]),
    part(sphere,C.ink,[-.069,.249,.152],[.007,.007,.003]),part(sphere,C.ink,[.077,.249,.152],[.007,.007,.003]),
    beam([-.122,.28,.138],[-.032,.282,.154],.009,C.hair),beam([.032,.282,.154],[.122,.28,.138],.009,C.hair),
    part(nose,C.skinLight,[0,.202,.147]), part(mouth,C.leather,[0,.113,.154]),
    part(sphere,C.skinLight,[0,.075,.134],[.060,.024,.016]),
    part(hairCap,C.hair,[0,0,0]),part(lock,C.hair,[-.065,.36,.12],[.9,.7,1],[.2,.1,-.35]),
    part(lock,C.slate,[.055,.41,.09],[.72,.48,.9],[.3,.2,-.45]),
    part(sphere,C.hair,[-.153,.267,.015],[.026,.093,.10]),
    part(sphere,C.brass,[.183,.172,.012],[.011,.024,.012]),
  ]);

  const thighHull = shape(loft([[0,.145,.14,0],[-.12,.16,.145,0],[-.31,.14,.135,.015],[-.50,.108,.115,.015]]));
  const thighPlate = shape(plaque([[-.10,0],[.09,0],[.105,-.24],[.055,-.32],[-.075,-.30],[-.115,-.13]], .024,.017));
  const thighGeometry = bake([part(thighHull,C.slate,[0,0,0]),part(thighPlate,C.leather,[0,-.09,.125]),beam([-.09,-.15,.148],[.09,-.15,.148],.012,C.brass)]);
  const calf = shape(loft([[.035,.11,.11,0],[-.10,.13,.115,-.01],[-.28,.11,.10,-.005],[-.47,.085,.09,.015]]));
  const greave = shape(plaque([[-.09,.015],[.075,.03],[.10,-.18],[.048,-.34],[-.055,-.33],[-.105,-.13]], .035,.017));
  const shinGeometry = bake([part(calf,C.leather,[0,0,0]),part(greave,C.ivory,[0,-.065,.095]),part(sphere,C.slate,[0,.015,.07],[.124,.12,.10]),beam([-.08,-.26,.12],[.07,-.26,.12],.012,C.brass)]);
  const bootHull = shape(loft([[-.10,.115,.18,.07],[-.045,.125,.22,.09],[.03,.10,.16,.045],[.12,.083,.09,.01]]));
  const sole = shape(loft([[-.105,.122,.19,.075],[-.075,.127,.22,.09],[-.052,.12,.21,.09]]));
  const footGeometry = bake([part(bootHull,C.leather,[0,0,0]),part(sole,C.ink,[0,0,0]),part(sphere,C.slate,[0,-.025,.19],[.115,.052,.10]),beam([-.09,.03,.13],[.09,.03,.13],.012,C.brass)]);
  const upperHull = shape(loft([[.07,.13,.13,0],[-.06,.135,.13,0],[-.38,.12,.12,0],[-.78,.093,.095,0],[-1.03,.092,.09,0]]));
  const upperArmGeometry = bake([part(upperHull,C.slate,[0,0,0])]);
  const forearmHull = shape(loft([[.03,.095,.09,0],[-.20,.12,.10,0],[-.55,.118,.11,0],[-.96,.082,.075,0],[-1.04,.08,.075,0]]));
  const bracer = shape(plaque([[-.09,-.10],[.085,-.10],[.09,-.64],[.055,-.89],[-.065,-.88],[-.105,-.51]], .022,.013));
  const forearmGeometry = bake([part(forearmHull,C.leather,[0,0,0]),part(bracer,C.ivory,[0,0,.09]),beam([-.065,-.21,.13],[.065,-.21,.13],.015,C.brass)]);
  const handGeometry = bake([
    part(sphere,C.leather,[0,0,0],[.088,.092,.098]),
    part(sphere,C.slate,[0,.035,-.018],[.091,.057,.078]),
    part(sphere,C.leather,[.06,-.025,.042],[.038,.053,.056]),
    ...[-1,0,1].map(i=>part(sphere,C.leather,[i*.036,-.045,.063],[.022,.035,.04])),
  ]);

  // A curved, closed cloth surface with broad folds. The left edge sits over the shoulder;
  // the short right edge keeps both hand crossbows clear from the arena camera.
  const clothPositions: number[] = [], clothColors: number[] = [], clothIndices: number[] = [];
  const rows = 10, columns = 12;
  for (let layer = 0; layer < 2; layer++) for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const t = row / rows, u = col / columns;
    const left = -.39 - .18 * Math.sin(t * Math.PI * .7), right = .25 - .18 * t;
    const x = THREE.MathUtils.lerp(left,right,u), y = -.91 * t + .11 * u * t + .035 * Math.sin(u*Math.PI)*t;
    const z = -.06 - .18*t + .055*Math.sin(u*Math.PI*5)*(t*.8+.2) + .035*Math.sin(u*Math.PI) + layer*.028;
    clothPositions.push(x,y,z);
    const color = new THREE.Color(row===rows || col===0 ? C.ochre : C.petrol);
    color.multiplyScalar(.9+.13*Math.sin(u*Math.PI*5)); clothColors.push(color.r,color.g,color.b);
  }
  const rowSize = columns+1, layerSize = (rows+1)*rowSize;
  for(let layer=0;layer<2;layer++) for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
    const a=layer*layerSize+row*rowSize+col,b=a+1,c=a+rowSize,d=c+1;
    clothIndices.push(...(layer?[a,b,c,b,d,c]:[a,c,b,b,c,d]));
  }
  const clothEdge=(a:number,b:number)=>clothIndices.push(a,b,a+layerSize,b,b+layerSize,a+layerSize);
  for(let col=0;col<columns;col++){clothEdge(col,col+1);clothEdge(rows*rowSize+col+1,rows*rowSize+col);}
  for(let row=0;row<rows;row++){clothEdge((row+1)*rowSize,row*rowSize);clothEdge(row*rowSize+columns,(row+1)*rowSize+columns);}
  const cloth=shape(new THREE.BufferGeometry());cloth.setAttribute('position',new THREE.Float32BufferAttribute(clothPositions,3));cloth.setAttribute('color',new THREE.Float32BufferAttribute(clothColors,3));cloth.setIndex(clothIndices);cloth.computeVertexNormals();
  const cloakGeometry = bake([part(cloth,undefined,[0,0,0]),part(sphere,C.petrol,[-.30,-.03,.01],[.245,.13,.21]),part(sphere,C.brass,[-.30,-.06,.19],[.042,.042,.018])]);

  // Each short bow has a stock, rail, curved limbs, string, loaded bolt and sea-glass sight.
  const stock=shape(plaque([[-.065,-.10],[.055,-.10],[.072,.02],[.055,.39],[0,.49],[-.055,.39],[-.072,.02]],.07,.014));
  const limb=shape(plaque([[-.35,.00],[-.28,.075],[-.12,.10],[0,.045],[.12,.10],[.28,.075],[.35,0],[.30,-.05],[.12,.018],[0,-.012],[-.12,.018],[-.30,-.05]],.035,.01));
  const weaponGeometry=bake([
    part(stock,C.ivory,[0,.04,.23],[1,1,1],[Math.PI/2,0,0]),
    part(limb,C.brass,[0,.055,.41],[1,1,1],[Math.PI/2,0,0]),
    part(sphere,C.slate,[0,.025,.23],[.055,.062,.19]),
    beam([0,.10,.08],[0,.10,.62],.018,C.brass),
    beam([-.345,.055,.41],[0,.066,.14],.006,C.string),beam([.345,.055,.41],[0,.066,.14],.006,C.string),
    beam([0,.125,.16],[0,.125,.62],.007,C.pale),
    part(gem,C.pale,[0,.125,.65],[.022,.016,.06]),
    part(sphere,C.leather,[0,-.045,.13],[.05,.10,.055]),
    part(sphere,C.brass,[0,.11,.35],[.065,.025,.045]),
  ]);
  const fittingGeometry=bake([part(gem,C.glass,[0,.145,.35],[.035,.035,.047]),part(gem,C.glass,[-.245,.063,.43],[.034,.020,.035]),part(gem,C.glass,[.245,.063,.43],[.034,.020,.035])]);
  // Baked geometry owns all retained data. Construction-only primitives can be released now.
  temporaries.forEach(g=>g.dispose());

  function instantiate(): ModelInstance & {projectileAnchor: THREE.Object3D} {
    const root=new THREE.Group();root.name='Grayharbor Pathfinder';
    const joint=(parent:THREE.Object3D,name:string,x=0,y=0,z=0)=>{const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};
    function mesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,name:string,material=surface){const object=new THREE.Mesh(geometry,material);object.name=name;object.castShadow=material===surface;object.receiveShadow=material===surface;parent.add(object);return object;}
    const hips=joint(root,'hips',0,1.07,0),torso=joint(hips,'aim');mesh(torso,torsoGeometry,'Tailored cuirass');
    const neck=joint(torso,'scarf',0,.77,0);mesh(neck,neckGeometry,'Ochre neck scarf');
    const head=joint(torso,'head',0,.91,.005);mesh(head,headGeometry,'Uncovered face and swept hair');
    const cloak=joint(torso,'weather cape',0,.70,-.145);mesh(cloak,cloakGeometry,'Asymmetric folded cape');
    const legs=[-1,1].map(side=>{
      const thigh=joint(hips,`thigh ${side}`,side*.17,0,0);mesh(thigh,thighGeometry,'Trouser and thigh panel');
      const shin=joint(thigh,`shin ${side}`,0,-.50,0);mesh(shin,shinGeometry,'Knee and shaped greave');
      const foot=joint(shin,`foot ${side}`,0,-.47,0);mesh(foot,footGeometry,'Grounded boot');return {thigh,shin,foot};
    });
    const arms=[-1,1].map(side=>{
      const upper=joint(torso,`upper arm ${side}`);mesh(upper,upperArmGeometry,'Coat sleeve');
      const lower=joint(torso,`bracer ${side}`);mesh(lower,forearmGeometry,'Ivory wrist bracer');
      const hand=joint(torso,`hand ${side}`);mesh(hand,handGeometry,'Crossbow grip hand');
      const weapon=joint(hand,`crossbow ${side}`,0,-.015,-.08);mesh(weapon,weaponGeometry,'Ivory brass hand crossbow');mesh(weapon,fittingGeometry,'Sea-glass fittings',luminous);
      const muzzle=joint(weapon,`bolt release ${side}`,0,.125,.71);return {upper,lower,hand,weapon,muzzle};
    });
    const projectileAnchor=joint(arms[1].weapon,'projectile origin',0,.125,.71);
    const down=new THREE.Vector3(0,-1,0),direction=new THREE.Vector3();
    const shoulder=new THREE.Vector3(),elbow=new THREE.Vector3(),grip=new THREE.Vector3();
    function limb(group:THREE.Group,from:THREE.Vector3,to:THREE.Vector3){direction.subVectors(to,from);group.position.copy(from);group.scale.set(1,direction.length(),1);group.quaternion.setFromUnitVectors(down,direction.normalize());}
    let elapsed=0,stride=0,running=0,actionTime=10,shot=0,action:'attack'|'cast'|undefined;
    let ability:string|undefined;
    function update(motion:'idle'|'run',dt:number,rate=1){
      elapsed+=dt;running=THREE.MathUtils.lerp(running,motion==='run'?1:0,1-Math.exp(-14*dt));stride+=dt*RANGER_STRIDE_HZ*rate*running;
      const cycle=stride*TAU,step=Math.sin(cycle)*running;
      hips.position.y=1.07-running*(.045+.025*Math.abs(Math.cos(cycle)))+Math.sin(elapsed*2.4)*.004;
      legs.forEach(({thigh,shin,foot},i)=>{
        const phase=(stride+i*.5)%1,forward=Math.cos(phase*TAU)*.36*running,lift=phase<.5?0:-Math.sin(phase*TAU)*.17*running;
        const drop=hips.position.y-.108-lift,reach=Math.min(Math.hypot(drop,forward),.969);
        const knee=Math.PI-Math.acos(THREE.MathUtils.clamp((.50**2+.47**2-reach**2)/(2*.50*.47),-1,1));
        thigh.rotation.x=Math.atan2(-forward,drop)-Math.acos(THREE.MathUtils.clamp((.50**2+reach**2-.47**2)/(2*.50*reach),-1,1));
        shin.rotation.x=knee;foot.rotation.x=-thigh.rotation.x-knee;
      });
      actionTime+=dt;
      const duration=action==='cast'?.64:.42;
      if(actionTime>duration)action=undefined;
      const active=action!==undefined;
      const aim=active?(actionTime<.12?THREE.MathUtils.smoothstep(actionTime,0,.12):1-THREE.MathUtils.smoothstep(actionTime,.21,duration)):0;
      const recoil=active?Math.max(0,1-Math.abs(actionTime-.18)/.07):0;
      const flourish=action==='cast'&&ability!=='q'?Math.sin(Math.min(1,actionTime/.64)*Math.PI):0;
      torso.rotation.set(.10*running-.055*aim,-.045*step+(shot%2?-.065:.065)*aim,.025*step);
      head.rotation.set(-.07*running-.04*aim,-torso.rotation.y*.7,0);
      cloak.rotation.set(-.14-.30*running+.035*Math.sin(elapsed*3),.04*step,-.035*step);
      arms.forEach(({upper,lower,hand},i)=>{
        const side=i===0?-1:1,firing=action==='cast'||i===shot%2?1:0,a=aim*firing;
        grip.set(side*(.49+.04*running+.02*flourish),.31+.22*a+.12*flourish-.025*running,.32+.39*a-.075*recoil*firing);
        grip.y+=.025*Math.sin(elapsed*2.4+i*.5)+.045*step*side*(1-a);
        hand.position.copy(grip);hand.rotation.set(-.12-.17*a-.45*flourish-.10*recoil*firing,side*(.10-.08*a),side*(.06+.13*running+.07*flourish));
        shoulder.set(side*.34,.63,-.005);
        // A laterally bent elbow remains readable and overlaps sleeve/bracer volumes.
        elbow.copy(shoulder).lerp(grip,.50);elbow.x+=side*(.16-.065*a);elbow.y-=.18-.12*a;elbow.z-=.045;
        limb(upper,shoulder,elbow);limb(lower,elbow,grip);
      });
    }
    update('idle',0);
    return {root,projectileAnchor,update,play(motion,key){action=motion;ability=key;actionTime=0;if(motion==='attack')shot++;},dispose(){root.removeFromParent();}};
  }
  return {instantiate,dispose(){geometries.forEach(g=>g.dispose());surface.dispose();luminous.dispose();}};
}

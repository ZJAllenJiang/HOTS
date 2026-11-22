import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {ModelInstance} from './model-assets';
import type {Key} from './contracts';
import {PROJECTILE_RULES} from './projectiles';
import {FROST_AREA_RULES} from './sim';

/** Original cold-weather arcanist. Rigid wardrobe pieces are baked once per joint. */
export function createPrismWardenArt() {
  const colors = {
    coat: 0x236b74, fold: 0x173e50, lining: 0x7bb2af, ivory: 0xe8dfc4,
    dark: 0x1e2e3d, leather: 0x424253, skin: 0xc89a86, hair: 0xe4e0d5,
    gold: 0xcda767, steel: 0x92abae, crystal: 0x73e8e0,
  };
  const cloth = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .86, metalness: .03, side: THREE.DoubleSide});
  const metal = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .39, metalness: .58});
  const crystal = new THREE.MeshStandardMaterial({color: colors.crystal, emissive: 0x48bcb6, emissiveIntensity: .75, roughness: .24, metalness: .18});
  const box = new THREE.BoxGeometry(), sphere = new THREE.SphereGeometry(1, 12, 8);
  const point = new THREE.OctahedronGeometry(), tube = new THREE.CylinderGeometry(1, 1, 1, 8);
  const geometries: THREE.BufferGeometry[] = [];
  type XYZ = [number, number, number];
  type Part = {shape: THREE.BufferGeometry; color: number; p: XYZ; s: XYZ; r?: XYZ};
  const part = (shape: THREE.BufferGeometry, color: number, p: XYZ, s: XYZ, r?: XYZ): Part => ({shape, color, p, s, r});
  function bake(parts: Part[]) {
    const transform = new THREE.Object3D();
    const pieces = parts.map(spec => {
      const geometry = spec.shape.index ? spec.shape.toNonIndexed() : spec.shape.clone();
      transform.position.set(...spec.p); transform.scale.set(...spec.s); transform.rotation.set(...(spec.r ?? [0, 0, 0])); transform.updateMatrix();
      geometry.applyMatrix4(transform.matrix);
      const color = new THREE.Color(spec.color), data = new Float32Array(geometry.getAttribute('position').count * 3);
      for (let i = 0; i < data.length; i += 3) {data[i] = color.r; data[i + 1] = color.g; data[i + 2] = color.b;}
      geometry.setAttribute('color', new THREE.BufferAttribute(data, 3));
      geometry.deleteAttribute('uv');
      return geometry;
    });
    const geometry = mergeGeometries(pieces, false)!;
    pieces.forEach(piece => piece.dispose()); geometry.computeBoundingSphere(); geometries.push(geometry);
    return geometry;
  }
  function beam(a: XYZ, b: XYZ, width: number, color: number): Part {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from);
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()));
    return part(tube, color, from.add(to).multiplyScalar(.5).toArray() as XYZ, [width, direction.length(), width], [rotation.x, rotation.y, rotation.z]);
  }
  // Swept ring surfaces give the clothing a continuous volume and broad folds.
  function surface(rows: number, segments: number, at: (row: number, u: number) => XYZ, caps = false) {
    const positions: number[] = [], indices: number[] = [];
    for (let row = 0; row < rows; row++) for (let i = 0; i <= segments; i++) positions.push(...at(row, i / segments));
    for (let row = 0; row < rows - 1; row++) for (let i = 0; i < segments; i++) {
      const a = row * (segments + 1) + i, b = a + segments + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
    if (caps) for (const row of [0, rows - 1]) {
      const start = row * (segments + 1), center = new THREE.Vector3();
      for (let i = 0; i < segments; i++) center.add(new THREE.Vector3(...at(row, i / segments)));
      positions.push(...center.multiplyScalar(1 / segments).toArray());
      const end = positions.length / 3 - 1;
      for (let i = 0; i < segments; i++) indices.push(...(row ? [start + i, start + i + 1, end] : [start + i + 1, start + i, end]));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    geometries.push(geometry); return geometry;
  }
  function profile(rings: [number, number, number][], segments = 12) {
    rings = [...rings].sort((a,b) => a[0]-b[0]);
    return surface(rings.length, segments, (row, u) => {
      const [y, x, z] = rings[row], angle = u * Math.PI * 2;
      return [Math.sin(angle) * x, y, Math.cos(angle) * z];
    }, true);
  }
  function ribbon(points: [number, number][], depth = .025) {
    const shape = new THREE.Shape(); shape.moveTo(...points[0]); points.slice(1).forEach(p => shape.lineTo(...p)); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: false}); geometries.push(geometry); return geometry;
  }
  const body = profile([[0, .29, .19], [.24, .30, .21], [.56, .39, .235], [.76, .30, .20]]);
  const surplice = ribbon([[-.29,.70],[-.13,.74],[.22,.23],[.13,.14],[-.04,.38]]);
  const torsoGeometry = bake([
    part(body, colors.coat, [0,0,0], [1,1,1]),
    part(surplice, colors.ivory, [0,0,.222], [1,1,1]),
    part(profile([[.02,.31,.23],[.14,.32,.235]]), colors.leather, [0,0,0], [1,1,1]),
    part(sphere, colors.dark, [-.29,.07,.14], [.13,.16,.115]),
    part(box, colors.gold, [-.29,.12,.23], [.15,.035,.03]),
  ]);
  const torsoMetal = bake([
    part(box, colors.gold, [.04,.085,.254], [.18,.13,.045]),
    part(point, colors.steel, [.04,.085,.285], [.066,.055,.025]),
    part(point, colors.gold, [.225,.55,.258], [.115,.145,.035]),
    part(point, colors.steel, [.225,.55,.292], [.058,.078,.022]),
  ]);

  // The hood has a real open face and a rounded back, rather than stacked polyhedra.
  const hood = surface(4, 16, (row, u) => {
    const rings = [[.238,.303,.235],[.33,.405,.045],[.29,.36,-.17],[.04,.055,-.285]];
    const [x,y,z] = rings[row], angle = u * Math.PI * 2;
    return [Math.sin(angle)*x, .18 + Math.cos(angle)*y, z - .025*Math.cos(angle)];
  });
  const hoodRim = surface(2, 16, (row,u) => {
    const a = u*Math.PI*2, x = row ? .238 : .276, y = row ? .303 : .345;
    return [Math.sin(a)*x, .18+Math.cos(a)*y, .242-.025*Math.cos(a)];
  });
  const brow = ribbon([[-.18,.25],[-.035,.235],[-.035,.213],[-.17,.222]], .012);
  const headGeometry = bake([
    part(hood, colors.coat, [0,0,0], [1,1,1]),
    part(hoodRim, colors.ivory, [0,0,0], [1,1,1]),
    part(sphere, colors.skin, [0,.16,.177], [.192,.259,.148]),
    part(sphere, colors.hair, [-.142,.247,.227], [.065,.19,.084], [0,0,-.19]),
    part(sphere, colors.hair, [.142,.256,.214], [.063,.176,.083], [0,0,.19]),
    part(brow, colors.dark, [0,0,.311], [1,1,1]),
    part(brow, colors.dark, [0,0,.311], [-1,1,1]),
    part(box, colors.ivory, [-.094,.208,.313], [.083,.024,.018]),
    part(box, colors.ivory, [.094,.208,.313], [.083,.024,.018]),
    part(sphere, colors.skin, [0,.137,.317], [.041,.068,.052]),
    part(box, colors.leather, [0,.052,.302], [.084,.015,.018]),
  ]);

  const mantleShape = surface(4, 18, (row,u) => {
    const a=.36+u*(Math.PI*2-.72), behind=(1-Math.cos(a))*.5;
    const rings=[[.68,.25,.22],[.75,.34,.29],[.57,.58,.37],[.34,.49,.34]];
    const [y,x,z]=rings[row];
    return [Math.sin(a)*x, y-(row===3?.25*behind:0)+.025*Math.sin(a), Math.cos(a)*z];
  });
  const collarShape = surface(3, 16, (row,u) => {
    const a=.35+u*(Math.PI*2-.70), rings=[[.70,.26,.23],[.83,.32,.27],[.76,.39,.30]];
    const [y,x,z]=rings[row]; return [Math.sin(a)*x,y,Math.cos(a)*z];
  });
  const mantleGeometry = bake([
    part(mantleShape, colors.fold, [0,0,-.015], [1,1,1]),
    part(collarShape, colors.ivory, [0,0,0], [1,1,1]),
  ]);
  const robeGeometries = [-1,1].map(side => {
    const robe = surface(5, 10, (row,u) => {
      const a = side*(.10+u*(Math.PI-.10)), t=row/4;
      const fold=1+.045*Math.cos(a*6)*t;
      return [Math.sin(a)*(.30+.20*t)*fold, .12-.86*t+.075*Math.cos(a*2)*t*t, Math.cos(a)*(.21+.13*t)*fold];
    });
    const hem = surface(2, 10, (row,u) => {
      const a=side*(.10+u*(Math.PI-.10)), t=.94+row*.06, fold=1+.045*Math.cos(a*6)*t;
      return [Math.sin(a)*(.30+.20*t)*fold, .12-.86*t+.075*Math.cos(a*2)*t*t, Math.cos(a)*(.213+.13*t)*fold];
    });
    // Mirroring changes winding; bake normalizes both panels to an outward surface.
    if(side>0)for(const shape of [robe,hem]) {
      const index=shape.index!;for(let i=0;i<index.count;i+=3){const a=index.getX(i);index.setX(i,index.getX(i+1));index.setX(i+1,a);}shape.computeVertexNormals();
    }
    return bake([part(robe,colors.coat,[0,0,0],[1,1,1]),part(hem,colors.ivory,[0,0,0],[1,1,1])]);
  });
  const thighGeometry=bake([part(profile([[0,.145,.14],[-.44,.13,.13]]),colors.fold,[0,0,0],[1,1,1])]);
  const shinGeometry=bake([
    part(profile([[0,.145,.14],[-.15,.13,.14],[-.40,.11,.115]]),colors.leather,[0,0,0],[1,1,1]),
    part(sphere,colors.steel,[0,-.075,.115],[.105,.15,.045]),
  ]);
  const bootGeometry=bake([
    part(sphere,colors.dark,[0,-.035,.09],[.14,.10,.235]),
    part(sphere,colors.leather,[0,.015,.13],[.12,.115,.19]),
    part(box,colors.gold,[0,.03,.226],[.17,.034,.028]),
  ]);
  const upperArmGeometry=bake([part(profile([[0,.145,.15],[-.13,.17,.16],[-.35,.125,.125]]),colors.coat,[0,0,0],[1,1,1])]);
  const forearmGeometry=bake([
    part(profile([[0,.12,.12],[-.17,.17,.15],[-.25,.17,.15],[-.28,.13,.12]]),colors.fold,[0,0,0],[1,1,1]),
    part(profile([[-.19,.175,.155],[-.25,.175,.155]]),colors.ivory,[0,0,0],[1,1,1]),
    part(sphere,colors.skin,[0,-.33,.015],[.097,.12,.086]),
  ]);

  // Long, curved open prongs frame a single bright focus outside the body silhouette.
  const staffParts: Part[]=[
    beam([0,-1.10,0],[0,.63,0],.044,colors.leather),
    beam([0,-.12,0],[0,.18,0],.056,colors.dark),
    beam([0,-1.13,0],[0,-.99,0],.063,colors.gold),
    beam([0,.49,0],[0,.65,0],.073,colors.gold),
  ];
  for(const side of [-1,1]) {
    const points: XYZ[]=[[0,.55,0],[side*.18,.72,0],[side*.225,.97,0],[side*.16,1.20,.01]];
    for(let i=1;i<points.length;i++)staffParts.push(beam(points[i-1],points[i],i===3?.042:.055,i===2?colors.steel:colors.gold));
    staffParts.push(part(point,colors.gold,[side*.16,1.21,.01],[.053,.085,.05]));
  }
  const staffGeometry=bake(staffParts);
  const focusGeometry=bake([
    part(point,0xffffff,[0,.94,0],[.125,.248,.12]),
    part(point,0xffffff,[0,1.235,0],[.033,.067,.032]),
  ]);

  function instantiate(): ModelInstance {
    const root=new THREE.Group();root.name='Prism Warden';
    function joint(parent:THREE.Object3D,name:string,x:number,y:number,z:number) {
      const group=new THREE.Group();group.name=name;group.position.set(x,y,z);parent.add(group);return group;
    }
    function mesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,material:THREE.Material=cloth) {
      const object=new THREE.Mesh(geometry,material);object.castShadow=material!==crystal;object.receiveShadow=material!==crystal;parent.add(object);return object;
    }
    const hips=joint(root,'hips',0,.985,0),torso=joint(hips,'chest',0,0,0);
    mesh(torso,torsoGeometry);mesh(torso,torsoMetal,metal);
    const mantle=joint(torso,'winter mantle',0,0,0);mesh(mantle,mantleGeometry);
    const head=joint(torso,'open hood',0,.99,.015);mesh(head,headGeometry);
    const robes=robeGeometries.map((geometry,i)=>{const panel=joint(torso,`coat panel ${i}`,0,0,0);mesh(panel,geometry);return panel;});
    const legs=[-1,1].map(side=>{
      const thigh=joint(hips,`thigh ${side}`,side*.18,0,0);mesh(thigh,thighGeometry);
      const shin=joint(thigh,`shin ${side}`,0,-.46,0);mesh(shin,shinGeometry);
      const foot=joint(shin,`boot ${side}`,0,-.40,0);mesh(foot,bootGeometry);return {thigh,shin,foot};
    });
    const arms=[-1,1].map(side=>{
      const shoulder=joint(torso,`sleeve ${side}`,side*.38,.64,0);mesh(shoulder,upperArmGeometry);
      const elbow=joint(torso,`cuff ${side}`,0,0,0);mesh(elbow,forearmGeometry);return {shoulder,elbow};
    });
    const staff=joint(torso,'prism staff',.84,.32,.25);mesh(staff,staffGeometry,metal);
    const focus=joint(staff,'suspended focus',0,0,0);mesh(focus,focusGeometry,crystal);
    const projectileAnchor=joint(focus,'projectile origin',0,1.04,.03);
    const down=new THREE.Vector3(0,-1,0),direction=new THREE.Vector3(),shoulderPoint=new THREE.Vector3(),elbowPoint=new THREE.Vector3(),target=new THREE.Vector3();
    function limb(group:THREE.Group,from:THREE.Vector3,to:THREE.Vector3,length:number) {
      direction.subVectors(to,from);group.position.copy(from);group.scale.y=direction.length()/length;
      group.quaternion.setFromUnitVectors(down,direction.normalize());
    }
    let elapsed=0,stride=0,running=0,actionTime=10;
    let action:'attack'|'cast'|undefined,ability:Key|undefined;
    function update(motion:'idle'|'run',dt:number,rate=1) {
      elapsed+=dt;running=THREE.MathUtils.lerp(running,motion==='run'?1:0,1-Math.exp(-14*dt));
      stride+=dt*2.25*rate*running;
      const cycle=stride*Math.PI*2,step=Math.sin(cycle)*running;
      hips.position.y=.985+.005*Math.sin(elapsed*3)-running*(.07+.026*Math.abs(Math.cos(cycle)));
      legs.forEach(({thigh,shin,foot},i)=>{
        const phase=(stride+i*.5)%1,forward=Math.cos(phase*Math.PI*2)*.32*running;
        const lift=phase<.5?0:-Math.sin(phase*Math.PI*2)*.22*running,drop=hips.position.y-.125-lift;
        const reach=Math.min(Math.hypot(drop,forward),.859);
        const knee=Math.PI-Math.acos(THREE.MathUtils.clamp((.46**2+.40**2-reach**2)/(2*.46*.40),-1,1));
        thigh.rotation.x=Math.atan2(-forward,drop)-Math.acos(THREE.MathUtils.clamp((.46**2+reach**2-.40**2)/(2*.46*reach),-1,1));
        shin.rotation.x=knee;foot.rotation.x=-thigh.rotation.x-knee;
      });
      actionTime+=dt;
      const releaseTime=action==='attack'?.13:ability==='q'?PROJECTILE_RULES.windupTicks*.05:ability==='w'?FROST_AREA_RULES.telegraphSeconds:ability==='r'?.42:.12;
      const duration=releaseTime+.32;if(actionTime>=duration)action=undefined;
      const active=action!==undefined;
      const recover=1-THREE.MathUtils.smoothstep(actionTime,releaseTime+.045,duration);
      const thrust=THREE.MathUtils.smoothstep(actionTime,Math.max(0,releaseTime-.055),releaseTime);
      const prepare=active?THREE.MathUtils.smoothstep(actionTime,0,releaseTime*.72)*(1-thrust)*recover:0;
      const release=active?thrust*recover:0;
      const broad=action==='cast'&&ability!=='q'?1:.63;
      torso.rotation.set(.13*running-.10*prepare+.13*release,-.08*step-.15*prepare+.11*release,.025*step-.035*prepare);
      head.rotation.set(-.06*running+.04*prepare-.06*release,.10*prepare-.07*release,.018*Math.sin(elapsed*1.8));
      mantle.rotation.set(-.04-.12*running,.025*step,-.018*step);
      robes.forEach((panel,i)=>{panel.rotation.set(-.08*running+(i===0?.13:-.13)*step,.018*step,(i===0?-.015:.015)*running);});
      staff.position.set(.84+.035*prepare-.09*release,.32+.24*prepare*broad+.025*release,.25-.08*prepare+.47*release);
      staff.rotation.set(.025-.28*prepare*broad+.94*release,.035*step,-.14-.10*prepare+.18*release);
      staff.updateMatrix();
      // Explicit hand endpoints keep the staff attached during the windup and directed release.
      arms.forEach(({shoulder,elbow},i)=>{
        const right=i===1,side=right?1:-1;
        shoulderPoint.set(side*.38,.64,0);
        elbowPoint.set(right?.64+.04*prepare:-.57-.08*prepare,.30+.12*prepare+.06*release,right?.11:.06+.22*release);
        if(right)target.set(0,0,0).applyMatrix4(staff.matrix);
        else target.set(-.53-.11*prepare,.02+.58*prepare*broad+.41*release,.12+.32*prepare+.54*release-.10*step);
        // The wrist is .33 below the elbow in the authored sleeve.
        limb(shoulder,shoulderPoint,elbowPoint,.35);limb(elbow,elbowPoint,target,.33);
      });
      focus.rotation.y=elapsed*.7+prepare*.5+release*1.2;
      focus.scale.setScalar(1+.08*prepare+.15*release);
    }
    update('idle',0);
    return {root,projectileAnchor,update,play(motion,key){action=motion;ability=key;actionTime=0;},dispose(){root.removeFromParent();}};
  }
  return {instantiate,dispose(){
    geometries.forEach(geometry=>geometry.dispose());for(const geometry of [box,sphere,point,tube])geometry.dispose();
    cloth.dispose();metal.dispose();crystal.dispose();
  }};
}

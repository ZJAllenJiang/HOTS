import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {ModelInstance} from './model-assets';

// Classic demon hunter. Sculpted surfaces and articulated equipment are generated locally.
export const RANGER_PALETTE = {
  slate: 0x39303a, ink: 0x1c1720, petrol: 0x851b25, teal: 0xb23942,
  ivory: 0x918a7c, pale: 0xd8c6b2, leather: 0x593a34, brass: 0x997654,
  ochre: 0x661a23, skin: 0xc08e7b, skinLight: 0xdfac96, hair: 0x221a21,
  glass: 0xffbb65, string: 0xcabda8,
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
  const surface = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .54, metalness: .25});
  const luminous = new THREE.MeshStandardMaterial({color: C.glass, emissive: C.glass, emissiveIntensity: .65, roughness: .3, metalness: .25});
  const sphere = new THREE.SphereGeometry(1, 14, 8);
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
  // Domed plate with a ridge, rolled rim and burnished upper plane. Each side of
  // the cuirass curves back around the ribs; its highlights follow that curve.
  function armor(outline: V[], ridge: V, color: number) {
    const vertices:number[]=[], colors:number[]=[], triangles:number[]=[];
    const ring=(inset:number, depth:number, shade:number)=>{
      outline.forEach(([x,y,z])=>{
        vertices.push(x+(ridge[0]-x)*inset,y+(ridge[1]-y)*inset,z+(ridge[2]-z)*inset+depth);
        const tint=new THREE.Color(color).multiplyScalar(shade*(.86+.14*Math.cos(x*7)));
        colors.push(tint.r,tint.g,tint.b);
      });
    };
    ring(0,-.018,.48);ring(0,0,.76);ring(.095,.007,1.44);ring(.18,.008,1);
    vertices.push(...ridge);const tint=new THREE.Color(color);colors.push(tint.r,tint.g,tint.b);
    const n=outline.length,center=n*4;
    for(let i=0;i<n;i++) {
      const j=(i+1)%n;
      for(let r=0;r<3;r++)triangles.push(r*n+i,r*n+j,(r+1)*n+i,r*n+j,(r+1)*n+j,(r+1)*n+i);
      triangles.push(3*n+i,3*n+j,center);
    }
    // Front winding is normalized because the opposite shoulder is mirrored.
    const area=outline.reduce((sum,v,i)=>{const w=outline[(i+1)%n];return sum+v[0]*w[1]-v[1]*w[0];},0);
    if(area<0)for(let i=0;i<triangles.length;i+=3)[triangles[i+1],triangles[i+2]]=[triangles[i+2],triangles[i+1]];
    const geometry=shape(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(triangles);geometry.computeVertexNormals();return geometry;
  }
  const chest=shape(loft([[.045,.267,.165,0],[.18,.215,.15,0],[.30,.196,.134,0],[.41,.217,.145,0],[.55,.283,.174,.005],[.665,.308,.159,-.008],[.74,.24,.134,-.017],[.795,.13,.112,0]],24));
  const belt=shape(loft([[.06,.263,.18,0],[.125,.253,.18,0],[.145,.238,.162,0]]));
  const buckle=shape(plaque([[-.06,0],[0,.065],[.06,0],[0,-.075]],.018,.006));
  const torsoParts:Part[]=[part(chest,C.leather,[0,0,0]),part(belt,C.ink,[0,0,0]),part(buckle,C.brass,[0,.10,.185])];
  for(const side of [-1,1]) {
    const mirror=(points:V[]):V[]=>points.map(([x,y,z])=>[side*x,y,z]);
    const cuirass=armor(mirror([[.006,.61,.197],[.10,.67,.159],[.225,.696,.112],[.294,.616,.073],[.258,.495,.107],[.09,.405,.182],[.016,.455,.205]]),[side*.123,.535,.236],0x796956);
    torsoParts.push(part(cuirass,undefined,[0,0,0]));
    const tasset=armor(mirror([[.078,.11,.166],[.236,.14,.09],[.288,.041,.052],[.321,-.23,.057],[.20,-.36,.125],[.104,-.21,.163]]),[side*.206,-.074,.178],0x694b2e);
    torsoParts.push(part(tasset,undefined,[0,0,0]));
    // Shoulder armor rises in one swept blade instead of a separate spike.
    const mantle=armor(mirror([[.225,.685,.07],[.288,.79,.035],[.368,.79,.004],[.443,.786,-.04],[.520,.754,.008],[.562,.727,-.013],[.522,.57,.078],[.416,.53,.112],[.318,.60,.14]]),[side*.398,.704,.17],0x7e735d);
    const lower=armor(mirror([[.318,.633,.122],[.435,.70,.13],[.516,.663,.071],[.544,.56,.036],[.478,.467,.062],[.39,.49,.123],[.338,.536,.13]]),[side*.454,.583,.154],0x514333);
    torsoParts.push(part(lower,undefined,[0,0,0]),part(mantle,undefined,[0,0,0]));
  }
  for(let i=0;i<3;i++) {
    const y=.205+i*.062,w=.161+i*.015,z=.151+i*.006;
    const scale=armor([[-w,y+.052,z-.049],[-w*.47,y+.044,z],[0,y+.025,z+.02],[w*.47,y+.044,z],[w,y+.052,z-.049],[w*.92,y-.009,z-.02],[0,y-.051,z+.028],[-w*.92,y-.009,z-.02]],[0,y+.003,z+.033],i===2?0x695740:0x50402d);
    torsoParts.push(part(scale,undefined,[0,0,0]));
  }
  for(const side of [-1,1]){
    const collar=armor([[side*.12,.698,.12],[side*.119,.817,.135],[side*.177,.904,.039],[side*.237,.883,-.026],[side*.255,.762,-.045],[side*.257,.698,.063]],[side*.183,.789,.134],0x61523f);
    torsoParts.push(part(collar,undefined,[0,0,0]));
  }
  const torsoGeometry = bake(torsoParts);
  const scarf = shape(loft([[0,.115,.108,0],[.045,.16,.139,0],[.10,.155,.13,0],[.15,.12,.11,0]]));
  const scarfEnd = shape(plaque([[-.05,0],[.05,0],[.07,-.26],[-.03,-.32]], .018, .008));
  const neckGeometry = bake([part(sphere,C.skin,[0,.12,0],[.09,.17,.09]),part(scarf,C.ochre,[0,0,.015]),part(scarfEnd,C.ochre,[-.19,.045,.16],[1,1,1],[0,0,-.35])]);

  // Sculpt the entire facial plane as one surface. Socket, cheekbone, nose and
  // chin meet without seams even under moving arena light.
  const profile=[[.012,.055,.07,.045],[.055,.104,.111,.042],[.11,.135,.132,.026],
    [.168,.151,.145,.014],[.235,.164,.152,.002],[.31,.165,.153,-.004],[.40,.136,.121,-.015],[.435,.065,.068,-.021]];
  const facePos:number[]=[],faceColor:number[]=[],faceIndex:number[]=[];
  const faceRows=25,faceCols=36;
  for(let row=0;row<=faceRows;row++){
    const y=.012+row/faceRows*.423;
    let segment=0;while(segment<profile.length-2&&y>profile[segment+1][0])segment++;
    const bottom=profile[segment],top=profile[segment+1],fraction=(y-bottom[0])/(top[0]-bottom[0]);
    const size=(i:number)=>THREE.MathUtils.lerp(bottom[i],top[i],fraction);
    for(let col=0;col<faceCols;col++){
      const angle=col/faceCols*TAU,front=Math.max(0,Math.sin(angle)),x=Math.cos(angle)*size(1);
      const oval=(cx:number,cy:number,rx:number,ry:number)=>Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2));
      const pair=(cx:number,cy:number,rx:number,ry:number)=>oval(cx,cy,rx,ry)+oval(-cx,cy,rx,ry);
      const socket=pair(.072,.242,.041,.032), cheek=pair(.09,.187,.039,.04);
      const relief=.050*oval(0,.210,.021,.067)+.032*oval(0,.18,.029,.020)+.016*cheek-.012*socket+
        .014*pair(.068,.276,.051,.021)+.013*oval(0,.116,.049,.025)+.010*oval(0,.067,.044,.025);
      facePos.push(x,y,Math.sin(angle)*size(2)+size(3)+front*relief);
      const tint=new THREE.Color(C.skin).lerp(new THREE.Color(0xae6964),front*cheek*.40);
      tint.multiplyScalar(.88+.13*front-.18*socket*front);faceColor.push(tint.r,tint.g,tint.b);
    }
  }
  for(let row=0;row<faceRows;row++)for(let i=0;i<faceCols;i++){
    const a=row*faceCols+i,b=row*faceCols+(i+1)%faceCols;faceIndex.push(a,a+faceCols,b,b,a+faceCols,b+faceCols);
  }
  const face=shape(new THREE.BufferGeometry());face.setAttribute('position',new THREE.Float32BufferAttribute(facePos,3));
  face.setAttribute('color',new THREE.Float32BufferAttribute(faceColor,3));face.setIndex(faceIndex);face.computeVertexNormals();
  const eye = shape(plaque([[-.047,0],[-.025,.016],[.025,.015],[.046,0],[.02,-.009],[-.026,-.009]], .002,.001));
  const mouth = shape(plaque([[-.043,0],[0,.003],[.038,.008],[.028,-.005],[-.029,-.008]], .002,.001));
  const hairCap = shape(loft([[.29,.168,.155,-.02],[.365,.184,.162,-.02],[.445,.16,.145,-.028],[.49,.095,.095,-.045],[.50,.035,.05,-.04]], 20));
  const lock = shape(plaque([[-.07,.02],[-.01,.12],[.11,.10],[.17,.01],[.04,-.07],[-.055,-.10]], .035,.015));
  // Sweep the hood from its open, pointed hem around the face to a closed back.
  // Keeping the opening as a contour gives the brow a real projecting shadow.
  const rim: V[] = [[0,.503,.210],[.086,.453,.193],[.155,.392,.164],[.19,.272,.147],
    [.206,.115,.132],[.234,-.015,.115],[.15,-.041,.074],[0,-.070,.077],
    [-.15,-.041,.074],[-.234,-.015,.115],[-.206,.115,.132],[-.19,.272,.147],
    [-.155,.392,.164],[-.086,.453,.193]];
  const hoodPos:number[]=[], hoodCols:number[]=[], hoodIdx:number[]=[];
  const sections=[[1,1,0,0],[1.07,1.05,-.062,.005],[1.10,1.04,-.162,.014],[.98,.98,-.265,.008],[.66,.70,-.326,.002],[.08,.12,-.36,0]];
  for(let ring=0;ring<sections.length;ring++) {
    const [sx,sy,dz,dy]=sections[ring];
    rim.forEach(([x,y,z],i)=>{
      const crown = Math.exp(-7*Math.abs(x))*Math.max(0,(y-.37)/.14)*Math.sin(ring/(sections.length-1)*Math.PI);
      hoodPos.push(x*sx,(y-.22)*sy+.22+dy+crown*.12,z+dz);
      const c=new THREE.Color(ring===0?0xc3484c:C.petrol);
      c.multiplyScalar(.67+.36*Math.max(0,(y+.07)/.60)+.09*Math.cos(i*2.4));
      hoodCols.push(c.r,c.g,c.b);
    });
  }
  for(let ring=0;ring<sections.length-1;ring++) for(let i=0;i<rim.length;i++){
    const a=ring*rim.length+i,b=ring*rim.length+(i+1)%rim.length;
    hoodIdx.push(a,b,a+rim.length,b,b+rim.length,a+rim.length);
  }
  const end=(sections.length-1)*rim.length;
  for(let i=1;i<rim.length-1;i++) hoodIdx.push(end,end+i,end+i+1);
  const hood=shape(new THREE.BufferGeometry());
  hood.setAttribute('position',new THREE.Float32BufferAttribute(hoodPos,3));
  hood.setAttribute('color',new THREE.Float32BufferAttribute(hoodCols,3));
  hood.setIndex(hoodIdx);hood.computeVertexNormals();
  const hoodParts=rim.map((point,i)=>beam(point,rim[(i+1)%rim.length],.009,0x69242c));
  const headGeometry = bake([
    ...[-1,1].map(side=>part(shape(loft([[.32,.049,.046,0],[.23,.055,.045,.012],[.12,.045,.036,.029],[.018,.039,.027,.042],[-.092,.019,.020,.053],[-.139,.002,.002,.065]],10)),C.hair,[side*.139,0,.093],[.74,1,.83],[.09,0,side*.14])),
    part(hood,undefined,[0,0,0]), ...hoodParts,
    part(face,undefined,[0,0,0]),
    part(sphere,C.skin,[-.168,.205,0],[.035,.061,.043]),part(sphere,C.skin,[.168,.205,0],[.035,.061,.043]),
    part(eye,C.ink,[-.074,.249,.139],[1,1,1],[0,-.28,0]),part(eye,C.ink,[.074,.249,.139],[1,1,1],[0,.28,0]),
    part(sphere,C.pale,[-.073,.249,.148],[.022,.006,.003]),part(sphere,C.pale,[.073,.249,.148],[.022,.006,.003]),
    part(sphere,C.glass,[-.069,.249,.152],[.015,.007,.005]),part(sphere,C.glass,[.077,.249,.152],[.015,.007,.005]),
    beam([-.122,.28,.138],[-.032,.282,.154],.009,C.hair),beam([.032,.282,.154],[.122,.28,.138],.009,C.hair),
    part(mouth,0x794a4e,[0,.116,.173],[1.05,1.32,1]),
    part(hairCap,C.hair,[0,-.016,.012],[.92,.94,.82]),part(lock,C.hair,[-.065,.36,.12],[.9,.7,1],[.2,.1,-.35]),
    part(lock,C.slate,[.055,.41,.09],[.72,.48,.9],[.3,.2,-.45]),
    part(sphere,C.hair,[-.153,.267,.015],[.026,.093,.10]),
    part(sphere,C.brass,[.183,.172,.012],[.011,.024,.012]),
  ]);

  const thighHull = shape(loft([[0,.145,.14,0],[-.12,.16,.145,0],[-.31,.14,.135,.015],[-.50,.108,.115,.015]]));
  const thighPlate = shape(plaque([[-.10,0],[.09,0],[.105,-.24],[.055,-.32],[-.075,-.30],[-.115,-.13]], .024,.017));
  const thighGeometry = bake([part(thighHull,0x78292c,[0,0,0]),part(thighPlate,0x7a633e,[0,-.20,.125],[.94,.69,1]),beam([-.09,-.15,.148],[.09,-.15,.148],.012,C.brass)]);
  const calf = shape(loft([[.035,.11,.11,0],[-.10,.13,.115,-.01],[-.28,.11,.10,-.005],[-.47,.085,.09,.015]]));
  const shinShield=armor([[-.117,.044,.077],[-.063,.103,.093],[0,.072,.101],[.101,.094,.063],[.144,-.043,.047],[.082,-.179,.081],[.038,-.41,.08],[0,-.455,.087],[-.039,-.414,.084],[-.071,-.162,.095],[-.124,-.064,.063]],[0,-.104,.155],0x908e90);
  const shinGeometry=bake([part(calf,0x453834,[0,0,0]),part(shinShield,undefined,[0,0,0]),
    ...[-1,1].flatMap(side=>[beam([side*.076,.037,.108],[side*.042,-.137,.138],.010,C.ink),
      beam([side*.042,-.137,.138],[0,-.18,.14],.010,C.ink),
      beam([side*.087,.041,.113],[side*.052,-.138,.146],.006,C.pale),
      beam([side*.052,-.138,.146],[0,-.191,.145],.006,C.pale)])]);
  const bootHull = shape(loft([[-.10,.115,.18,.07],[-.045,.125,.22,.09],[.03,.10,.16,.045],[.12,.083,.09,.01]]));
  const sole = shape(loft([[-.105,.122,.19,.075],[-.075,.127,.22,.09],[-.052,.12,.21,.09]]));
  const footGeometry = bake([part(bootHull,C.leather,[0,0,0],[.81,.94,1]),part(sole,C.ink,[0,0,0],[.83,.92,1]),part(sphere,C.slate,[0,-.025,.19],[.085,.039,.12]),beam([-.09,.03,.13],[.09,.03,.13],.012,C.brass)]);
  const upperHull = shape(loft([[.07,.13,.13,0],[-.06,.135,.13,0],[-.38,.12,.12,0],[-.78,.093,.095,0],[-1.03,.092,.09,0]]));
  const upperArmGeometry = bake([part(upperHull,0x91272c,[0,0,0])]);
  const forearmHull = shape(loft([[.03,.095,.09,0],[-.20,.12,.10,0],[-.55,.118,.11,0],[-.96,.082,.075,0],[-1.04,.08,.075,0]]));
  const bracer = shape(plaque([[-.09,-.10],[.085,-.10],[.09,-.64],[.055,-.89],[-.065,-.88],[-.105,-.51]], .022,.013));
  const forearmGeometry = bake([part(forearmHull,C.leather,[0,0,0]),part(bracer,0x75644e,[0,0,.09]),beam([-.065,-.21,.13],[.065,-.21,.13],.015,C.brass)]);
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
    const flare = Math.sin(t*Math.PI*.75);
    const left = -.39-.21*flare, right=.34+.09*flare;
    const x = THREE.MathUtils.lerp(left,right,u), y = -1.19*t + (.20*Math.abs(Math.sin(u*Math.PI*3))+.085*u)*t*t;
    const z = -.065 - .28*t + .055*Math.sin(u*Math.PI*5)*(t*.8+.2) + .035*Math.sin(u*Math.PI) + layer*.028;
    clothPositions.push(x,y,z);
    const color = new THREE.Color(row===rows || col===0 || col===columns ? C.ochre : C.petrol);
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
  const recurvedTip=shape(plaque([[-.04,-.015],[.035,-.07],[.135,-.12],[.225,-.29],[.18,-.12],[.21,-.095],[.155,-.02],[.055,.045]],.032,.008));
  const leftTip=shape(recurvedTip.clone());leftTip.rotateY(Math.PI);
  const weaponGeometry=bake([
    part(recurvedTip,C.ivory,[.30,.064,.42],[.82,.79,1],[Math.PI/2,0,0]),
    part(leftTip,C.ivory,[-.30,.064,.42],[.82,.79,1],[Math.PI/2,0,0]),
    part(stock,0x62523b,[0,.04,.17],[1.18,1.09,1.14],[Math.PI/2,0,0]),
    part(limb,0x826640,[0,.055,.41],[1,1,1],[Math.PI/2,0,0]),
    part(sphere,0x453626,[0,.025,.23],[.06,.072,.22]),
    ...[-1,1].map(side=>beam([side*.05,.087,-.015],[side*.043,.09,.61],.014,C.brass)),
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
    const root=new THREE.Group();root.name='Valla';
    const joint=(parent:THREE.Object3D,name:string,x=0,y=0,z=0)=>{const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};
    function mesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,name:string,material=surface){const object=new THREE.Mesh(geometry,material);object.name=name;object.castShadow=material===surface;object.receiveShadow=material===surface;parent.add(object);return object;}
    const hips=joint(root,'hips',0,1.07,0),torso=joint(hips,'aim');mesh(torso,torsoGeometry,'Tailored cuirass');
    const neck=joint(torso,'scarf',0,.77,0);mesh(neck,neckGeometry,'Crimson cowl');
    const head=joint(torso,'head',0,.91,.005);mesh(head,headGeometry,'Pointed hood and shaded face');
    const cloak=joint(torso,'weather cape',0,.70,-.145);mesh(cloak,cloakGeometry,'Scalloped hunting cloak');
    const legs=[-1,1].map(side=>{
      const thigh=joint(hips,`thigh ${side}`,side*.17,0,0);mesh(thigh,thighGeometry,'Trouser and thigh panel');
      const shin=joint(thigh,`shin ${side}`,0,-.50,0);mesh(shin,shinGeometry,'Knee and shaped greave');
      const foot=joint(shin,`foot ${side}`,0,-.47,0);mesh(foot,footGeometry,'Grounded boot');return {thigh,shin,foot};
    });
    const arms=[-1,1].map(side=>{
      const upper=joint(torso,`upper arm ${side}`);mesh(upper,upperArmGeometry,'Coat sleeve');
      const lower=joint(torso,`bracer ${side}`);mesh(lower,forearmGeometry,'Ivory wrist bracer');
      const hand=joint(torso,`hand ${side}`);mesh(hand,handGeometry,'Crossbow grip hand');
      const weapon=joint(hand,`crossbow ${side}`,0,-.015,-.08);mesh(weapon,weaponGeometry,'Recurved steel hand crossbow');mesh(weapon,fittingGeometry,'Amber sights',luminous);
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
      hips.position.y=.982+running*(.039-.025*Math.abs(Math.cos(cycle)))+Math.sin(elapsed*2.4)*.004;
      legs.forEach(({thigh,shin,foot},i)=>{
        const phase=(stride+i*.5)%1,forward=(i===0?.17:-.12)*(1-running)+Math.cos(phase*TAU)*.36*running,lift=phase<.5?0:-Math.sin(phase*TAU)*.17*running;
        const opening=(i===0?-1:1)*(.17-.11*running);
        thigh.rotation.order='ZXY';thigh.rotation.z=opening;foot.rotation.z=-opening;
        const drop=(hips.position.y-.108-lift)/Math.cos(opening),reach=Math.min(Math.hypot(drop,forward),.969);
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
      torso.rotation.set(.065+.065*running-.055*aim,-.17*(1-running)*(1-aim)-.045*step+(shot%2?-.065:.065)*aim,.025*step+.025*(1-running));
      head.rotation.set(-.07*running-.04*aim,-torso.rotation.y*.7,0);
      cloak.rotation.set(-.14-.30*running+.035*Math.sin(elapsed*3),.04*step,-.035*step);
      arms.forEach(({upper,lower,hand},i)=>{
        const side=i===0?-1:1,firing=action==='cast'||i===shot%2?1:0,a=aim*firing;
        grip.set(side*(.49+.04*running+.02*flourish),.27+side*.065*(1-a)+.26*a+.12*flourish-.025*running,.32+.39*a-.075*recoil*firing);
        const highGuard=(i===0?1:0)*(1-running)*(1-aim);
        grip.y+=.27*highGuard;
        grip.y+=.025*Math.sin(elapsed*2.4+i*.5)+.045*step*side*(1-a);
        hand.position.copy(grip);hand.rotation.set(-.15-.98*highGuard-.17*a-.45*flourish-.10*recoil*firing,side*(.28-.26*a),side*(.06+.13*running+.07*flourish));
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

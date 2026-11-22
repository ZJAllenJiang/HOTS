import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createPrismWardenArt} from '../src/prism-warden';
import {PROJECTILE_RULES} from '../src/projectiles';
import {FROST_AREA_RULES} from '../src/sim';

it('shares the authored wardrobe while keeping poses independent and draw costs bounded',()=>{
  const art=createPrismWardenArt(),first=art.instantiate(),second=art.instantiate();
  const meshes=(root:THREE.Object3D)=>{const result:THREE.Mesh[]=[];root.traverse(object=>{if(object instanceof THREE.Mesh)result.push(object);});return result;};
  const a=meshes(first.root),b=meshes(second.root);
  // Previous mage: 60 meshes and 25 shadow casters. Curved clothing uses more triangles,
  // but must stay within this per-actor draw/shadow budget at ten-hero battle scale.
  expect(a.length).toBeLessThanOrEqual(20);
  expect(a.filter(mesh=>mesh.castShadow).length).toBeLessThanOrEqual(18);
  expect(a.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3,0)).toBeLessThanOrEqual(4500);
  a.forEach((mesh,i)=>{expect(mesh.geometry).toBe(b[i].geometry);expect(mesh.material).toBe(b[i].material);});
  first.play('cast','w');first.update('idle',FROST_AREA_RULES.telegraphSeconds);
  expect(first.root.getObjectByName('prism staff')!.rotation.x).toBeGreaterThan(.8);
  expect(second.root.getObjectByName('prism staff')!.rotation.x).toBeCloseTo(.025);
  first.dispose();second.dispose();art.dispose();
});

it('holds W until its telegraph release while Q retains its earlier projectile release',()=>{
  const art=createPrismWardenArt(),w=art.instantiate(),q=art.instantiate();
  w.play('cast','w');q.play('cast','q');
  const qRelease=PROJECTILE_RULES.windupTicks*.05;
  w.update('idle',qRelease);q.update('idle',qRelease);
  expect(w.root.getObjectByName('prism staff')!.rotation.x).toBeLessThan(-.05);
  expect(q.root.getObjectByName('prism staff')!.rotation.x).toBeGreaterThan(.8);
  w.update('idle',FROST_AREA_RULES.telegraphSeconds-qRelease-.06);
  const held=w.projectileAnchor!.getWorldPosition(new THREE.Vector3());
  expect(w.root.getObjectByName('prism staff')!.rotation.x).toBeLessThan(-.05);
  w.update('idle',.06);
  expect(w.root.getObjectByName('prism staff')!.rotation.x).toBeGreaterThan(.8);
  const released=w.projectileAnchor!.getWorldPosition(new THREE.Vector3());
  expect(released.z-held.z).toBeGreaterThan(.9);
  w.update('idle',.5);
  expect(w.root.getObjectByName('prism staff')!.rotation.x).toBeCloseTo(.025);
  w.dispose();q.dispose();art.dispose();
});

it('keeps both planted boots on the arena floor and the projectile origin finite through running casts',()=>{
  const art=createPrismWardenArt(),model=art.instantiate();
  for(let frame=0;frame<120;frame++){
    if(frame===20)model.play('cast','w');
    model.update('run',1/60);model.root.updateMatrixWorld(true);
    const anchor=model.projectileAnchor!.getWorldPosition(new THREE.Vector3());
    expect(anchor.toArray().every(Number.isFinite)).toBe(true);
    const boots=[-1,1].map(side=>new THREE.Box3().setFromObject(model.root.getObjectByName(`boot ${side}`)!));
    expect(Math.min(...boots.map(boot=>boot.min.y))).toBeGreaterThan(-.02);
    expect(Math.min(...boots.map(boot=>boot.min.y))).toBeLessThan(.025);
  }
  model.dispose();art.dispose();
});

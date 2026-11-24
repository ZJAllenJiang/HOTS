import {expect,it} from 'vitest';
import * as THREE from 'three';
import {ProjectileView} from '../src/projectile-view';
import type {Projectile} from '../src/contracts';
import {command,createGame,step} from '../src/sim';
it('renders windup then travel, freezes interpolation on pause and clears expired bolts',()=>{
 const scene=new THREE.Scene(),view=new ProjectileView(scene);
 const p:Projectile={id:1,sourceId:1,team:0,hero:'frost',x:0,z:0,dirX:1,dirZ:0,launchTick:3,distanceRemaining:14};
 view.update([p],0,0);const root=scene.children[0];
 expect(root.children[0].visible).toBe(false);expect(root.children[1].visible).toBe(true);
 p.x=1.2;view.update([p],4,.025);expect(root.children[0].visible).toBe(true);expect(root.children[1].visible).toBe(false);
 expect(root.position.x).toBeCloseTo(.6);view.update([p],4,0);expect(root.position.x).toBeCloseTo(.6);
 view.update([p],4,.025);expect(root.position.x).toBeCloseTo(1.2);
 view.update([],5,.05);expect(scene.children).toHaveLength(0);view.dispose();
});
it('releases visual state on reset even when a new match reuses projectile IDs',()=>{
 const scene=new THREE.Scene(),view=new ProjectileView(scene);
 const p:Projectile={id:1,sourceId:1,team:1,hero:'ranger',x:8,z:2,dirX:-1,dirZ:0,launchTick:3,distanceRemaining:15};
 view.update([p],5,.05);view.clear();p.x=-10;view.update([p],0,0);
 expect(scene.children).toHaveLength(1);expect(scene.children[0].position.x).toBe(-10);view.dispose();expect(scene.children).toHaveLength(0);
});

it('keeps release focus at the rendered caster and joins the authoritative flight without snapping backward',()=>{
 const scene=new THREE.Scene(),view=new ProjectileView(scene);
 const p:Projectile={id:2,sourceId:1,team:0,hero:'ranger',x:0,z:0,dirX:1,dirZ:0,launchTick:3,distanceRemaining:14};
 let anchor={x:.7,y:1.5,z:.3};
 const release=()=>anchor;
 view.update([p],2,0,[],release);const root=scene.children[0];
 expect(root.position.toArray()).toEqual([.7,1.5,.3]);
 anchor={x:.8,y:1.5,z:.2};
 view.update([p],3,.025,[],release);
 expect(root.position.toArray()).toEqual([.8,1.5,.2]);
 p.x=1.2;view.update([p],4,.05,[],release);
 expect(root.position.x).toBeCloseTo(1.6);expect(root.position.y).toBeCloseTo(1.35);
 p.x=2.4;view.update([p],5,.05,[],release);
 expect(root.position.toArray()).toEqual([2.4,1.2,0]);view.dispose();
});

it('bridges the last displayed segment to authoritative contact on the impact frame and freezes its decay on pause',()=>{
 const scene=new THREE.Scene(),view=new ProjectileView(scene);
 const p:Projectile={id:7,sourceId:1,team:0,hero:'frost',x:0,z:0,dirX:1,dirZ:0,launchTick:3,distanceRemaining:14};
 view.update([p],4,.05);const root=scene.children[0];
 p.x=1.2;view.update([p],5,.025);
 expect(root.position.x).toBeCloseTo(.6);
 const contact={x:1.7,z:0,radius:1,life:.4,team:0,kind:'shot',projectileId:7};
 view.update([],6,.025,[contact]);
 expect(root.position.x).toBe(1.7);expect(root.children[0].visible).toBe(true);
 const trail=root.children[2];
 expect(trail.visible).toBe(true);expect(trail.scale.y).toBeCloseTo(1.1);
 const start=trail.localToWorld(new THREE.Vector3(0,-.5,0));
 const end=trail.localToWorld(new THREE.Vector3(0,.5,0));
 expect(Math.min(start.x,end.x)).toBeCloseTo(.6);expect(Math.max(start.x,end.x)).toBeCloseTo(1.7);
 view.update([],6,0,[contact]);expect(scene.children).toHaveLength(1);expect(trail.scale.x).toBe(.055);
 view.update([],7,.05,[contact]);expect(trail.scale.x).toBeCloseTo(.0275);
 view.update([],8,.05,[contact]);expect(scene.children).toHaveLength(0);view.dispose();
});

it('associates contact by projectile ID when several allied bolts finish together',()=>{
 const scene=new THREE.Scene(),view=new ProjectileView(scene);
 const p:Projectile={id:3,sourceId:1,team:0,hero:'ranger',x:0,z:0,dirX:1,dirZ:0,launchTick:3,distanceRemaining:14};
 view.update([p,{...p,id:4,z:3}],4,.05);
 const roots=[...scene.children];
 view.update([],5,.05,[{x:1,z:3,radius:1,life:.4,team:0,kind:'shot',projectileId:4}]);
 expect(scene.children).toHaveLength(1);expect(scene.children[0]).toBe(roots[1]);
 expect(scene.children[0].position.toArray()).toEqual([1,1.2,3]);
 view.clear();expect(scene.children).toHaveLength(0);view.dispose();
});


it('finishes at the simulation first hit without delaying damage feedback',()=>{
 const state=createGame('training','ranger');
 const [player,target,later]=state.units;
 player.attackCooldown=10;
 Object.assign(target,{x:-7,z:0});Object.assign(later,{x:-5,z:0});
 const scene=new THREE.Scene(),view=new ProjectileView(scene);
 command(state,{type:'cast',key:'q',x:0,z:0});
 view.update(state.projectiles,state.tick,0,state.effects);
 const root=scene.children[0];
 for(let tick=0;tick<5;tick++){
  step(state,.05);view.update(state.projectiles,state.tick,.05,state.effects);
 }
 expect(state.projectiles).toHaveLength(0);
 expect(target.hp).toBe(target.maxHp-190);expect(later.hp).toBe(later.maxHp);
 const contact=state.effects.find(effect=>effect.projectileId!==undefined)!;
 expect(contact.projectileId).toBe(1);expect(root.position.x).toBeCloseTo(contact.x);
 expect(root.position.x).toBeCloseTo(-8.7);
 expect(state.damageEvents.some(event=>event.ability==='q')).toBe(true);
 expect(scene.children).toContain(root);view.dispose();
});

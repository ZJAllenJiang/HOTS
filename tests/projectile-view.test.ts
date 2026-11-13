import {expect,it} from 'vitest';
import * as THREE from 'three';
import {ProjectileView} from '../src/projectile-view';
import type {Projectile} from '../src/contracts';
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

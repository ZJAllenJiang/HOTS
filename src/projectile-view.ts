import * as THREE from 'three';
import type {Projectile} from './contracts';

interface BoltView {root:THREE.Group;charge:THREE.Mesh;bolt:THREE.Group;from:THREE.Vector3;target:THREE.Vector3;tick:number;blend:number}
/** Presentation-only: interpolates authoritative positions, never decides hits. */
export class ProjectileView {
  private views=new Map<number,BoltView>();
  private crystal=new THREE.OctahedronGeometry(1);
  private shaft=new THREE.CylinderGeometry(.045,.045,1,6);
  private sphere=new THREE.SphereGeometry(1,10,6);
  private ally=new THREE.MeshBasicMaterial({color:0x9aeaff});
  private enemy=new THREE.MeshBasicMaterial({color:0xff8fb8});
  private trail=new THREE.MeshBasicMaterial({color:0xc4eaff,transparent:true,opacity:.35,depthWrite:false});
  constructor(private scene:THREE.Scene){}
  update(projectiles:Projectile[],tick:number,dt:number){
    const active=new Set<number>();
    for(const p of projectiles){
      active.add(p.id);let v=this.views.get(p.id);
      if(!v){
        const root=new THREE.Group(),bolt=new THREE.Group();root.add(bolt);
        const material=p.team===0?this.ally:this.enemy;
        const tip=new THREE.Mesh(this.crystal,material);tip.scale.set(.16,.16,p.hero==='frost'?.6:.3);bolt.add(tip);
        const stem=new THREE.Mesh(this.shaft,material);stem.rotation.x=Math.PI/2;stem.position.z=-.35;bolt.add(stem);
        for(let i=1;i<=4;i++){const tail=new THREE.Mesh(this.sphere,this.trail);tail.position.z=-i*.22;tail.scale.setScalar(.12-i*.02);bolt.add(tail);}
        const charge=new THREE.Mesh(this.sphere,material);root.add(charge);
        root.position.set(p.x,1.2,p.z);root.rotation.y=Math.atan2(p.dirX,p.dirZ);this.scene.add(root);
        v={root,charge,bolt,from:root.position.clone(),target:root.position.clone(),tick,blend:1};this.views.set(p.id,v);
      }
      if(v.tick!==tick){v.from.copy(v.root.position);v.target.set(p.x,1.2,p.z);v.tick=tick;v.blend=0;}
      v.blend=Math.min(1,v.blend+Math.max(0,dt)/.05);
      v.root.position.lerpVectors(v.from,v.target,v.blend);
      const waiting=tick<p.launchTick;v.charge.visible=waiting;v.bolt.visible=!waiting;
      // Three fixed simulation ticks of visible charge; pause freezes its progress.
      v.charge.scale.setScalar(.1+.18*(1-Math.min(3,Math.max(0,p.launchTick-tick))/3));
    }
    for(const [id,v] of this.views)if(!active.has(id)){this.scene.remove(v.root);this.views.delete(id);}
  }
  clear(){for(const v of this.views.values())this.scene.remove(v.root);this.views.clear();}
  dispose(){this.clear();this.crystal.dispose();this.shaft.dispose();this.sphere.dispose();this.ally.dispose();this.enemy.dispose();this.trail.dispose();}
}

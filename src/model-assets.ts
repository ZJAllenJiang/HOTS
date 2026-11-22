import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {Hero} from './contracts';
import {inspectGLB} from './model-validation';
import {ModelAnimation,type Motion} from './model-animation';
import {createPrismWardenArt} from './prism-warden';

export type {Motion} from './model-animation';
interface Template {gltf:GLTF;clips:Partial<Record<Motion,THREE.AnimationClip>>;height:number}
export interface ModelInstance {root:THREE.Group;update(motion:'idle'|'run',dt:number,rate?:number):void;play(motion:'attack'|'cast'):void;dispose():void}
export class HeroModels {
  private templates=new Map<Hero,Template>();
  private generations=new Map<Hero,number>();
  private dead=false;
  constructor(private changed:(hero:Hero)=>void){}
  private readonly prismWarden=createPrismWardenArt();
  async import(hero:Hero,data:ArrayBuffer){
    const report=inspectGLB(data);
    const generation=(this.generations.get(hero)??0)+1;this.generations.set(hero,generation);
    const gltf=await new GLTFLoader().parseAsync(data,'');
    if(this.dead||generation!==this.generations.get(hero)){disposeGLTF(gltf);throw new Error('模型载入已取消。');}
    const box=new THREE.Box3().setFromObject(gltf.scene);
    const size=box.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<=0){disposeGLTF(gltf);throw new Error('模型没有可显示的网格。');}
    const clips:Template['clips']={};
    for(const [motion,pattern] of Object.entries({idle:/stand|idle/i,run:/walk|run/i,attack:/attack/i,cast:/spell(?!.*channel)|cast/i})){
      const clip=gltf.animations.find(c=>pattern.test(c.name));if(clip)clips[motion as Motion]=clip;
    }
    const previous=this.templates.get(hero);
    this.templates.set(hero,{gltf,clips,height:hero==='guardian'?2.3:2.6});
    // Remove old instances before releasing the shared geometry and textures.
    this.changed(hero);if(previous)disposeGLTF(previous.gltf);
    const missing=(['idle','run','attack'] as Motion[]).filter(key=>!clips[key]);
    return `已导入：${report.meshes} 个网格，${report.animations} 段动作，${report.images} 张贴图。${missing.length?'缺少动作：'+missing.join(' / ')+'，尚未通过验收。':'基础动作齐全；外观、特效及性能仍需人工验收。'}`;
  }
  instantiate(hero:Hero):ModelInstance|null {
    if(this.dead)return null;
    const t=this.templates.get(hero);if(!t)return hero==='frost'?this.prismWarden.instantiate():null;
    const scene=clone(t.gltf.scene);
    // Measure the actual idle pose, not the unanimated bind pose.
    const pose=new THREE.AnimationMixer(scene);
    if(t.clips.idle){pose.clipAction(t.clips.idle).play();pose.update(0);}
    scene.updateMatrixWorld(true);
    scene.traverse(o=>{if(o instanceof THREE.SkinnedMesh)o.computeBoundingBox();});
    const box=new THREE.Box3().setFromObject(scene);
    pose.stopAllAction();pose.uncacheRoot(scene);
    const scale=t.height/(box.max.y-box.min.y);
    const root=new THREE.Group(),grounded=new THREE.Group();
    root.add(grounded);grounded.add(scene);grounded.position.y=-box.min.y;root.scale.setScalar(scale);
    // Preserve the authored X/Z pivot: a staff or cape must not shift the actor's center.
    scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    const animation=new ModelAnimation(scene,t.clips);
    return {root,update(motion,dt,rate){animation.update(motion,dt,rate);},play(motion){animation.play(motion);},
      dispose(){animation.dispose();scene.traverse(o=>{if(o instanceof THREE.SkinnedMesh)o.skeleton.dispose();});root.removeFromParent();}};
  }
  dispose(){this.dead=true;this.templates.forEach(t=>disposeGLTF(t.gltf));this.templates.clear();this.prismWarden.dispose();}
}
function disposeGLTF(gltf:GLTF){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)textures.add(v);});}}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{const image=t.source.data;if(typeof ImageBitmap!=='undefined'&&image instanceof ImageBitmap)image.close();t.dispose();});
}

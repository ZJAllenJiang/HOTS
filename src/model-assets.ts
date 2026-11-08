import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {Hero} from './contracts';
import {inspectGLB} from './model-validation';
import manifest from './model-manifest.json';

export type Motion='idle'|'run'|'attack';
interface Template {gltf:GLTF;clips:Partial<Record<Motion,THREE.AnimationClip>>;height:number}
export interface ModelInstance {root:THREE.Group;update(motion:Motion,dt:number):void;dispose():void}
export class HeroModels {
  private templates=new Map<Hero,Template>();
  private generations=new Map<Hero,number>();
  private dead=false;
  constructor(private changed:(hero:Hero)=>void){}
  async loadDefaults(){
    await Promise.all(Object.entries(manifest).map(async([hero,entry])=>{
      if(!entry.url)return;
      try {
        const response=await fetch(entry.url);if(!response.ok)throw new Error('Model request failed');
        await this.import(hero as Hero,await response.arrayBuffer());
      }catch(error){console.warn(`Hero model ${hero} not available`,error);document.dispatchEvent(new CustomEvent("hots:model-error",{detail:{hero}}));}
    }));
  }
  async import(hero:Hero,data:ArrayBuffer){
    const report=inspectGLB(data);
    const generation=(this.generations.get(hero)??0)+1;this.generations.set(hero,generation);
    const gltf=await new GLTFLoader().parseAsync(data,'');
    if(this.dead||generation!==this.generations.get(hero)){disposeGLTF(gltf);throw new Error('模型载入已取消。');}
    const box=new THREE.Box3().setFromObject(gltf.scene);
    const size=box.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<=0){disposeGLTF(gltf);throw new Error('模型没有可显示的网格。');}
    const clips:Template['clips']={};
    for(const [motion,pattern] of Object.entries({idle:/stand|idle/i,run:/walk|run/i,attack:/attack/i})){
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
    const t=this.templates.get(hero);if(!t)return null;
    const scene=clone(t.gltf.scene);
    const box=new THREE.Box3().setFromObject(scene),center=box.getCenter(new THREE.Vector3());
    const scale=t.height/(box.max.y-box.min.y);
    const root=new THREE.Group();root.add(scene);scene.position.set(-center.x,-box.min.y,-center.z);root.scale.setScalar(scale);
    scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    const mixer=new THREE.AnimationMixer(scene);
    let current:THREE.AnimationAction|undefined;
    return {root,update(motion,dt){
      const clip=t.clips[motion]??t.clips.idle??t.gltf.animations[0];
      if(clip){const next=mixer.clipAction(clip);if(next!==current){current?.fadeOut(.15);next.reset().fadeIn(.15).play();current=next;}}
      mixer.update(dt);
    },dispose(){mixer.stopAllAction();mixer.uncacheRoot(scene);scene.traverse(o=>{if(o instanceof THREE.SkinnedMesh)o.skeleton.dispose();});root.removeFromParent();}};
  }
  dispose(){this.dead=true;this.templates.forEach(t=>disposeGLTF(t.gltf));this.templates.clear();}
}
function disposeGLTF(gltf:GLTF){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)textures.add(v);});}}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{const image=t.source.data;if(typeof ImageBitmap!=='undefined'&&image instanceof ImageBitmap)image.close();t.dispose();});
}

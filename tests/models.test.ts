import {it,expect} from 'vitest';
import * as THREE from 'three';
import {HeroModels} from '../src/model-assets';

// Synthetic, textureless skin: validates the importer, not HOTS visual fidelity.
function fixture(){
 const arrays=[new Float32Array([0,0,0,1,0,0,0,2,0]),new Uint16Array(12),new Float32Array([1,0,0,0,1,0,0,0,1,0,0,0]),new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),new Float32Array([0,1]),new Float32Array([0,0,0,0,.2,0])];
 let offset=0;const views=arrays.map(a=>{const v={buffer:0,byteOffset:offset,byteLength:a.byteLength};offset+=a.byteLength;return v;});
 const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0,1]}],nodes:[{name:'mesh',mesh:0,skin:0},{name:'bone'}],
  skins:[{joints:[1],inverseBindMatrices:3}],meshes:[{primitives:[{attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2}}]}],
  buffers:[{byteLength:offset}],bufferViews:views,accessors:[
   {bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,2,0]},
   {bufferView:1,componentType:5123,count:3,type:'VEC4'},
   {bufferView:2,componentType:5126,count:3,type:'VEC4'},
   {bufferView:3,componentType:5126,count:1,type:'MAT4'},
   {bufferView:4,componentType:5126,count:2,type:'SCALAR',min:[0],max:[1]},
   {bufferView:5,componentType:5126,count:2,type:'VEC3'}],
  animations:['Stand','Run','Attack'].map(name=>({name,samplers:[{input:4,output:5}],channels:[{sampler:0,target:{node:1,path:'translation'}}]}))};
 const json=new TextEncoder().encode(JSON.stringify(doc)),length=Math.ceil(json.length/4)*4;
 const data=new ArrayBuffer(28+length+offset),v=new DataView(data);
 [0x46546c67,2,data.byteLength,length,0x4e4f534a].forEach((n,i)=>v.setUint32(i*4,n,true));
 new Uint8Array(data,20,length).fill(32);new Uint8Array(data,20,json.length).set(json);
 v.setUint32(20+length,offset,true);v.setUint32(24+length,0x004e4942,true);
 arrays.forEach((a,i)=>new Uint8Array(data,28+length+views[i].byteOffset,a.byteLength).set(new Uint8Array(a.buffer)));
 return data;
}
it('loads a GLB, clones independent skeletons, changes animations and replaces resources',async()=>{
 let changes=0;const models=new HeroModels(()=>changes++);
 const status=await models.import('ranger',fixture());expect(status).toContain('基础动作齐全');expect(changes).toBe(1);
 const a=models.instantiate('ranger')!,b=models.instantiate('ranger')!;
 expect(a).not.toBeNull();const am=a.root.getObjectByName('mesh') as THREE.SkinnedMesh,bm=b.root.getObjectByName('mesh') as THREE.SkinnedMesh;
 expect(am.skeleton).not.toBe(bm.skeleton);expect(am.skeleton.bones[0]).not.toBe(bm.skeleton.bones[0]);
 a.update('run',.5);expect(am.skeleton.bones[0].position.y).toBeGreaterThan(0);expect(bm.skeleton.bones[0].position.y).toBe(0);
 a.play('attack');a.update('idle',.2);a.dispose();b.dispose();await models.import('ranger',fixture());expect(changes).toBe(2);
 models.dispose();expect(models.instantiate('ranger')).toBeNull();
});
it('does not retain an in-flight imported asset after disposal',async()=>{
 let changes=0;const models=new HeroModels(()=>changes++);const result=models.import('frost',fixture());models.dispose();
 await expect(result).rejects.toThrow('取消');expect(changes).toBe(0);expect(models.instantiate('frost')).toBeNull();
});
it('keeps the authored actor pivot instead of centering asymmetric equipment bounds',async()=>{
 const models=new HeroModels(()=>{});await models.import('ranger',fixture());const model=models.instantiate('ranger')!;
 // Fixture spans x=0..1: bbox centering used to incorrectly shift the actor by -0.5.
 model.root.updateMatrixWorld(true);
 const mesh=model.root.getObjectByName('mesh') as THREE.SkinnedMesh;
 expect(mesh.getWorldPosition(new THREE.Vector3()).x).toBeCloseTo(0);
 const bounds=new THREE.Box3().setFromObject(model.root);expect(bounds.min.y).toBeCloseTo(0);
 expect(bounds.max.y-bounds.min.y).toBeCloseTo(2.6);
 model.dispose();models.dispose();
});

import {expect,it} from 'vitest';
import * as THREE from 'three';
import {ModelAnimation} from '../src/model-animation';
function setup(){
 const root=new THREE.Group();const bone=new THREE.Object3D();bone.name='bone';root.add(bone);
 const clip=(name:string,end:number)=>new THREE.AnimationClip(name,.5,[new THREE.NumberKeyframeTrack('bone.position[y]',[0,.5],[0,end])]);
 const animation=new ModelAnimation(root,{idle:clip('idle',0),run:clip('run',1),attack:clip('attack',10),cast:clip('cast',20)});
 return {bone,animation};
}
it('plays one attack, freezes while paused, then returns to locomotion',()=>{
 const {bone,animation}=setup();animation.play('attack');animation.update('idle',.25);
 expect(bone.position.y).toBeCloseTo(5);
 animation.update('idle',0);expect(bone.position.y).toBeCloseTo(5);
 animation.update('idle',.3);animation.update('idle',.2);expect(bone.position.y).toBeCloseTo(0);
 animation.update('idle',1);expect(bone.position.y).toBeCloseTo(0);animation.dispose();
});
it('restarts the same clip on a new attack and uses a separate cast clip',()=>{
 const {bone,animation}=setup();animation.play('attack');animation.update('idle',.4);
 expect(bone.position.y).toBeCloseTo(8);animation.play('attack');animation.update('idle',.2);
 expect(bone.position.y).toBeCloseTo(4);animation.play('cast');animation.update('idle',.25);
 expect(bone.position.y).toBeCloseTo(10);animation.update('idle',.3);animation.update('run',.25);
 expect(bone.position.y).toBeCloseTo(.5);animation.dispose();
});
it('preserves authored duration and allows movement to interrupt a long cast',()=>{
 const root=new THREE.Group(),bone=new THREE.Object3D();bone.name='bone';root.add(bone);
 const animation=new ModelAnimation(root,{
  cast:new THREE.AnimationClip('cast',2,[new THREE.NumberKeyframeTrack('bone.position[y]',[0,2],[0,20])]),
  run:new THREE.AnimationClip('run',1,[new THREE.NumberKeyframeTrack('bone.position[y]',[0,1],[0,1])])
 });
 animation.play('cast');animation.update('idle',.5);expect(bone.position.y).toBeCloseTo(5);
 animation.update('run',.2);expect(bone.position.y).toBeCloseTo(.2);animation.dispose();
});

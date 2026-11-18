import * as THREE from 'three';
import {clampGaitRate} from './locomotion';

export type Motion='idle'|'run'|'attack'|'cast';
/** Locomotion loops; combat clips play once per accepted simulation action. */
export class ModelAnimation {
  private mixer:THREE.AnimationMixer;
  private current?:THREE.AnimationAction;
  private oneShot=false;
  private actionAge=0;
  constructor(private root:THREE.Object3D,private clips:Partial<Record<Motion,THREE.AnimationClip>>) {
    this.mixer=new THREE.AnimationMixer(root);
    this.mixer.addEventListener('finished',event=>{
      if(event.action===this.current)this.oneShot=false;
    });
  }
  private switchTo(clip:THREE.AnimationClip,once:boolean) {
    const next=this.mixer.clipAction(clip);
    next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
    next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
    next.clampWhenFinished=once;
    // Preserve authored clip timing; locomotion can interrupt the recovery.
    this.actionAge=0;
    if(this.current&&next!==this.current)next.crossFadeFrom(this.current,.12);
    next.play();this.current=next;this.oneShot=once;
  }
  play(motion:'attack'|'cast') {
    const clip=this.clips[motion]??(motion==='cast'?this.clips.attack:undefined);
    if(clip)this.switchTo(clip,true);
  }
  update(motion:'idle'|'run',dt:number,rate=1) {
    // Allow a fresh model to show its initial pose without advancing the mixer.
    if(dt<=0&&this.current)return;
    const frame=Math.max(0,dt);
    this.actionAge+=frame;
    if(this.oneShot&&motion==='run'&&this.actionAge>=.12)this.oneShot=false;
    if(!this.oneShot){
      const run=motion==='run'?this.clips.run:undefined;
      const clip=run??this.clips.idle;
      if(clip){
        if(this.current?.getClip()!==clip||!this.current.isRunning())this.switchTo(clip,false);
        this.current?.setEffectiveTimeScale(run?clampGaitRate(rate):1);
      }
    }
    this.mixer.update(frame);
  }
  dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.root);}
}

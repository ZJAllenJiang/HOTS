import * as THREE from 'three';

export type Motion='idle'|'run'|'attack'|'cast';
/** Locomotion loops; combat clips play once per accepted simulation action. */
export class ModelAnimation {
  private mixer:THREE.AnimationMixer;
  private current?:THREE.AnimationAction;
  private oneShot=false;
  private actionAge=0;
  private locomotion:'idle'|'run'='idle';
  constructor(private root:THREE.Object3D,private clips:Partial<Record<Motion,THREE.AnimationClip>>) {
    this.mixer=new THREE.AnimationMixer(root);
    this.mixer.addEventListener('finished',event=>{
      if(event.action===this.current)this.oneShot=false;
    });
  }
  private switchTo(clip:THREE.AnimationClip,once:boolean) {
    const next=this.mixer.clipAction(clip);
    if(next!==this.current)this.current?.fadeOut(.12);
    next.stopFading().reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
    next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
    next.clampWhenFinished=once;
    // Preserve authored clip timing; locomotion can interrupt the recovery.
    this.actionAge=0;
    next.fadeIn(.12).play();this.current=next;this.oneShot=once;
  }
  play(motion:'attack'|'cast') {
    const clip=this.clips[motion]??(motion==='cast'?this.clips.attack:undefined);
    if(clip)this.switchTo(clip,true);
  }
  update(motion:'idle'|'run',dt:number) {
    this.locomotion=motion;
    // A paused render must not consume or cancel the current action.
    if(dt<=0)return;
    this.actionAge+=dt;
    if(this.oneShot&&motion==='run'&&this.actionAge>=.12)this.oneShot=false;
    if(!this.oneShot){
      const clip=this.clips[this.locomotion]??this.clips.idle;
      if(clip&&(this.current?.getClip()!==clip||!this.current.isRunning()))this.switchTo(clip,false);
    }
    this.mixer.update(dt);
  }
  dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.root);}
}

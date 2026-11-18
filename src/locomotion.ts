/** Bridge 20 Hz simulation samples to continuous render-frame locomotion. */
export class Locomotion {
  private lastMovedAt=-Infinity;
  constructor(private x:number,private z:number){}
  reset(x:number,z:number){
    this.x=x;this.z=z;
    this.lastMovedAt=-Infinity;
  }
  sample(x:number,z:number,time:number){
    const dx=x-this.x,dz=z-this.z;
    const displaced=Math.hypot(dx,dz)>.0001;
    if(displaced)this.lastMovedAt=time;
    this.x=x;this.z=z;
    return {moving:time-this.lastMovedAt<.1,displaced,dx,dz};
  }
}
export const smoothing=(rate:number,dt:number)=>1-Math.exp(-rate*Math.max(0,dt));

export const clampGaitRate=(rate:number)=>Number.isNaN(rate)?1:Math.min(1.6,Math.max(.4,rate));

/** Convert on-screen world units per second to a walk-cycle playback rate. */
export const gaitRate=(speed:number,referenceSpeed=5.6)=>
  clampGaitRate(speed/(Number.isFinite(referenceSpeed)&&referenceSpeed>0?referenceSpeed:5.6));

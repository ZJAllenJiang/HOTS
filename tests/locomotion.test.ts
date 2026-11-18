import {expect,it} from 'vitest';
import {gaitRate,Locomotion,smoothing} from '../src/locomotion';
it.each([30,60,144])('keeps walking between 20 Hz position samples at %i FPS',fps=>{
 const motion=new Locomotion(0,0);
 for(let i=0;i<fps;i++){
  const tick=Math.floor(i/fps*20+1e-8),time=tick*.05;
  const result=motion.sample(time*4,0,time);
  if(tick>0)expect(result.moving).toBe(true);
 }
 expect(motion.sample(4,0,1).moving).toBe(true);
 expect(motion.sample(4,0,1.15).moving).toBe(false);
});
it('does not animate stationary actors and follows a changed direction',()=>{
 const motion=new Locomotion(3,4);expect(motion.sample(3,4,0).moving).toBe(false);
 expect(motion.sample(2,4,.05)).toMatchObject({displaced:true,dx:-1,dz:0});
 expect(motion.sample(2,4,.05)).toMatchObject({moving:true,displaced:false});
});
it('clears movement after a position snap and samples from the new position',()=>{
 const motion=new Locomotion(0,0);
 expect(motion.sample(1,0,.05).moving).toBe(true);
 motion.reset(20,10);
 expect(motion.sample(20,10,.06)).toEqual({moving:false,displaced:false,dx:0,dz:0});
 expect(motion.sample(20,11,.1)).toEqual({moving:true,displaced:true,dx:0,dz:1});
});
it('converts travel speed to a bounded walk-cycle playback rate',()=>{
 expect(gaitRate(0)).toBe(.4);
 expect(gaitRate(2.8)).toBe(.5);
 expect(gaitRate(5.6)).toBe(1);
 expect(gaitRate(40)).toBe(1.6);
 expect(gaitRate(6,4)).toBe(1.5);
});
it('smoothing converges equally across frame rates',()=>{
 const positions=[30,60,144].map(fps=>{let x=0;for(let i=0;i<fps;i++)x+=(1-x)*smoothing(4,1/fps);return x;});
 expect(positions[0]).toBeCloseTo(positions[1],10);expect(positions[0]).toBeCloseTo(positions[2],10);
});

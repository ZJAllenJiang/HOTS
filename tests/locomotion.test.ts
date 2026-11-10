import {expect,it} from 'vitest';
import {Locomotion,smoothing} from '../src/locomotion';
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
it('smoothing converges equally across frame rates',()=>{
 const positions=[30,60,144].map(fps=>{let x=0;for(let i=0;i<fps;i++)x+=(1-x)*smoothing(4,1/fps);return x;});
 expect(positions[0]).toBeCloseTo(positions[1],10);expect(positions[0]).toBeCloseTo(positions[2],10);
});

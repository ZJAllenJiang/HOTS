import {expect,it} from 'vitest';
import {command,createGame,step} from '../src/sim';
it('emits cast cues only for accepted casts',()=>{
 const s=createGame('training','frost'),p=s.units[0];
 command(s,{type:'cast',key:'q',x:100,z:0});expect(p.visualAction).toBeUndefined();
 command(s,{type:'cast',key:'q',x:0,z:0});expect(p.visualAction).toMatchObject({sequence:1,kind:'cast',x:0,z:0});
 const cue={...p.visualAction};command(s,{type:'cast',key:'q',x:0,z:0});expect(p.visualAction).toEqual(cue);
});
it('records a killing attack even after its target becomes unavailable',()=>{
 const s=createGame('training','frost'),p=s.units[0],target=s.units[1];
 p.x=target.x-1;p.z=target.z;target.hp=1;command(s,{type:'attack',id:target.id});step(s,.05);
 expect(target.alive).toBe(false);expect(p.visualAction).toMatchObject({sequence:1,kind:'attack',x:target.x,z:target.z});
});
it('prioritizes a cast over an immediate automatic attack without suppressing damage',()=>{
 const s=createGame('training','frost'),p=s.units[0],target=s.units[1];
 p.x=target.x-1;p.z=target.z;
 command(s,{type:'cast',key:'w',x:target.x,z:target.z});const hp=target.hp;
 command(s,{type:'attack',id:target.id});step(s,.05);
 expect(target.hp).toBeLessThan(hp);expect(p.visualAction?.kind).toBe('cast');
});

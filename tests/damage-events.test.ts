import {expect,it} from 'vitest';
import {command,createGame,step} from '../src/sim';

it('reports the actual HP lost after scaling and caps an overkill at remaining HP',()=>{
  const state=createGame('training','frost');
  const player=state.units[0], dummy=state.units[1];
  const x=dummy.x, z=dummy.z;
  state.teams[0].level=2;
  command(state,{type:'talent',index:0});
  command(state,{type:'cast',key:'w',x,z});
  expect(state.damageEvents).toHaveLength(1);
  expect(state.damageEvents[0]).toMatchObject({x,z,amount:expect.closeTo(224.64),ability:'w',incoming:false});
  expect(dummy.hp).toBeCloseTo(dummy.maxHp-224.64);
  player.cooldowns.w=0;
  dummy.hp=7;
  command(state,{type:'cast',key:'w',x,z});
  expect(state.damageEvents[1]).toMatchObject({amount:7,ability:'w'});
  step(state,.9);
  expect(state.damageEvents).toHaveLength(0);
});

it('shows incoming damage to the player and ignores blocked damage on the core',()=>{
  const state=createGame('battle','frost');
  const player=state.units[0];
  const core=state.units.find(unit=>unit.kind==='core'&&unit.team===1)!;
  player.x=core.x-7;
  command(state,{type:'cast',key:'w',x:core.x,z:core.z});
  expect(core.hp).toBe(core.maxHp);
  expect(state.damageEvents).toHaveLength(0);
  step(state,.05);
  expect(state.damageEvents.some(event=>event.incoming&&event.amount===60)).toBe(true);
});

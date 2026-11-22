import {describe,expect,it} from 'vitest';
import {ABILITIES,castRejection,command,createGame,FROST_AREA_RULES,step,ultimateUnlocked} from '../src/sim';
import type {State} from '../src/contracts';

function quiet(){
  const state=createGame('training','frost');
  const [player,target]=state.units;
  state.units=[player,target];
  player.attackCooldown=100;
  return {state,player,target};
}
function rain(state:State){command(state,{type:'cast',key:'w',x:0,z:0});}

describe('Prism Rain committed area cast',()=>{
  it('pays on acceptance, warns for seven ticks and emits damage only with the impact',()=>{
    const {state,player,target}=quiet();
    rain(state);
    expect(player.mana).toBe(player.maxMana-ABILITIES.frost.w.cost);
    expect(player.cooldowns.w).toBe(ABILITIES.frost.w.cooldown);
    expect(state.effects).toEqual([expect.objectContaining({kind:'telegraph',hero:'frost',ability:'w',radius:4.5,life:.35,readyTick:7})]);
    expect(state.damageEvents).toHaveLength(0);
    rain(state);
    expect(state.pendingAreas).toHaveLength(1);
    step(state,.3);
    expect(target.hp).toBe(target.maxHp);
    expect(state.effects[0].kind).toBe('telegraph');
    step(state,.05);
    expect(target.hp).toBe(target.maxHp-FROST_AREA_RULES.damage);
    expect(state.damageEvents).toEqual([expect.objectContaining({targetId:target.id,ability:'w',amount:180,time:expect.closeTo(.35)})]);
    expect(state.pendingAreas).toHaveLength(0);
    expect(state.effects).toEqual([expect.objectContaining({kind:'burst',hero:'frost',ability:'w',radius:4.5})]);
  });

  it('checks the committed area at impact so enemies can leave or enter it',()=>{
    const {state,target}=quiet();
    const entrant={...target,id:state.nextId++,x:8};
    state.units.push(entrant);
    rain(state);
    step(state,.3);
    target.x=5;
    entrant.x=4.5;
    step(state,.05);
    expect(target.hp).toBe(target.maxHp);
    expect(entrant.hp).toBe(entrant.maxHp-180);
    expect(state.damageEvents.map(event=>event.targetId)).toEqual([entrant.id]);
  });

  it('keeps the accepted location and credits a committed kill after the caster dies',()=>{
    const {state,player,target}=quiet();
    target.hp=1;
    rain(state);
    player.x=-30;
    Object.assign(player,{alive:false,hp:0,respawn:8});
    step(state,.35);
    expect(target.alive).toBe(false);
    expect(player.alive).toBe(false);
    expect(state.teams[0].xp).toBe(100);
    expect(state.damageEvents[0].amount).toBe(1);
    expect(state.effects[0]).toMatchObject({kind:'burst',x:0,z:0});
  });

  it.each(['hero','minion'] as const)('slows surviving %s movement for thirty ticks and then restores its speed',kind=>{
    const {state,player,target}=quiet();
    target.kind=kind;
    target.hero='ranger';
    target.attackCooldown=100;
    state.mode='battle';state.nextWave=1000;
    rain(state);
    step(state,.35);
    expect(target.slowUntilTick).toBe(37);
    expect(target.slowMultiplier).toBe(.6);
    state.mode='training';
    if(kind==='hero'){
      state.playerId=target.id;
      command(state,{type:'move',x:20,z:0});
    }
    const start=target.x;
    step(state,1.5);
    const speed=kind==='hero'?6:1.8;
    expect(Math.abs(target.x-start)).toBeCloseTo(speed*.6*1.5);
    const last=target.x;
    step(state,.05);
    expect(Math.abs(target.x-last)).toBeCloseTo(speed*.05);
    expect(target.slowUntilTick).toBeUndefined();
    expect(target.slowMultiplier).toBeUndefined();
    expect(player.alive).toBe(true);
  });

  it('damages dummies and structures without assigning a movement slow or blocked core event',()=>{
    const {state,target}=quiet();
    const tower={...target,id:state.nextId++,kind:'tower' as const,x:1,attackCooldown:100};
    const core={...target,id:state.nextId++,kind:'core' as const,x:2,attackCooldown:100};
    state.units.push(tower,core);
    rain(state);step(state,.35);
    expect(target.hp).toBe(target.maxHp-180);
    expect(tower.hp).toBe(tower.maxHp-180);
    expect(core.hp).toBe(core.maxHp);
    for(const unit of [target,tower,core])expect(unit.slowUntilTick).toBeUndefined();
    expect(state.damageEvents.map(event=>event.targetId)).toEqual([target.id,tower.id]);
  });

  it('freezes telegraph and impact timers while paused and replays on split frames',()=>{
    const a=quiet().state,b=quiet().state;
    rain(a);rain(b);
    step(a,.1);step(b,.1);
    a.paused=true;
    const before=structuredClone(a);step(a,3);expect(a).toEqual(before);
    a.paused=false;
    step(a,.25);for(let i=0;i<25;i++)step(b,.01);
    expect(a).toEqual(b);
  });

  it('preserves the W cast action through the telegraph while ordinary attacks still deal damage',()=>{
    const {state,player,target}=quiet();
    player.x=-1;player.attackCooldown=.2;
    rain(state);
    step(state,.25);
    expect(player.visualAction).toMatchObject({kind:'cast',ability:'w'});
    expect(target.hp).toBe(target.maxHp-65);
    expect(state.pendingAreas).toHaveLength(1);
  });

  it('allows an AI frost hero to select W through the normal cast rules',()=>{
    const state=createGame('battle','ranger');
    const player=state.units[0],frost=state.units.find(unit=>unit.team===1&&unit.hero==='frost')!;
    state.units=[player,frost];state.tick=240;state.time=12;state.nextWave=1000;
    Object.assign(player,{x:-10,z:0,attackCooldown:100});
    Object.assign(frost,{x:0,z:0,aiCastCooldown:0,attackCooldown:100});
    frost.cooldowns.q=100;frost.cooldowns.r=100;
    step(state,.05);
    expect(state.pendingAreas[0]).toMatchObject({sourceId:frost.id,ability:'w',readyTick:248,x:-10,z:0});
    expect(frost.aiCastCooldown).toBeGreaterThan(0);
  });
});

it('provides exact cast rejection reasons and unlocks practice ultimates',()=>{
  const {state,player}=quiet();
  expect(ultimateUnlocked(state,0)).toBe(true);
  expect(castRejection(state,player,'r',0,0)).toBeUndefined();
  command(state,{type:'cast',key:'r',x:0,z:0});
  expect(player.cooldowns.r).toBe(ABILITIES.frost.r.cooldown);
  expect(castRejection(state,player,'r',0,0)).toBe('cooldown');
  player.mana=0;expect(castRejection(state,player,'w',0,0)).toBe('mana');
  player.mana=player.maxMana;
  expect(castRejection(state,player,'w',NaN,0)).toBe('range');
  expect(castRejection(state,player,'q',player.x,player.z)).toBe('direction');
  state.mode='battle';player.cooldowns.r=0;
  expect(ultimateUnlocked(state,0)).toBe(false);
  expect(castRejection(state,player,'r',0,0)).toBe('locked');
  state.teams[0].level=3;
  expect(castRejection(state,player,'r',0,0)).toBeUndefined();
  player.alive=false;
  expect(castRejection(state,player,'w',0,0)).toBe('dead');
});

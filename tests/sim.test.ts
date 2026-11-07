import {describe,expect,it} from 'vitest';
import {ABILITIES,command,createGame,step} from '../src/sim';

describe('deterministic ARAM prototype simulation',()=>{
  it('replays identically at different frame rates',()=>{
    const a=createGame('battle','ranger'),b=createGame('battle','ranger');
    command(a,{type:'move',x:-12,z:2});command(b,{type:'move',x:-12,z:2});
    for(let i=0;i<200;i++)step(a,.05);
    for(let i=0;i<100;i++)step(b,.1);
    expect(a).toEqual(b);expect(a.tick).toBe(200);
  });
  it('pauses simulation and rejects commands while paused',()=>{
    const s=createGame('training','ranger');s.paused=true;const before=structuredClone(s);
    command(s,{type:'move',x:0,z:0});command(s,{type:'cast',key:'q',x:0,z:0});step(s,10);
    expect(s).toEqual(before);s.paused=false;step(s,.05);expect(s.tick).toBe(1);
  });
  it('validates cast range, cost, cooldown and heroic level gate',()=>{
    const s=createGame('training','ranger'),p=s.units[0],dummy=s.units[1];
    command(s,{type:'cast',key:'q',x:30,z:0});expect(p.mana).toBe(p.maxMana);
    command(s,{type:'cast',key:'r',x:0,z:0});expect(p.cooldowns.r).toBe(0);
    command(s,{type:'cast',key:'q',x:0,z:0});
    expect(p.mana).toBe(p.maxMana-ABILITIES.ranger.q.cost);expect(dummy.hp).toBeLessThan(dummy.maxHp);
    const hp=dummy.hp,mana=p.mana;command(s,{type:'cast',key:'q',x:0,z:0});expect(dummy.hp).toBe(hp);expect(p.mana).toBe(mana);
    step(s,5);expect(p.cooldowns.q).toBe(0);p.mana=0;command(s,{type:'cast',key:'q',x:0,z:0});expect(p.cooldowns.q).toBe(0);
  });
  it('moves at hero speed, clamps bounds, and stops',()=>{
    const s=createGame('training','ranger'),p=s.units[0];command(s,{type:'move',x:-30,z:0});step(s,1);
    expect(p.x).toBeCloseTo(-16);command(s,{type:'stop'});step(s,1);expect(p.x).toBeCloseTo(-16);
    command(s,{type:'move',x:-100,z:100});expect(p.dest).toEqual({x:-35,z:9});step(s,20);expect(p.x).toBe(-35);expect(p.z).toBe(9);
  });
  it('respawns defeated training dummies and allows one of three talents',()=>{
    const s=createGame('training','frost'),p=s.units[0],dummy=s.units[1];dummy.hp=1;
    command(s,{type:'cast',key:'q',x:0,z:0});expect(dummy.alive).toBe(false);step(s,4.1);expect(dummy.alive).toBe(true);expect(dummy.hp).toBe(dummy.maxHp);
    s.teams[0].level=2;command(s,{type:'talent',index:2});expect(p.maxHp).toBe(950*1.25);command(s,{type:'talent',index:0});expect(s.talent).toBe(2);
  });
  it('respawns a fallen player with health, mana and cooldowns restored',()=>{
    const s=createGame('battle','frost'),p=s.units[0];
    p.alive=false;p.hp=0;p.mana=0;p.respawn=.1;p.cooldowns.q=4;p.x=0;p.z=5;
    command(s,{type:'move',x:10,z:0});expect(p.dest).toBeNull();step(s,.1);
    expect(p.alive).toBe(true);expect(p.hp).toBe(p.maxHp);expect(p.mana).toBe(p.maxMana);expect(p.cooldowns.q).toBe(0);expect(p.x).toBe(-24);expect(p.z).toBe(0);
  });
  it('protects a core until its tower falls and freezes the winning state',()=>{
    const s=createGame('battle','ranger'),p=s.units[0],core=s.units.find(u=>u.kind==='core'&&u.team===1)!,tower=s.units.find(u=>u.kind==='tower'&&u.team===1)!;
    p.x=25;p.z=0;core.hp=1;command(s,{type:'cast',key:'q',x:30,z:0});expect(core.hp).toBe(1);
    tower.alive=false;p.cooldowns.q=0;command(s,{type:'cast',key:'q',x:30,z:0});expect(s.winner).toBe(0);
    const before=structuredClone(s);step(s,10);command(s,{type:'move',x:0,z:0});expect(s).toEqual(before);
  });
  it.each(['ranger','frost','guardian'] as const)('runs waves and autonomous bots to a completed battle with %s',hero=>{
    const s=createGame('battle',hero);
    for(let i=0;i<900&&s.winner===null;i++)step(s,1);
    expect(s.winner).not.toBeNull();expect(s.teams.some(t=>t.kills>0&&t.level>1)).toBe(true);
    expect(s.units.some(u=>u.kind==='tower'&&!u.alive)).toBe(true);
  });
});

import {it,expect} from 'vitest';
import {createGame,step,PACING} from '../src/sim';
it('gives preparation time and separates successive waves',()=>{
 const s=createGame('battle','ranger');step(s,PACING.firstWave-.05);
 expect(s.units.filter(u=>u.kind==='minion')).toHaveLength(0);expect(s.teams.map(t=>t.kills)).toEqual([0,0]);
 step(s,.05);expect(s.units.filter(u=>u.kind==='minion')).toHaveLength(6);
 const next=s.nextId;step(s,PACING.waveInterval-.05);expect(s.nextId).toBe(next);step(s,.05);expect(s.nextId).toBe(next+6);
});
it('prevents AI from spending a complete ability kit on the same tick',()=>{
 const s=createGame('battle','ranger');s.tick=240;s.time=12;
 const bot=s.units.find(u=>u.kind==='hero'&&u.team===1)!;
 bot.x=0;bot.z=0;bot.aiCastCooldown=0;s.units=s.units.filter(u=>u.id===bot.id||u.id===s.playerId);
 const player=s.units[0];player.x=1;player.z=0;player.hp=player.maxHp=100000;s.teams[bot.team].level=3;
 step(s,.05);expect(Object.values(bot.cooldowns).filter(c=>c>0)).toHaveLength(1);
 step(s,1);expect(Object.values(bot.cooldowns).filter(c=>c>0)).toHaveLength(1);
});
it('keeps a wave-vs-wave encounter alive long enough to read and react',()=>{
 const s=createGame('battle','ranger');step(s,PACING.firstWave);
 s.units=s.units.filter(u=>u.kind==='minion');s.nextWave=1000;
 s.units.forEach(u=>{u.x=u.team===0?-.5:.5;u.z=0;});step(s,5);
 expect(s.units.filter(u=>u.kind==='minion'&&u.alive)).toHaveLength(6);
});

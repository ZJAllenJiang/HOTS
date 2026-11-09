import {it,expect} from 'vitest';
import {createGame,step} from '../src/sim';
it('reports deterministic passive-player balance samples',()=>{
 for(const hero of ['ranger','frost','guardian'] as const){
  const s=createGame('battle',hero);let firstKill:number|null=null,firstTower:number|null=null;
  while(s.time<1200&&s.winner===null){step(s,.05);if(firstKill===null&&s.teams.some(t=>t.kills>0))firstKill=s.time;if(firstTower===null&&s.units.some(u=>u.kind==='tower'&&!u.alive))firstTower=s.time;}
  expect(s.winner).not.toBeNull();expect(s.time).toBeGreaterThan(180);expect(s.time).toBeLessThan(900);
  console.log(JSON.stringify({hero,firstKill,firstTower,end:s.time,winner:s.winner,kills:s.teams.map(t=>t.kills)}));
 }
});

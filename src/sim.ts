import type {Command, Hero, Key, Mode, State, Unit} from './contracts';

export interface Ability {name:string;cost:number;cooldown:number;range:number;description:string}
export const ABILITIES: Record<Hero,Record<Key,Ability>> = {
  ranger: {
    q:{name:'Piercing Arrow',cost:35,cooldown:5,range:15,description:'A narrow piercing shot dealing 190 damage.'},
    w:{name:'Arrow Volley',cost:50,cooldown:9,range:13,description:'Deal 140 damage in a wide area.'},
    e:{name:'Vault',cost:30,cooldown:10,range:9,description:'Dash to the selected point.'},
    r:{name:'Starfall',cost:90,cooldown:35,range:17,description:'Deal 360 damage in a large area.'},
  },
  frost: {
    q:{name:'Ice Lance',cost:35,cooldown:5,range:14,description:'A piercing bolt dealing 220 damage.'},
    w:{name:'Blizzard',cost:55,cooldown:9,range:13,description:'Deal 180 damage around the selected point.'},
    e:{name:'Frost Step',cost:40,cooldown:12,range:8,description:'Blink to the selected point and restore 100 health.'},
    r:{name:'Frozen Orb',cost:100,cooldown:35,range:17,description:'Deal 420 damage in a large area.'},
  },
  guardian: {
    q:{name:'Shield Slam',cost:30,cooldown:5,range:7,description:'Deal 160 damage around the selected point.'},
    w:{name:'Consecration',cost:50,cooldown:9,range:10,description:'Deal 150 damage in an area and heal yourself for 100.'},
    e:{name:'Rally',cost:45,cooldown:12,range:10,description:'Restore 240 health to nearby allied heroes.'},
    r:{name:'Judgment',cost:90,cooldown:35,range:11,description:'Deal 320 area damage and restore 200 health.'},
  },
};
export const TALENTS = [
  {name:'Power',description:'Your basic attacks and abilities deal 20% more damage.'},
  {name:'Tempo',description:'Your basic attacks recharge 30% faster.'},
  {name:'Fortitude',description:'Gain 25% maximum health and restore it.'},
] as const;

const FIXED_DT=.05;
const accumulator = new WeakMap<State,number>();
const stats:Record<Hero,{hp:number;mana:number;damage:number;range:number;speed:number}> = {
  ranger:{hp:1050,mana:450,damage:82,range:8,speed:6},
  frost:{hp:950,mana:550,damage:65,range:7.5,speed:5.6},
  guardian:{hp:1550,mana:450,damage:78,range:3.2,speed:5.2},
};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const keys:Key[]=['q','w','e','r'];
const zeros=()=>({q:0,w:0,e:0,r:0});

function addUnit(s:State, team:0|1,kind:Unit['kind'],hero:Hero,x:number,z:number):Unit {
  const hp=kind==='hero'?stats[hero].hp:kind==='tower'?1800:kind==='core'?2600:kind==='dummy'?1800:260;
  const u:Unit={id:s.nextId++,team,kind,hero,x,z,hp,maxHp:hp,mana:stats[hero].mana,maxMana:stats[hero].mana,alive:true,respawn:0,cooldowns:zeros(),target:null,dest:null,attackCooldown:0,kills:0,deaths:0};
  s.units.push(u);return u;
}

export function createGame(mode:Mode,hero:Hero):State {
  const s:State={mode,time:0,tick:0,units:[],effects:[],playerId:1,paused:false,winner:null,teams:[{xp:0,level:1,kills:0},{xp:0,level:1,kills:0}],talent:null,nextId:1,nextWave:0};
  const player=addUnit(s,0,'hero',hero,mode==='training'?-10:-24,0);s.playerId=player.id;
  if(mode==='training'){
    addUnit(s,1,'dummy','guardian',0,0);addUnit(s,1,'dummy','guardian',7,-5);addUnit(s,1,'dummy','guardian',7,5);
  }else{
    const roster:Hero[]=['guardian','ranger','frost','guardian'];
    roster.forEach((h,i)=>addUnit(s,0,'hero',h,-24,[-6,-3,3,6][i]));
    (['guardian','ranger','frost','guardian','ranger'] as Hero[]).forEach((h,i)=>addUnit(s,1,'hero',h,24,[-6,-3,0,3,6][i]));
    for(const team of [0,1] as const){const sign=team===0?-1:1;addUnit(s,team,'tower','guardian',sign*20,0);addUnit(s,team,'core','guardian',sign*30,0);}
  }
  return s;
}

function grantXP(s:State,team:number,amount:number){const t=s.teams[team];t.xp+=amount;t.level=Math.min(20,1+Math.floor(t.xp/300));}
function damage(s:State,source:Unit,target:Unit,amount:number){
  if(!target.alive||target.team===source.team)return;
  if(target.kind==='core'&&s.units.some(u=>u.team===target.team&&u.kind==='tower'&&u.alive))return;
  const talent=source.id===s.playerId&&s.talent===0?1.2:1;
  target.hp=Math.max(0,target.hp-amount*talent*(1+.04*(s.teams[source.team].level-1)));
  if(target.hp>0)return;
  target.alive=false;target.target=null;target.dest=null;target.deaths++;
  if(target.kind==='hero'){
    source.kills++;s.teams[source.team].kills++;target.respawn=8+Math.floor(s.time/60)*2;grantXP(s,source.team,160);
  }else if(target.kind==='dummy'){target.respawn=4;grantXP(s,source.team,100);}
  else if(target.kind==='minion')grantXP(s,source.team,35);
  else if(target.kind==='tower')grantXP(s,source.team,400);
  else if(target.kind==='core')s.winner=source.team;
}
function cast(s:State,u:Unit,key:Key,x:number,z:number):boolean {
  const a=ABILITIES[u.hero][key];
  if(!u.alive||u.cooldowns[key]>1e-8||u.mana<a.cost||!Number.isFinite(x)||!Number.isFinite(z)||distance(u,{x,z})>a.range)return false;
  if(key==='r'&&s.teams[u.team].level<3)return false;
  u.mana-=a.cost;u.cooldowns[key]=a.cooldown;
  x=clamp(x,-35,35);z=clamp(z,-9,9);
  if(key==='e'){
    if(u.hero==='guardian'){
      for(const ally of s.units)if(ally.alive&&ally.team===u.team&&ally.kind==='hero'&&distance(ally,{x,z})<6)ally.hp=Math.min(ally.maxHp,ally.hp+240);
    }else{u.x=x;u.z=z;u.dest=null;if(u.hero==='frost')u.hp=Math.min(u.maxHp,u.hp+100);}
    s.effects.push({x,z,radius:2,life:.4,team:u.team,kind:'heal'});return true;
  }
  const amount=key==='q'?(u.hero==='ranger'?190:u.hero==='frost'?220:160):key==='w'?(u.hero==='ranger'?140:u.hero==='frost'?180:150):(u.hero==='ranger'?360:u.hero==='frost'?420:320);
  const radius=key==='r'?6:key==='w'?4.5:u.hero==='guardian'?3.5:1.7;
  const origin={x:u.x,z:u.z};
  for(const target of s.units){
    if(!target.alive||target.team===u.team)continue;
    let hit=distance(target,{x,z})<=radius;
    if(key==='q'&&u.hero!=='guardian'){
      const dx=x-origin.x,dz=z-origin.z,len=Math.hypot(dx,dz);
      const projection=len>0?((target.x-origin.x)*dx+(target.z-origin.z)*dz)/len:0;
      const perpendicular=len>0?Math.abs((target.x-origin.x)*dz-(target.z-origin.z)*dx)/len:distance(target,origin);
      hit=projection>=0&&projection<=a.range&&perpendicular<=radius;
    }
    if(hit)damage(s,u,target,amount);
  }
  if(u.hero==='guardian'&&(key==='w'||key==='r'))u.hp=Math.min(u.maxHp,u.hp+(key==='r'?200:100));
  s.effects.push({x,z,radius,life:.55,team:u.team,kind:key==='q'?'shot':key==='r'?'ultimate':'burst'});
  return true;
}

export function command(s:State,c:Command):void {
  if(s.paused||s.winner!==null)return;
  const p=s.units.find(u=>u.id===s.playerId);if(!p)return;
  if(c.type==='talent'){
    if(s.talent===null&&s.teams[p.team].level>=2&&Number.isInteger(c.index)&&c.index>=0&&c.index<3){s.talent=c.index;if(c.index===2){p.maxHp*=1.25;p.hp=p.maxHp;}}return;
  }
  if(!p.alive)return;
  if(c.type==='move'){
    if(!Number.isFinite(c.x)||!Number.isFinite(c.z))return;
    p.dest={x:clamp(c.x,-35,35),z:clamp(c.z,-9,9)};p.target=null;
  }else if(c.type==='stop'){p.dest=null;p.target=null;}
  else if(c.type==='attack'){
    const t=s.units.find(u=>u.id===c.id);if(t&&t.alive&&t.team!==p.team){p.target=t.id;p.dest=null;}
  }else cast(s,p,c.key,c.x,c.z);
}

function range(u:Unit){return u.kind==='tower'?12:u.kind==='core'?10:u.kind==='minion'?2.4:stats[u.hero].range;}
function legalTarget(s:State,u:Unit,t:Unit){return t.alive&&t.team!==u.team&&!(t.kind==='core'&&s.units.some(v=>v.kind==='tower'&&v.alive&&v.team===t.team));}
function nearest(s:State,u:Unit,maxRange:number):Unit|undefined {
  let best:Unit|undefined,bestScore=Infinity;
  for(const t of s.units){if(!legalTarget(s,u,t))continue;const d=distance(u,t);if(d>maxRange)continue;const score=d+(t.kind==='core'?3:0);if(score<bestScore){best=t;bestScore=score;}}
  return best;
}
function moveToward(u:Unit,x:number,z:number,dt:number,speed:number,stop=0){
  const d=Math.hypot(x-u.x,z-u.z);if(d<=stop)return;
  const n=Math.min(speed*dt,d-stop);u.x=clamp(u.x+(x-u.x)/d*n,-35,35);u.z=clamp(u.z+(z-u.z)/d*n,-9,9);
}
function wave(s:State){
  for(const team of [0,1] as const)for(let i=0;i<3;i++)addUnit(s,team,'minion','guardian',team===0?-27:27,(i-1)*2);
  s.nextWave+=13;
}
function tick(s:State){
  s.tick++;s.time=s.tick*FIXED_DT;
  if(s.mode==='battle'&&s.time>=s.nextWave)wave(s);
  s.effects=s.effects.filter(e=>(e.life-=FIXED_DT)>0);
  // Stable ID order and fixed-size ticks make identical commands replay identically.
  for(const u of s.units){
    if(!u.alive){
      if(u.kind==='hero'||u.kind==='dummy'){
        u.respawn=Math.max(0,u.respawn-FIXED_DT);
        if(u.respawn<=1e-8){u.alive=true;u.hp=u.maxHp;u.mana=u.maxMana;u.cooldowns=zeros();u.attackCooldown=0;if(u.kind==='hero'){u.x=u.team===0?-24:24;u.z=u.id===s.playerId?0:((u.id%5)-2)*2;}}
      }continue;
    }
    for(const key of keys)u.cooldowns[key]=u.cooldowns[key]<=FIXED_DT+1e-8?0:u.cooldowns[key]-FIXED_DT;
    u.attackCooldown=u.attackCooldown<=FIXED_DT+1e-8?0:u.attackCooldown-FIXED_DT;
    if(u.kind==='dummy')continue;
    if(u.kind==='hero'){u.mana=Math.min(u.maxMana,u.mana+4*FIXED_DT);u.hp=Math.min(u.maxHp,u.hp+(s.mode==='training'?8:1.2)*FIXED_DT);}
    const player=u.id===s.playerId;
    const mobile=u.kind==='hero'||u.kind==='minion';
    let t=u.target===null?undefined:s.units.find(v=>v.id===u.target&&legalTarget(s,u,v));
    if(player&&u.dest){moveToward(u,u.dest.x,u.dest.z,FIXED_DT,stats[u.hero].speed);if(distance(u,u.dest)<.05){u.x=u.dest.x;u.z=u.dest.z;u.dest=null;}continue;}
    if(!t||(!player&&distance(u,t)>22))t=nearest(s,u,player?range(u):mobile?28:range(u));
    u.target=t?.id??null;
    if(t){
      const d=distance(u,t),r=range(u);
      if(mobile&&d>r*.94)moveToward(u,t.x,t.z,FIXED_DT,u.kind==='minion'?3.2:stats[u.hero].speed,r*.92);
      if(!player&&u.kind==='hero'){
        if(u.hp<u.maxHp*.55)cast(s,u,'e',u.x,u.z);
        if(d<=ABILITIES[u.hero].q.range)cast(s,u,'q',t.x,t.z);
        if(d<=ABILITIES[u.hero].w.range)cast(s,u,'w',t.x,t.z);
        if(d<=ABILITIES[u.hero].r.range)cast(s,u,'r',t.x,t.z);
      }
      if(t.alive&&distance(u,t)<=r&&u.attackCooldown<=1e-8){
        damage(s,u,t,u.kind==='tower'?70:u.kind==='core'?60:u.kind==='minion'?24:stats[u.hero].damage);
        u.attackCooldown=u.kind==='hero'?(s.talent===1&&player ? .7 : 1):u.kind==='minion'?1.2:1;
        s.effects.push({x:t.x,z:t.z,radius:.5,life:.15,team:u.team,kind:'attack'});
      }
    }else if(mobile&&!player&&s.mode==='battle')moveToward(u,u.team===0?30:-30,0,FIXED_DT,u.kind==='minion'?3.2:stats[u.hero].speed);
    if(s.winner!==null)break;
  }
  // Remove fallen wave units without changing the order of surviving actors.
  s.units=s.units.filter(u=>u.kind!=='minion'||u.alive);
}

export function step(s:State,dt:number):void {
  if(s.paused||s.winner!==null||!Number.isFinite(dt)||dt<=0)return;
  let pending=(accumulator.get(s)??0)+dt;
  while(pending+1e-9>=FIXED_DT&&s.winner===null){pending-=FIXED_DT;tick(s);}
  accumulator.set(s,Math.max(0,pending));
}

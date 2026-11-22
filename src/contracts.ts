export type Hero = 'ranger'|'frost'|'guardian';
export type Mode = 'training'|'battle';
export type Key = 'q'|'w'|'e'|'r';
export interface VisualAction {sequence:number;kind:'attack'|'cast';time:number;x:number;z:number;ability?:Key}
export interface CastAim {key:Key;x:number;z:number}
export interface Unit { slowUntilTick?:number;slowMultiplier?:number;positionEpoch?:number;visualAction?:VisualAction;id:number;team:0|1;kind:'hero'|'minion'|'tower'|'core'|'dummy';hero:Hero;x:number;z:number;hp:number;maxHp:number;mana:number;maxMana:number;alive:boolean;respawn:number;cooldowns:Record<Key,number>;target:number|null;dest:{x:number;z:number}|null;attackCooldown:number;aiCastCooldown:number;kills:number;deaths:number;}
export interface Effect {
  x:number;z:number;radius:number;life:number;team:number;kind:string;
  hero?:Hero;ability?:Key;sourceId?:number;origin?:{x:number;z:number};projectileId?:number;readonly readyTick?:number;
}
export interface DamageEvent {
  id:number;targetId:number; time:number; x:number; y:number; z:number; amount:number;
  incoming:boolean; ability?:Key;
}
export interface Projectile {
  id:number;
  sourceId:number;
  team:0|1;
  hero:'ranger'|'frost';
  x:number;
  z:number;
  dirX:number;
  dirZ:number;
  launchTick:number;
  distanceRemaining:number;
}
export interface PendingArea {
  sourceId:number;hero:'frost';ability:'w';x:number;z:number;readonly readyTick:number;
}
export interface State {mode:Mode;time:number;tick:number;units:Unit[];effects:Effect[];damageEvents:DamageEvent[];nextDamageId:number;projectiles:Projectile[];pendingAreas:PendingArea[];playerId:number;paused:boolean;winner:number|null;teams:{xp:number;level:number;kills:number}[];talent:number|null;nextId:number;nextProjectileId:number;nextWave:number;}
export type Command = {type:'move';x:number;z:number}|{type:'attack';id:number}|{type:'stop'}|{type:'cast';key:Key;x:number;z:number}|{type:'talent';index:number};
export interface Renderer {showHero(hero:Hero,host:HTMLElement,dt:number):boolean;update(s:State,dt:number,aim?:CastAim):void;pick(x:number,y:number):{x:number;z:number};dispose():void;zoom(delta:number):void;setQuality(quality: import("./settings").Quality):void;importModel(hero:Hero,data:ArrayBuffer):Promise<string>;}

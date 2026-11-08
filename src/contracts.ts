export type Hero = 'ranger'|'frost'|'guardian';
export type Mode = 'training'|'battle';
export type Key = 'q'|'w'|'e'|'r';
export interface Unit {id:number;team:0|1;kind:'hero'|'minion'|'tower'|'core'|'dummy';hero:Hero;x:number;z:number;hp:number;maxHp:number;mana:number;maxMana:number;alive:boolean;respawn:number;cooldowns:Record<Key,number>;target:number|null;dest:{x:number;z:number}|null;attackCooldown:number;kills:number;deaths:number;}
export interface Effect {x:number;z:number;radius:number;life:number;team:number;kind:string}
export interface State {mode:Mode;time:number;tick:number;units:Unit[];effects:Effect[];playerId:number;paused:boolean;winner:number|null;teams:{xp:number;level:number;kills:number}[];talent:number|null;nextId:number;nextWave:number;}
export type Command = {type:'move';x:number;z:number}|{type:'attack';id:number}|{type:'stop'}|{type:'cast';key:Key;x:number;z:number}|{type:'talent';index:number};
export interface Renderer {update(s:State,dt:number):void;pick(x:number,y:number):{x:number;z:number};dispose():void;zoom(delta:number):void;}

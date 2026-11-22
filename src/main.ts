import './style.css';
import {castTarget,createGame,command,step} from './sim';
import {createRenderer} from './render';
import {mountUI} from './ui';
import {mountDesktop} from './desktop';
import {readSettings,isMoveClick,wheelPixels} from './settings';
import type {Hero,Mode,Key,Renderer} from './contracts';
const game=document.querySelector<HTMLElement>('#game')!;
const root=document.querySelector<HTMLElement>('#ui')!;
const settings=readSettings();
let mode:Mode='training',hero:Hero='frost';
let state=createGame(mode,hero);state.paused=true;
let renderer:Renderer|null=null;
let graphicsReady=false;
const abort=new AbortController();const signal=abort.signal;
function graphicsFailure(message:string){
  graphicsReady=false;state.paused=true;
  const lobbyNotice=root.querySelector<HTMLElement>('#lobby-graphics-notice');
  if(lobbyNotice&&root.classList.contains('is-lobby')){
    lobbyNotice.textContent=message+' 开启浏览器硬件加速后，请重新加载。';
    lobbyNotice.hidden=false;
    root.querySelector<HTMLButtonElement>('#start')!.disabled=true;
    ui.showcase.parentElement?.classList.remove('has-live-hero');
    return;
  }
  const notice=document.querySelector<HTMLElement>('#error')!;notice.hidden=false;
  notice.className='graphics-error';
  notice.innerHTML='<section><span class="eyebrow">3D GRAPHICS REQUIRED</span><h1>3D 战场暂时无法启动</h1><p></p><p>请检查浏览器的硬件加速设置，并重启浏览器。也可以在 Mac 或 Windows 上尝试最新版 Chrome、Edge 或 Safari。</p><button type="button">重新加载</button></section>';
  notice.querySelector('p')!.textContent=message;
  notice.querySelector('button')!.addEventListener('click',()=>location.reload(),{signal});
  root.inert=true;notice.querySelector('button')!.focus();
}
let pointer:{x:number; y:number}|undefined;
let pointerOnField=false;
let armed:Key|null=null;
const active=()=>graphicsReady&&!root.classList.contains('is-lobby')&&!state.paused&&state.winner===null;
function start(m:Mode,h:Hero){if(!graphicsReady)return;mode=m;hero=h;state=createGame(m,h);state.paused=false;armed=null;pointer=undefined;pointerOnField=false;}
const ui=mountUI(root,{start,pause:()=>{if(graphicsReady){state.paused=!state.paused;armed=null;}},cast:key=>{if(active())armed=armed===key?null:key;},talent:index=>command(state,{type:'talent',index}),reset:()=>start(mode,hero)});
try {renderer=createRenderer(game,settings.quality);graphicsReady=true;}
catch {game.replaceChildren();graphicsFailure('开始对局需要 WebGL 2。');}
const desktop=mountDesktop(renderer,settings,()=>{state.paused=true;armed=null;});
game.querySelector('canvas')?.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsFailure('3D 图形连接已中断，战斗已暂停。重新加载以恢复。');},{signal});
game.addEventListener('contextmenu',e=>e.preventDefault(),{signal});
game.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};pointerOnField=true;},{signal});
game.addEventListener('pointerleave',()=>{pointerOnField=false;},{signal});
game.addEventListener('pointerdown',e=>{
 if(!active()||!renderer||![0,2].includes(e.button))return;
 e.preventDefault();pointer={x:e.clientX,y:e.clientY};pointerOnField=true;
 const aim=renderer.pick(pointer.x,pointer.y);
 if(armed&&e.button===0&&!e.ctrlKey){
   const player=state.units.find(unit=>unit.id===state.playerId);
   if(player&&castTarget(state,player,armed,aim.x,aim.z)){
     command(state,{type:'cast',key:armed,...aim});armed=null;
   }
   return;
 }
 armed=null;
 const enemy=state.units.filter(u=>u.team===1&&u.alive&&Math.hypot(u.x-aim.x,u.z-aim.z)<1.5).sort((a,b)=>Math.hypot(a.x-aim.x,a.z-aim.z)-Math.hypot(b.x-aim.x,b.z-aim.z))[0];
 if(enemy)command(state,{type:'attack',id:enemy.id});
 else if(isMoveClick(e.button,e.ctrlKey,e.pointerType,settings.controls))command(state,{type:'move',...aim});
},{signal});
game.addEventListener('wheel',e=>{if(!active())return;e.preventDefault();renderer?.zoom(wheelPixels(e.deltaY,e.deltaMode));},{passive:false,signal});
document.addEventListener('keydown',e=>{
 if(e.metaKey||e.ctrlKey||e.altKey||e.repeat||(e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"],.desktop-settings'))return;
 const k=e.key.toLowerCase();
 if(k==='escape'&&graphicsReady&&!root.classList.contains('is-lobby')){
   if(armed)armed=null;
   else state.paused=!state.paused;
   return;
 }
 if(!active())return;
 if(['q','w','e','r'].includes(k)){
   e.preventDefault();armed=null;
   if(pointer&&renderer)command(state,{type:'cast',key:k as Key,...renderer.pick(pointer.x,pointer.y)});
 }
 if(k==='s'){e.preventDefault();command(state,{type:'stop'});}
},{signal});
window.addEventListener('blur',()=>{state.paused=true;armed=null;},{signal});
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.paused=true;armed=null;}},{signal});
let last=performance.now(),acc=0,frame=0;
function loop(now:number){
 const dt=Math.min(.2,(now-last)/1000);last=now;
 if(active()){acc+=dt;while(acc>=.05){step(state,.05);acc-=.05;}}else acc=0;
 if(graphicsReady&&renderer){
   const lobby=root.classList.contains('is-lobby');
   if(lobby){
     const live=renderer.showHero(ui.selectedHero,ui.showcase,document.hidden?0:dt);
     ui.showcase.parentElement?.classList.toggle('has-live-hero',live);
   }else{
     const target=armed&&pointer&&pointerOnField&&active()?{key:armed,...renderer.pick(pointer.x,pointer.y)}:undefined;
     renderer.update(state,state.paused||state.winner!==null?0:dt,target);
   }
 }
 ui.update(state,armed);frame=requestAnimationFrame(loop);
}frame=requestAnimationFrame(loop);
Object.defineProperty(window,'__HOTS_DIAGNOSTICS__',{configurable:true,get:()=>({tick:state.tick,mode:state.mode,units:state.units.length,paused:state.paused,winner:state.winner,graphics:graphicsReady?'webgl2':'unavailable',settings:{...settings},player:state.units.find(u=>u.id===state.playerId),prototype:true})});
if(import.meta.hot)import.meta.hot.dispose(()=>{abort.abort();cancelAnimationFrame(frame);renderer?.dispose();ui.destroy();desktop.destroy();});

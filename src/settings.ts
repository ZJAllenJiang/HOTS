export type Quality = 'low' | 'balanced' | 'high';
export type ControlMode = 'mouse' | 'trackpad';
export interface Settings {quality:Quality;controls:ControlMode}
export const QUALITY = {
  low: {pixelRatio:1,shadows:false,shadowSize:512},
  balanced: {pixelRatio:1.5,shadows:true,shadowSize:1024},
  high: {pixelRatio:2,shadows:true,shadowSize:2048},
} as const;
export function readSettings():Settings {
  try {
    const data=JSON.parse(localStorage.getItem('hots-desktop-settings')??'{}');
    return {quality:['low','balanced','high'].includes(data.quality)?data.quality:'balanced',
      controls:data.controls==='trackpad'?'trackpad':'mouse'};
  } catch {return {quality:'balanced',controls:'mouse'};}
}
export function saveSettings(settings:Settings){try{localStorage.setItem('hots-desktop-settings',JSON.stringify(settings));}catch{/* Private browsing can reject storage. */}}
export function wheelPixels(delta:number,mode:number){return Math.max(-100,Math.min(100,delta*(mode===1?16:mode===2?400:1)));}
export function isMoveClick(button:number,ctrlKey:boolean,pointerType:string,mode:ControlMode){
  return button===2||(button===0&&(ctrlKey||pointerType==='touch'||mode==='trackpad'));
}

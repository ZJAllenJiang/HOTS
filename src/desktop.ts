import type {Hero,Renderer} from './contracts';
import {saveSettings,type Settings} from './settings';

export function mountDesktop(renderer:Renderer|null,settings:Settings,pause:()=>void){
  const panel=document.createElement('details');panel.className='desktop-settings';
  panel.innerHTML=`<summary>画质与操作</summary><div class="settings-body">
    <label>画质 <select id="quality"><option value="low">节能 · 1× / 无阴影</option><option value="balanced">均衡 · 1.5×</option><option value="high">高清 · 2×</option></select></label>
    <label>操作 <select id="controls"><option value="mouse">鼠标 · 右键移动</option><option value="trackpad">触控板 · 左键移动</option></select></label>
    <p>点击敌人攻击。Mac 可用 Control + 单击移动。Q / W / E / R 施法，S 停止，Esc 暂停。切出窗口后自动暂停。</p>
    <details class="model-import"><summary>模型验收 · 导入 GLB</summary>
      <p>替换当前槽位的 3D 模型，仅在本次页面中使用，不会上传。技能仍为原型。</p>
      <label>角色槽位 <select id="model-hero"><option value="ranger">远程 · Raynor 目标槽位</option><option value="frost">法师 · Jaina 目标槽位</option><option value="guardian">坦克 · Muradin 目标槽位</option></select></label>
      <label>模型文件 <input id="model-file" type="file" accept=".glb"></label>
      <p id="model-status" role="status">需要含贴图、骨骼与动作的 GLB。当前仍为几何占位模型。</p>
    </details><button id="settings-close">完成</button></div>`;
  document.body.append(panel);
  const quality=panel.querySelector<HTMLSelectElement>('#quality')!;quality.value=settings.quality;
  const controls=panel.querySelector<HTMLSelectElement>('#controls')!;controls.value=settings.controls;
  quality.addEventListener('change',()=>{settings.quality=quality.value as Settings['quality'];saveSettings(settings);renderer?.setQuality(settings.quality);});
  controls.addEventListener('change',()=>{settings.controls=controls.value as Settings['controls'];saveSettings(settings);});
  panel.addEventListener('toggle',()=>{if(panel.open)pause();});
  panel.querySelector('#settings-close')!.addEventListener('click',()=>{panel.open=false;panel.querySelector('summary')!.focus();});
  const input=panel.querySelector<HTMLInputElement>('#model-file')!;
  input.disabled=!renderer;
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file||!renderer)return;
    const status=panel.querySelector<HTMLElement>('#model-status')!;
    if(file.size>32*1024*1024){status.textContent='文件超过 32 MB，请先优化贴图和网格。';return;}
    input.disabled=true;status.textContent='正在检查模型、贴图与动作…';
    try {status.textContent=await renderer.importModel(panel.querySelector<HTMLSelectElement>('#model-hero')!.value as Hero,await file.arrayBuffer());}
    catch(error){status.textContent=error instanceof Error?error.message:'模型载入失败，请检查 GLB。';}
    finally{input.disabled=false;input.value='';}
  });
  return {destroy(){panel.remove();}};
}

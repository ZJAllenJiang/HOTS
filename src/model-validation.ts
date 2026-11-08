// Accept self-contained GLB only. A local file must never fetch remote textures or buffers.
export function inspectGLB(data:ArrayBuffer){
  if(data.byteLength<20||data.byteLength>32*1024*1024)throw new Error('需要 32 MB 以内的完整 GLB 文件。');
  const view=new DataView(data);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==data.byteLength||view.getUint32(16,true)!==0x4e4f534a)throw new Error('不是有效的 glTF 2.0 GLB 文件。');
  const length=view.getUint32(12,true);
  if(20+length>data.byteLength)throw new Error('GLB 文件已截断。');
  let doc;
  try{doc=JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,length)));}catch{throw new Error('GLB 元数据损坏。');}
  if([...doc.buffers??[],...doc.images??[]].some((r:{uri?:string})=>r.uri!==undefined))throw new Error('请将全部贴图和缓冲区嵌入 GLB，不支持外部文件。');
  if((doc.images??[]).some((i:{mimeType?:string})=>!['image/png','image/jpeg'].includes(i.mimeType??'')))throw new Error('请将 DDS / TGA / KTX2 贴图转换为 PNG 或 JPEG 后嵌入。');
  if((doc.extensionsRequired??[]).some((s:string)=>!['KHR_materials_unlit','KHR_texture_transform','KHR_mesh_quantization','KHR_materials_pbrSpecularGlossiness','KHR_materials_clearcoat','KHR_materials_transmission','KHR_materials_ior','KHR_materials_specular','KHR_materials_sheen','KHR_materials_volume','KHR_materials_emissive_strength','KHR_materials_iridescence','KHR_materials_anisotropy'].includes(s)))throw new Error('模型包含当前不支持的压缩或扩展，请导出未压缩 GLB。');
  return {meshes:doc.meshes?.length??0,animations:doc.animations?.length??0,images:doc.images?.length??0};
}

import {describe,it,expect} from 'vitest';
import {isMoveClick,wheelPixels} from '../src/settings';
import {inspectGLB} from '../src/model-validation';
function glb(doc:object){const json=new TextEncoder().encode(JSON.stringify(doc));const length=Math.ceil(json.length/4)*4;const buffer=new ArrayBuffer(20+length);const v=new DataView(buffer);[0x46546c67,2,buffer.byteLength,length,0x4e4f534a].forEach((n,i)=>v.setUint32(i*4,n,true));new Uint8Array(buffer,20).fill(32);new Uint8Array(buffer,20,json.length).set(json);return buffer;}
describe('desktop and self-contained model inputs',()=>{
 it('supports right click, Mac control click and one-button trackpad without changing mouse selection',()=>{
  expect(isMoveClick(0,false,'mouse','mouse')).toBe(false);expect(isMoveClick(2,false,'mouse','mouse')).toBe(true);
  expect(isMoveClick(0,true,'mouse','mouse')).toBe(true);expect(isMoveClick(0,false,'mouse','trackpad')).toBe(true);
  expect(isMoveClick(1,true,'mouse','trackpad')).toBe(false);
 });
 it('normalizes wheel units and caps high-resolution gesture spikes',()=>{
  expect(wheelPixels(3,1)).toBe(48);expect(wheelPixels(.5,0)).toBe(.5);expect(wheelPixels(5000,0)).toBe(100);expect(wheelPixels(-1,2)).toBe(-100);
 });
 it('rejects truncated and non-GLB inputs before parsing or fetching',()=>{
  expect(()=>inspectGLB(new ArrayBuffer(12))).toThrow();const data=glb({asset:{version:'2.0'}});expect(()=>inspectGLB(data.slice(0,-1))).toThrow();
 });
 it('rejects external models and unsupported texture encodings',()=>{
  expect(()=>inspectGLB(glb({images:[{uri:'https://example.com/texture.png'}]}))).toThrow('嵌入');
  expect(()=>inspectGLB(glb({buffers:[{uri:'file.bin'}]}))).toThrow('嵌入');
  expect(()=>inspectGLB(glb({images:[{mimeType:'image/vnd-ms.dds'}]}))).toThrow('PNG');
  expect(()=>inspectGLB(glb({extensionsRequired:['KHR_draco_mesh_compression']}))).toThrow('压缩');
 });
 it('reports contained geometry and animation metadata',()=>{expect(inspectGLB(glb({meshes:[{}],animations:[{},{}],images:[{bufferView:0,mimeType:'image/png'}]}))).toEqual({meshes:1,animations:2,images:1});});
});

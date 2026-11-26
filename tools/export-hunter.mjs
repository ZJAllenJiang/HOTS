import {writeFile} from 'node:fs/promises';
import {AnimationClip, QuaternionKeyframeTrack, VectorKeyframeTrack} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRangerArt, RANGER_STRIDE_HZ} from '../src/ranger-art.ts';
import {inspectGLB} from '../src/model-validation.ts';

const destination = process.argv[2];
if (!destination) throw new Error('Usage: vite-node tools/export-hunter.mjs -- <output.glb>');

// The binary exporter reads Blob contents through FileReader in the browser.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => {
      this.result = result;
      this.onloadend?.();
    }, error => this.onerror?.(error));
  }
};

const art = createRangerArt();
const asset = art.instantiate();
const nodes = [];
asset.root.traverse(node => nodes.push(node));

function poseValues(node) {
  return {
    position: node.position.toArray(),
    quaternion: node.quaternion.toArray(),
    scale: node.visible ? node.scale.toArray() : [0, 0, 0],
  };
}

function bake(name, duration, motion, action, ability, offhand = false) {
  const sample = art.instantiate();
  const posed = [];
  sample.root.traverse(node => posed.push(node));
  const samples = nodes.map(() => ({position:[], quaternion:[], scale:[]}));
  const times = [];
  const frames = Math.ceil(duration * 60);
  const dt = duration / frames;
  if (motion === 'run') {
    for (let warmup = 0; warmup < 30; warmup++) sample.update('run', 1 / 60);
  }
  if (offhand) sample.play('attack');
  if (action) sample.play(action, ability);
  for (let frame = 0; frame <= frames; frame++) {
    sample.update(motion, frame === 0 ? 0 : dt);
    times.push(frame * dt);
    posed.forEach((node, index) => {
      for (const [key, values] of Object.entries(poseValues(node))) samples[index][key].push(...values);
    });
  }
  sample.dispose();

  const tracks = [];
  nodes.forEach((node, index) => {
    for (const [key, values] of Object.entries(samples[index])) {
      const initial = poseValues(node)[key];
      if (!values.some((value, offset) => Math.abs(value - initial[offset % initial.length]) > 1e-5)) continue;
      const Track = key === 'quaternion' ? QuaternionKeyframeTrack : VectorKeyframeTrack;
      tracks.push(new Track(`${node.uuid}.${key}`, times, values));
    }
  });
  return new AnimationClip(name, duration, tracks).optimize();
}

try {
  const clips = [
    bake('Idle', 10 * Math.PI / 3, 'idle'),
    bake('Run', 2 / RANGER_STRIDE_HZ, 'run'),
    bake('Attack', .5, 'idle', 'attack'),
    bake('Attack Offhand', .5, 'idle', 'attack', undefined, true),
    bake('Cast Quick Bolt', .65, 'idle', 'cast', 'q'),
  ];
  const data = await new GLTFExporter().parseAsync(asset.root, {
    binary:true, onlyVisible:false, trs:true, animations:clips,
  });
  inspectGLB(data);
  const imported = await new GLTFLoader().parseAsync(data, '');
  if (imported.animations.length !== clips.length || imported.animations.some(clip => clip.tracks.length === 0)) {
    throw new Error('GLB import did not recover every animated clip.');
  }
  await writeFile(destination, new Uint8Array(data));
  console.log(`Exported ${clips.length} animation clips to ${destination} (${data.byteLength} bytes)`);
} finally {
  asset.dispose();
  art.dispose();
}

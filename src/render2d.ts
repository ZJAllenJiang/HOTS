import type { Renderer, State, Unit } from './contracts';

/** Lightweight arena renderer for browsers without a WebGL context. */
export function createFallbackRenderer(container: HTMLElement): Renderer {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas graphics are unavailable.');
  const ctx = context;
  container.appendChild(canvas);
  let width = 1, height = 1, dpr = 1, scale = 1, zoom = 1, focusX = -6, focusZ = 0, disposed = false;
  function resize() {
    const rect = container.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    scale = Math.max(6, Math.min(width / 48, height / 27)) * zoom;
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  function circle(x: number, z: number, r: number, fill: string, stroke?: string) {
    ctx.beginPath(); ctx.arc(x, z, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .07; ctx.stroke(); }
  }
  function line(x: number, z: number, x2: number, z2: number, color: string, thickness = .08) {
    ctx.beginPath(); ctx.moveTo(x, z); ctx.lineTo(x2, z2); ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.stroke();
  }
  function polygon(points: number[], fill: string, stroke?: string) {
    ctx.beginPath(); ctx.moveTo(points[0], points[1]); for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .08; ctx.stroke(); }
  }
  let seed = 73531;
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const trees = Array.from({ length: 145 }, () => ({ x: random() * 94 - 47, z: (10.5 + random() * 9) * (random() > .5 ? 1 : -1), r: .65 + random() * .85, c: random() > .5 ? '#244b43' : '#31594a' }));
  const pavers = Array.from({ length: 50 * 24 }, (_, i) => ({ x: -37.5 + Math.floor(i / 24) * 1.5 + (i % 2) * .65, z: -8.4 + (i % 24) * .7, c: ['#606d70', '#56656a', '#697372', '#5c686a'][Math.floor(random() * 4)] }));
  function arena() {
    ctx.fillStyle = '#172d31'; ctx.fillRect(-100, -100, 200, 200);
    ctx.fillStyle = '#294039'; ctx.fillRect(-48, -22, 96, 44);
    for (const t of trees) { circle(t.x + .35, t.z + .5, t.r, '#162b2b'); circle(t.x, t.z, t.r, t.c); circle(t.x - .2, t.z - .25, t.r * .6, '#3b6250'); }
    ctx.fillStyle = '#37464b'; ctx.fillRect(-38, -9.1, 76, 18.2);
    for (const p of pavers) { ctx.fillStyle = p.c; ctx.fillRect(p.x, p.z, 1.39, .6); }
    for (const z of [-8.85, 8.85]) {
      line(-38, z, 38, z, '#899080', .38); line(-38, z, 38, z, '#c1ad7a', .045);
      for (let x = -37; x < 38; x += 3.8) { ctx.fillStyle = '#9a9c86'; ctx.fillRect(x, z - .32, .65, .64); }
    }
    circle(0, 0, 5.3, '#526166', '#b5a57e'); circle(0, 0, 4.8, '#526166', '#7e8a84'); circle(0, 0, 2.3, '#58686a', '#b5a57e');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a) * 4.2, Math.sin(a) * 4.2, '#b0a583', .07); }
    polygon([0, -1.2, 1.2, 0, 0, 1.2, -1.2, 0], '#a3aa96');
  }
  function unit(u: Unit, player: boolean, time: number) {
    const color = u.team === 0 ? '#67e2ff' : '#fc719c';
    ctx.save(); ctx.translate(u.x, u.z);
    const structure = u.kind === 'core' || u.kind === 'tower', r = u.kind === 'core' ? 1.8 : u.kind === 'tower' ? 1.2 : u.kind === 'minion' ? .38 : .68;
    circle(.12, .22, r * 1.1, '#17252c99');
    if (player) { circle(0, 0, 1.05 + Math.sin(time * 3) * .04, '#69e4ff12', '#acffff'); }
    if (structure) {
      circle(0, 0, r, '#334651', '#ab9d7a'); circle(0, 0, r * .74, '#526572', color);
      if (u.kind === 'core') { polygon([0, -1.25, .82, 0, 0, 1.05, -.82, 0], color, '#ecfaff'); polygon([0, -1.25, .82, 0, 0, .35], '#ffffff70'); }
      else { ctx.fillStyle = '#8a9b9f'; ctx.fillRect(-.48, -.55, .96, 1.1); circle(0, -.15, .38, color, '#f0fcff'); line(0, -.2, u.team === 0 ? .95 : -.95, -.2, '#d8e3dc', .2); }
    } else if (u.kind === 'minion') {
      polygon([0, -.45, .36, .3, -.36, .3], u.team === 0 ? '#3c99b5' : '#aa447d', color); circle(0, -.18, .17, '#e3d9bf');
    } else if (u.kind === 'dummy') {
      line(0, -.6, 0, .65, '#ba9565', .18); line(-.5, 0, .5, 0, '#ba9565', .15); circle(0, 0, .45, '#a77e53', '#e6bb78'); circle(0, 0, .16, '#efcf91');
    } else {
      const facing = u.dest ? Math.atan2(u.dest.z - u.z, u.dest.x - u.x) : (u.team === 0 ? 0 : Math.PI);
      ctx.save(); ctx.rotate(facing);
      if (u.hero === 'ranger') {
        polygon([-.6, -.48, -.8, .45, .45, .3, .5, -.2], '#357b65', color); circle(.12, 0, .3, '#d8c8a0');
        ctx.beginPath(); ctx.arc(.63, 0, .7, -1.05, 1.05); ctx.strokeStyle = '#e7c989'; ctx.lineWidth = .12; ctx.stroke(); line(.97, -.6, .97, .6, '#d2e3d5', .04); line(.45, 0, 1.35, 0, '#e9e3c1', .06);
      } else if (u.hero === 'frost') {
        polygon([-.7, -.5, -.7, .5, .5, .3, .5, -.3], '#6577ba', '#abcfff'); circle(.1, 0, .3, '#dedff0'); line(-.1, -.7, .9, -.7, '#c9dbea', .11); polygon([1.15, -.7, .8, -1.05, .5, -.7, .8, -.35], '#a9f4ff', '#f7ffff');
      } else {
        polygon([-.6, -.6, -.6, .6, .5, .5, .5, -.5], '#7f8793', '#ded6b8'); circle(.05, 0, .32, '#c5c5b3'); polygon([.55, .2, 1, .35, .85, .95, .3, .8], '#3c6f9b', '#e3c58d'); line(.3, -.65, 1.25, -.65, '#ece7cb', .15); line(.6, -.9, .6, -.4, '#d3ac70', .1);
      }
      ctx.restore(); circle(0, 0, .78, '#00000000', color);
    }
    const barWidth = structure ? 2.5 : u.kind === 'minion' ? .85 : 1.55, y = -r - .52;
    ctx.fillStyle = '#122129'; ctx.fillRect(-barWidth / 2 - .04, y - .04, barWidth + .08, .25);
    ctx.fillStyle = color; ctx.fillRect(-barWidth / 2, y, barWidth * Math.max(0, Math.min(1, u.hp / u.maxHp)), .17);
    if (player) { ctx.fillStyle = '#94b9ff'; ctx.fillRect(-barWidth / 2, y + .23, barWidth * Math.max(0, u.mana / u.maxMana), .08); }
    ctx.restore();
  }
  return {
    update(s: State, dt: number) {
      if (disposed) return;
      const p = s.units.find(u => u.id === s.playerId);
      if (p) { const f = 1 - Math.exp(-Math.max(0, dt) * 8); focusX += (Math.max(-30, Math.min(30, p.x)) - focusX) * f; focusZ += (Math.max(-4, Math.min(4, p.z)) - focusZ) * f; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#172b32'; ctx.fillRect(0, 0, width, height);
      ctx.translate(width / 2, height / 2); ctx.scale(scale, scale); ctx.translate(-focusX, -focusZ); arena();
      for (const e of s.effects) {
        ctx.save(); ctx.globalAlpha = Math.min(.8, Math.max(.12, e.life)); const c = e.team === 0 ? '#9eeeff' : '#f58fd0';
        circle(e.x, e.z, Math.max(.15, e.radius), `${c}25`, c);
        if (/frost|ice|nova|blizzard/.test(e.kind)) for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; line(e.x, e.z, e.x + Math.cos(a) * e.radius, e.z + Math.sin(a) * e.radius, '#d9faff', .06); }
        else if (/attack|arrow|bolt/.test(e.kind)) { line(e.x - .4, e.z, e.x + .4, e.z, '#fff0bb', .13); }
        ctx.restore();
      }
      for (const u of [...s.units].sort((a, b) => a.z - b.z)) if (u.alive) unit(u, u.id === s.playerId, s.time);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const shade = ctx.createRadialGradient(width / 2, height / 2, height * .25, width / 2, height / 2, Math.max(width, height) * .65); shade.addColorStop(0, '#06131c00'); shade.addColorStop(1, '#06131c99'); ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
    },
    pick(clientX, clientY) { const r = canvas.getBoundingClientRect(); return { x: Math.max(-35, Math.min(35, (clientX - r.left - width / 2) / scale + focusX)), z: Math.max(-9, Math.min(9, (clientY - r.top - height / 2) / scale + focusZ)) }; },
    zoom(delta) { zoom = Math.max(.7, Math.min(1.65, zoom * Math.exp(-delta * .001))); resize(); },
    dispose() { disposed = true; observer.disconnect(); canvas.remove(); },
  };
}

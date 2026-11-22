import * as THREE from 'three';
import type { Effect, Hero, Key } from './contracts';

const TAU = Math.PI * 2;
const LIMIT = 32;
const BASIC_ATTACK_LIMIT = 10;
const TEAM_COLOR = [0x56dcff, 0xff7690] as const;
const LEGACY_ABILITIES: Partial<Record<string, Key>> = { shot: 'q', burst: 'w', heal: 'e', ultimate: 'r' };
const PALETTE: Record<Hero, { color: number; highlight: number; shadow: number }> = {
  frost: { color: 0x85baff, highlight: 0xe8fcff, shadow: 0x38387e },
  ranger: { color: 0x9ef2ba, highlight: 0xfff2b8, shadow: 0x225443 },
  guardian: { color: 0xffb950, highlight: 0xfff0be, shadow: 0x80451e },
};

function shape(points: readonly (readonly [number, number])[]): THREE.ShapeGeometry {
  return new THREE.ShapeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))));
}

function star(points: number, indentation: number): THREE.ShapeGeometry {
  return shape(Array.from({ length: points * 2 }, (_, index) => {
    const angle = index * Math.PI / points;
    const radius = index % 2 ? indentation : 1;
    return [Math.sin(angle) * radius, Math.cos(angle) * radius] as const;
  }));
}

function createGeometries() {
  return {
    thinRing: new THREE.RingGeometry(.964, 1, 48),
    broadRing: new THREE.RingGeometry(.91, 1, 48),
    hexRing: new THREE.RingGeometry(.94, 1, 6),
    disc: new THREE.CircleGeometry(1, 48),
    box: new THREE.BoxGeometry(1, 1, 1),
    crystal: new THREE.OctahedronGeometry(1),
    pillar: new THREE.CylinderGeometry(.65, 1, 1, 6),
    wind: new THREE.RingGeometry(.89, 1, 24, 1, 0, Math.PI * 1.2),
    arrow: shape([[0, 1], [.56, -.14], [.15, .03], [.15, -.92], [-.15, -.92], [-.15, .03], [-.56, -.14]]),
    shield: shape([[-.65, .7], [.65, .7], [.6, -.18], [0, -.88], [-.6, -.18]]),
    frostMark: star(6, .37),
    rangerMark: star(4, .25),
    rangerNova: star(8, .46),
  };
}

function material(color: number) {
  return new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
  });
}

function createMaterials(hero: Hero, team: number) {
  const palette = PALETTE[hero];
  return {
    team: material(TEAM_COLOR[team === 0 ? 0 : 1]),
    color: material(palette.color),
    highlight: material(palette.highlight),
    shadow: material(palette.shadow),
  };
}

type Geometries = ReturnType<typeof createGeometries>;
type Materials = ReturnType<typeof createMaterials>;
type Animate = (progress: number) => void;

interface EffectView {
  root: THREE.Group;
  materials: Materials;
  duration: number;
  age: number;
  animate: Animate;
}

function mesh(root: THREE.Group, geometry: THREE.BufferGeometry, mat: THREE.MeshBasicMaterial) {
  const part = new THREE.Mesh(geometry, mat);
  root.add(part);
  return part;
}

function ground(
  root: THREE.Group, geometry: THREE.BufferGeometry, mat: THREE.MeshBasicMaterial,
  size: number, elevation: number, angle = 0,
) {
  const part = mesh(root, geometry, mat);
  part.rotation.set(-Math.PI / 2, 0, angle, 'XYZ');
  part.position.y = elevation;
  part.scale.set(size, size, 1);
  return part;
}

function unitProgress(value: number): number {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function easeOut(value: number): number {
  return 1 - Math.pow(1 - unitProgress(value), 3);
}

function fadeAfter(progress: number, start: number): number {
  return 1 - unitProgress((progress - start) / (1 - start));
}

function attack(root: THREE.Group, geo: Geometries, mats: Materials): Animate {
  const pulse = ground(root, geo.broadRing, mats.team, .52, .025);
  const spark = mesh(root, geo.crystal, mats.highlight);
  spark.position.y = .63;
  spark.rotation.z = .4;

  return progress => {
    const expansion = .5 + .45 * easeOut(progress);
    pulse.scale.set(expansion, expansion, 1);
    mats.team.opacity = .65 * (1 - progress);
    mats.highlight.opacity = .8 * (1 - progress);
    spark.scale.set(.12, .23 + .27 * progress, .12);
    spark.position.y = .63 + .4 * progress;
  };
}

function impact(root: THREE.Group, geo: Geometries, mats: Materials, effect: Effect, hero: Hero, radius: number): Animate {
  const slam = hero === 'guardian';
  const arrow = hero === 'ranger';
  const outline = ground(root, geo.broadRing, mats.team, radius, .04);
  const stamp = ground(root, slam ? geo.shield : geo.disc, mats.shadow, radius * .8, .02);
  const direction = effect.origin ? Math.atan2(effect.z - effect.origin.z, effect.x - effect.origin.x) : Math.PI / 4;
  const point = arrow
    ? ground(root, geo.arrow, mats.highlight, radius, .21, -Math.PI / 2 - direction)
    : mesh(root, slam ? geo.pillar : geo.crystal, mats.highlight);
  const chips = Array.from({ length: slam ? 6 : 5 }, (_, index) => {
    const angle = slam ? index * TAU / 6 : direction + (index - 2) * .49;
    const fragment = mesh(root, slam ? geo.pillar : arrow ? geo.box : geo.crystal, mats.color);
    fragment.rotation.set(0, -angle, .65);
    return { fragment, angle, length: .34 + (index % 3) * .16 };
  });

  return progress => {
    const expansion = easeOut(progress * 1.65);
    const fade = fadeAfter(progress, .18);
    outline.scale.setScalar(radius * (slam ? 1 : .56 + .61 * expansion));
    stamp.scale.setScalar(radius * (slam ? .85 : .56 + .46 * expansion));
    mats.team.opacity = .95 * fade;
    mats.shadow.opacity = .3 * fade;
    mats.color.opacity = .94 * fade;
    mats.highlight.opacity = fadeAfter(progress, 0);
    if (arrow) {
      point.position.y = .23 + .36 * fade;
      point.scale.set(.36 * fade, .95 * fade, 1);
    } else {
      point.position.y = slam ? .19 : .65;
      point.scale.set(radius * (slam ? .39 : .3), (.72 + .32 * expansion) * fade * (slam ? .38 : 1), radius * (slam ? .39 : .27));
    }
    for (const { fragment, angle, length } of chips) {
      const distance = radius * (.22 + expansion * length);
      const lift = Math.sin(progress * Math.PI);
      fragment.position.set(Math.cos(angle) * distance, .14 + lift * (slam ? .6 : 1.05), Math.sin(angle) * distance);
      fragment.scale.set(.12 * fade, length * .8 * fade, .11 * fade);
      fragment.rotation.x = progress * 1.5;
    }
  };
}

function telegraph(root: THREE.Group, geo: Geometries, mats: Materials, radius: number): Animate {
  // The fixed edge is the actual hit area; only the inner countdown moves.
  const edge = ground(root, geo.thinRing, mats.team, radius, .062);
  edge.name = 'area-edge';
  ground(root, geo.disc, mats.shadow, radius, .01);
  const countdown = ground(root, geo.hexRing, mats.color, radius * .92, .05, Math.PI / 6);
  countdown.name = 'warning-countdown';
  ground(root, geo.frostMark, mats.highlight, radius * .22, .038);
  return progress => {
    mats.team.opacity = .54;
    mats.shadow.opacity = .13;
    mats.color.opacity = .38 + progress * .15;
    mats.highlight.opacity = .35;
    countdown.scale.setScalar(radius * (.92 - .6 * progress));
  };
}

function area(root: THREE.Group, geo: Geometries, mats: Materials, hero: Hero, radius: number, ultimate: boolean): Animate {
  const frostBurst = hero === 'frost' && !ultimate;
  const edge = ground(root, geo.broadRing, mats.team, radius, .062);
  edge.name = 'area-edge';
  ground(root, geo.disc, mats.shadow, radius, .01);
  const accentGeometry = hero === 'ranger' ? geo.wind : geo.hexRing;
  const accent = ground(root, accentGeometry, mats.color, radius * .82, .05, Math.PI / 6);
  const runeGeometry = hero === 'frost' ? geo.frostMark : hero === 'guardian' ? geo.shield : geo.rangerMark;
  const rune = ground(root, runeGeometry, mats.color, radius * .37, .038);
  const shock = ground(root, geo.broadRing, mats.highlight, radius * .45, .03);
  shock.name = 'area-shock';
  let centerpiece: THREE.Mesh | undefined;
  if (ultimate) {
    centerpiece = hero === 'ranger'
      ? ground(root, geo.rangerNova, mats.highlight, 1.5, 1.9)
      : mesh(root, hero === 'guardian' ? geo.pillar : geo.crystal, mats.highlight);
  }
  const count = ultimate ? 10 : frostBurst ? 6 : 7;
  const pieces = Array.from({ length: count }, (_, index) => {
    const angle = index * TAU / count + .3;
    const geometry = hero === 'frost' ? geo.crystal : hero === 'guardian' ? geo.pillar : geo.arrow;
    const piece = mesh(root, geometry, mats.highlight);
    piece.name = `${hero}-impact-piece`;
    const mark = ground(root, hero === 'ranger' ? geo.arrow : runeGeometry, mats.color, frostBurst ? .68 : ultimate ? .63 : .55, .04, angle + Math.PI);
    const distance = radius * (ultimate ? .76 : .69) * (index % 3 === 0 ? .68 : 1);
    mark.position.x = Math.sin(angle) * distance;
    mark.position.z = -Math.cos(angle) * distance;
    return { piece, mark, angle, distance, delay: frostBurst ? 0 : index % 3 * .06 };
  });

  return progress => {
    const fade = fadeAfter(progress, ultimate ? .45 : .28);
    const expansion = easeOut(progress * (ultimate ? 1.75 : 2.35));
    mats.team.opacity = .98 * fade;
    mats.color.opacity = .94 * fade;
    mats.shadow.opacity = (frostBurst ? .52 : .34) * fade;
    mats.highlight.opacity = fadeAfter(progress, frostBurst ? .3 : .24);
    accent.rotation.z = Math.PI / 6 + (hero === 'ranger' ? progress * 1.65 : progress * .23);
    // Start at arena-readable size on the first frame, then push out to the edge.
    shock.scale.setScalar(radius * (.6 + .36 * easeOut(progress * (frostBurst ? 4 : 2.4))));
    rune.scale.setScalar(radius * ((frostBurst ? .76 : ultimate ? .57 : .48) + expansion * .06));
    if (centerpiece) {
      const crest = fadeAfter(progress, .05);
      if (hero === 'ranger') {
        centerpiece.position.y = 1.9 - expansion * 1.65;
        centerpiece.rotation.z = expansion * .45;
        const span = (radius * (.28 + expansion * .22)) * crest;
        centerpiece.scale.set(span, span, 1);
      } else if (hero === 'frost') {
        centerpiece.position.y = 1.65 + expansion * .42;
        centerpiece.rotation.set(.23, progress * 1.8, .23);
        centerpiece.scale.set(.8 * crest, 1.6 * crest, .8 * crest);
      } else {
        centerpiece.position.y = .35 + easeOut(progress * 2.7) * .65;
        centerpiece.scale.set(.8 * crest, 1.8 * crest, .8 * crest);
      }
    }
    for (const { piece, mark, angle, distance, delay } of pieces) {
      const local = unitProgress((progress - delay) / (1 - delay));
      const size = fadeAfter(local, .37);
      if (hero === 'frost') {
        const reach = ultimate ? distance * (.27 + .73 * easeOut(local * 1.7)) : distance;
        if (frostBurst) {
          const crest = (1 + .25 * Math.sin(Math.PI * unitProgress(local * 3))) * size;
          piece.position.set(Math.sin(angle) * reach, .18 + .96 * crest, -Math.cos(angle) * reach);
          piece.rotation.set(Math.sin(angle) * .2, angle, Math.cos(angle) * .2);
          piece.scale.set(.42 * size, 1.2 * crest, .34 * size);
        } else {
          piece.position.set(Math.sin(angle) * reach, .4 + 1.65 * Math.pow(1 - local, 2), -Math.cos(angle) * reach);
          piece.rotation.set(.14, angle, .25 + .58 * local);
          piece.scale.set(.3 * size, 1.1 * size, .32 * size);
        }
      } else if (hero === 'ranger') {
        piece.position.set(mark.position.x - .92 * (1 - local), .45 + 2.5 * Math.pow(1 - local, 3), mark.position.z + .45 * (1 - local));
        piece.rotation.set(-.18, -.68, Math.PI + .5);
        piece.scale.set(.52 * size, .88 * size, .45);
      } else {
        const lift = (.72 + .28 * easeOut(local * 4)) * fadeAfter(local, .35);
        piece.position.set(mark.position.x, .14 + .34 * lift, mark.position.z);
        piece.rotation.y = angle;
        piece.scale.set(.42 * size, (.35 + (ultimate ? 1.6 : 1.05) * lift) * size, .42 * size);
      }
    }
  };
}

function utility(root: THREE.Group, geo: Geometries, mats: Materials, effect: Effect, hero: Hero, radius: number): Animate {
  const motes = Array.from({ length: 5 }, (_, index) => mesh(root, index % 2 ? geo.crystal : geo.pillar, mats.highlight));
  const rim = ground(root, hero === 'guardian' ? geo.thinRing : geo.wind, mats.team, radius, .05);
  const accent = ground(root, hero === 'guardian' ? geo.hexRing : geo.wind, mats.color, radius * .65, .04, Math.PI);
  ground(root, hero === 'guardian' ? geo.shield : hero === 'ranger' ? geo.rangerMark : geo.frostMark, mats.color, radius * .38, .026);
  const dx = (effect.origin?.x ?? effect.x) - effect.x;
  const dz = (effect.origin?.z ?? effect.z) - effect.z;
  const travel = Math.hypot(dx, dz);
  const wake: THREE.Mesh[] = [];
  if (hero !== 'guardian' && travel > .35) {
    const angle = Math.atan2(dx, dz);
    for (let index = 0; index < (hero === 'frost' ? 5 : 3); index++) {
      const segment = mesh(root, hero === 'frost' ? geo.crystal : geo.box, mats.color);
      segment.rotation.y = angle;
      wake.push(segment);
    }
  }

  return progress => {
    const fade = fadeAfter(progress, .25);
    const expansion = easeOut(progress * 1.68);
    mats.team.opacity = .92 * fade;
    mats.color.opacity = .79 * fade;
    mats.highlight.opacity = .89 * fade;
    if (hero !== 'guardian') rim.scale.setScalar(radius * (.68 + .32 * expansion));
    accent.rotation.z = Math.PI + (hero === 'guardian' ? 0 : expansion * 1.6);
    for (let index = 0; index < motes.length; index++) {
      const angle = index * TAU / motes.length - progress * 1.25;
      const distance = radius * (.38 + expansion * .18);
      const mote = motes[index];
      mote.position.set(Math.cos(angle) * distance, .33 + 1.1 * expansion + index % 2 * .28, Math.sin(angle) * distance);
      mote.scale.set(.11 * fade, (.15 + .36 * fade) * fade, .11 * fade);
      mote.rotation.set(.12, angle, progress * .7);
    }
    for (let index = 0; index < wake.length; index++) {
      const segment = wake[index];
      const offset = hero === 'frost' ? (index + 1) / (wake.length + 1) : .55 + (index - 1) * .08;
      const spread = hero === 'frost' ? .07 : .24;
      segment.position.set(dx * offset + dz / travel * (index - 1) * spread, .19 + (1 - offset) * .48, dz * offset - dx / travel * (index - 1) * spread);
      segment.scale.set(.16 * fade, .13 * fade, Math.min(travel * .25, 1.9 - index * .18) * fade);
    }
  };
}

export class CombatFx {
  private readonly geometries = createGeometries();
  private readonly views = new Map<Effect, EffectView>();
  private readonly active = new Set<Effect>();

  constructor(private scene: THREE.Scene) {}

  update(effects: readonly Effect[], dt: number, playerId?: number): void {
    this.active.clear();
    // Keep player spell feedback and ground warnings visible in crowded fights.
    for (let index = effects.length - 1; index >= 0 && this.active.size < LIMIT; index--) {
      const effect = effects[index];
      const playerAbility = playerId !== undefined && playerId === effect.sourceId && effect.ability !== undefined;
      if (effect.life > 0 && (playerAbility || effect.kind === 'telegraph')) this.active.add(effect);
    }
    let attacks = 0;
    for (let index = effects.length - 1; index >= 0 && this.active.size < LIMIT; index--) {
      const effect = effects[index];
      if (effect.life <= 0 || this.active.has(effect) || (effect.kind === 'attack' && attacks++ >= BASIC_ATTACK_LIMIT)) continue;
      this.active.add(effect);
    }
    for (const [effect, view] of this.views) {
      if (!this.active.has(effect)) this.remove(effect, view);
    }
    for (const effect of this.active) {
      const view = this.views.get(effect);
      if (!view) {
        this.create(effect);
        continue;
      }
      // Interpolate between fixed simulation ticks, with at most one tick of prediction.
      const age = Math.max(0, view.duration - effect.life);
      view.age = Math.min(age + .05, Math.max(age, view.age + Math.max(0, dt)));
      view.animate(unitProgress(view.age / view.duration));
    }
  }

  private create(effect: Effect): void {
    const root = new THREE.Group();
    root.position.set(effect.x, .16, effect.z);
    const hero = effect.hero ?? (effect.kind === 'heal' ? 'guardian' : 'frost');
    const mats = createMaterials(hero, effect.team);
    const radius = Math.max(.3, effect.radius);
    const ability = effect.ability ?? LEGACY_ABILITIES[effect.kind];
    root.name = `${hero}-${ability ?? 'attack'}-${effect.kind}`;
    let animate: Animate;
    if (effect.kind === 'telegraph') {
      animate = telegraph(root, this.geometries, mats, radius);
    } else switch (ability) {
      case 'q': animate = impact(root, this.geometries, mats, effect, hero, radius); break;
      case 'e': animate = utility(root, this.geometries, mats, effect, hero, radius); break;
      case 'w':
      case 'r': animate = area(root, this.geometries, mats, hero, radius, ability === 'r'); break;
      default: animate = attack(root, this.geometries, mats); break;
    }
    animate(0);
    this.scene.add(root);
    this.views.set(effect, { root, materials: mats, duration: effect.life, age: 0, animate });
  }

  private remove(effect: Effect, view: EffectView): void {
    this.scene.remove(view.root);
    for (const mat of Object.values(view.materials)) mat.dispose();
    this.views.delete(effect);
  }

  clear(): void {
    for (const [effect, view] of this.views) this.remove(effect, view);
    this.active.clear();
  }

  dispose(): void {
    this.clear();
    for (const geometry of Object.values(this.geometries)) geometry.dispose();
  }
}

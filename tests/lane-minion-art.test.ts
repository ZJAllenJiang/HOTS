import {Mesh} from 'three';
import {describe, expect, it} from 'vitest';
import {createLaneMinionArt} from '../src/lane-minion-art';

describe('lane sentry art', () => {
  it('shares the kit geometry and keeps poses independent', () => {
    const art = createLaneMinionArt();
    const first = art.instantiate(0, 1);
    const second = art.instantiate(0, 2);
    const axe = (root: typeof first.root) => root.getObjectByName('Axe arm') as Mesh;
    expect(axe(first.root).geometry).toBe(axe(second.root).geometry);
    expect(axe(first.root).material).toBe(axe(second.root).material);

    const idle = axe(second.root).rotation.x;
    first.attack();
    first.update(0, .084);
    expect(axe(first.root).rotation.x).toBeLessThan(idle - 1);
    expect(axe(second.root).rotation.x).toBe(idle);
    first.update(0, .3);
    expect(axe(first.root).rotation.x).toBeCloseTo(idle);
    art.dispose();
  });

  it('keeps a boot planted during the gait and alternates lifted feet', () => {
    const art = createLaneMinionArt();
    const sentry = art.instantiate(1, 4);
    const boots: Mesh[] = [];
    sentry.root.traverse(object => {
      if (object instanceof Mesh && object.name === 'Boot') boots.push(object);
    });
    expect(boots).toHaveLength(2);
    const ground = boots[0].position.y;
    const lifted = new Set<Mesh>();
    for (let i = 0; i < 120; i++) {
      sentry.update(1.8, 1 / 120);
      expect(Math.min(...boots.map(boot => boot.position.y))).toBeCloseTo(ground);
      for (const boot of boots) if (boot.position.y > ground + .1) lifted.add(boot);
    }
    expect(lifted.size).toBe(2);
    art.dispose();
  });
});

import { describe, expect, it } from 'vitest';
import { PROJECTILE_RULES } from '../src/projectiles';
import { ABILITIES, command, createGame, step } from '../src/sim';

describe('ranged Q projectiles', () => {
  it.each([['ranger', 190], ['frost', 220]] as const)('delays %s damage until the swept path reaches the target', (hero, amount) => {
    const state = createGame('training', hero);
    const [player, target] = state.units;
    command(state, { type: 'cast', key: 'q', x: 0, z: 0 });

    const [projectile] = state.projectiles;
    expect(projectile).toMatchObject({ sourceId: player.id, hero, x: -10, z: 0, launchTick: 3 });
    expect(state.effects).toHaveLength(0);
    step(state, .15);
    expect(state.time).toBeCloseTo(.15);
    expect(projectile.x).toBe(-10);
    step(state, .05);
    expect(projectile.x).toBeCloseTo(-8.8);
    step(state, .25);
    expect(state.time).toBeCloseTo(.45);
    expect(target.hp).toBe(target.maxHp);
    step(state, .05);
    expect(state.time).toBeCloseTo(.5);
    expect(target.hp).toBe(target.maxHp - amount);
    expect(state.projectiles).toHaveLength(0);
    expect(state.effects[0]).toMatchObject({ kind: 'shot', x: expect.closeTo(-1.7), z: 0 });
  });

  it('detects a glancing hit missed by both segment endpoints', () => {
    const state = createGame('training', 'ranger');
    const [player, target] = state.units;
    player.attackCooldown = 10;
    target.x = -9.4;
    target.z = 1.65;
    const travel = PROJECTILE_RULES.speed * .05;
    expect(Math.hypot(player.x - target.x, target.z)).toBeGreaterThan(PROJECTILE_RULES.hitRadius);
    expect(Math.hypot(player.x + travel - target.x, target.z)).toBeGreaterThan(PROJECTILE_RULES.hitRadius);

    command(state, { type: 'cast', key: 'q', x: 0, z: 0 });
    step(state, .2);
    expect(target.hp).toBe(target.maxHp - 190);
    expect(state.effects[0].x).toBeGreaterThan(player.x);
    expect(state.effects[0].x).toBeLessThan(player.x + travel);
  });

  it('hits the nearest contact even when a nearer center appears first in the roster', () => {
    const state = createGame('training', 'ranger');
    const [player, glancing, firstContact] = state.units;
    player.attackCooldown = 10;
    Object.assign(glancing, { x: -7.5, z: 1.65 });
    Object.assign(firstContact, { x: -7, z: 0 });
    const ally = { ...glancing, id: state.nextId++, team: player.team, x: -9.5, z: 0 };
    const dead = { ...glancing, id: state.nextId++, alive: false, hp: 0, respawn: 10, x: -9.5, z: 0 };
    const core = { ...glancing, id: state.nextId++, kind: 'core' as const, x: -9, z: 0, attackCooldown: 10 };
    const tower = { ...glancing, id: state.nextId++, kind: 'tower' as const, x: -30, z: 9 };
    state.units = [player, ally, dead, core, tower, glancing, firstContact];

    command(state, { type: 'cast', key: 'q', x: 0, z: 0 });
    step(state, .25);
    expect(firstContact.hp).toBe(firstContact.maxHp - 190);
    expect(glancing.hp).toBe(glancing.maxHp);
    expect(ally.hp).toBe(ally.maxHp);
    expect(core.hp).toBe(core.maxHp);
    expect(dead.hp).toBe(0);
    expect(state.projectiles).toHaveLength(0);
  });

  it('breaks simultaneous contacts by unit ID independently of roster order', () => {
    const state = createGame('training', 'frost');
    const [player, lowerId, higherId] = state.units;
    player.attackCooldown = 10;
    Object.assign(lowerId, { x: -7, z: -1.2 });
    Object.assign(higherId, { x: -7, z: 1.2 });
    state.units = [player, higherId, lowerId];

    command(state, { type: 'cast', key: 'q', x: 0, z: 0 });
    step(state, .25);
    expect(lowerId.hp).toBe(lowerId.maxHp - 220);
    expect(higherId.hp).toBe(higherId.maxHp);
  });

  it.each([0, .2])('credits a kill when the source dies at cast time + %s seconds', (deathTime) => {
    const state = createGame('battle', 'ranger');
    const player = state.units[0];
    const target = state.units.find(unit => unit.kind === 'hero' && unit.team === 1)!;
    state.units = [player, target];
    Object.assign(target, { hp: 1, x: -14, z: 0 });

    command(state, { type: 'cast', key: 'q', x: target.x, z: target.z });
    step(state, deathTime);
    Object.assign(player, { alive: false, hp: 0, respawn: 8 });
    step(state, .5 - deathTime);
    expect(player.alive).toBe(false);
    expect(target.alive).toBe(false);
    expect(player.kills).toBe(1);
    expect(state.teams[0]).toMatchObject({ kills: 1, xp: 160 });
  });

  it('discards a projectile if its source is removed from the roster', () => {
    const state = createGame('training', 'ranger');
    const [, target] = state.units;
    command(state, { type: 'cast', key: 'q', x: 0, z: 0 });
    step(state, .2);
    state.units = [target];

    step(state, .05);
    expect(state.projectiles).toHaveLength(0);
    expect(target.hp).toBe(target.maxHp);
    expect(state.effects).toHaveLength(0);
  });

  it.each(['ranger', 'frost'] as const)('bounds %s travel by ability range instead of aim distance', (hero) => {
    const state = createGame('training', hero);
    const [player, target] = state.units;
    state.units = [player, target];
    const range = ABILITIES[hero].q.range;
    target.x = player.x + range + PROJECTILE_RULES.hitRadius + .1;

    command(state, { type: 'cast', key: 'q', x: -8, z: 0 });
    step(state, .7);
    const [projectile] = state.projectiles;
    expect(projectile.x).toBeCloseTo(3.2);
    expect(projectile.distanceRemaining).toBeCloseTo(range - 13.2);
    step(state, .1);
    expect(state.projectiles).toHaveLength(0);
    expect(target.hp).toBe(target.maxHp);
    expect(state.effects).toHaveLength(0);
  });

  it('includes contact at the exact end of the final partial segment', () => {
    const state = createGame('training', 'ranger');
    const [player, target] = state.units;
    target.x = player.x + ABILITIES.ranger.q.range + PROJECTILE_RULES.hitRadius;

    command(state, { type: 'cast', key: 'q', x: 0, z: 0 });
    step(state, .75);
    expect(target.hp).toBe(target.maxHp);
    step(state, .05);
    expect(target.hp).toBe(target.maxHp - 190);
    expect(state.effects[0].x).toBeCloseTo(5);
  });

  it('rejects zero-length aim without spending mana, cooldown or an action cue', () => {
    const state = createGame('training', 'ranger');
    const [player] = state.units;
    const before = structuredClone(state);

    command(state, { type: 'cast', key: 'q', x: player.x, z: player.z });
    expect(state).toEqual(before);
  });

  it('freezes in-flight projectiles while paused and starts a reset without them', () => {
    const state = createGame('training', 'ranger');
    command(state, { type: 'cast', key: 'q', x: 0, z: 0 });
    step(state, .2);
    state.paused = true;
    const before = structuredClone(state);
    step(state, 10);
    expect(state).toEqual(before);
    const reset = createGame('training', 'ranger');
    expect(reset.projectiles).toHaveLength(0);
    expect(reset.effects).toHaveLength(0);

    state.paused = false;
    step(state, .3);
    expect(state.units[1].hp).toBe(state.units[1].maxHp - 190);
  });

  it('replays the same projectile trace on different frame boundaries', () => {
    const a = createGame('training', 'ranger');
    const b = createGame('training', 'ranger');
    for (let i = 0; i < 120; i++) {
      for (const state of [a, b]) {
        if (i === 0 || i === 100) command(state, { type: 'cast', key: 'q', x: 0, z: 0 });
        if (i === 2) command(state, { type: 'move', x: -10, z: 3 });
      }
      step(a, .05);
      step(b, .02);
      step(b, .03);
      expect(a).toEqual(b);
    }
    expect(a.units[1].hp).toBe(a.units[1].maxHp - 380);
  });
});

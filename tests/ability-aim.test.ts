import {Group, Mesh} from 'three';
import {expect,it} from 'vitest';
import {AbilityAim} from '../src/ability-aim';
import {PROJECTILE_RULES} from '../src/projectiles';
import {ABILITIES,createGame} from '../src/sim';

it('draws the ranged Q corridor at the simulation width and hides it for rejected casts',()=>{
  const state=createGame('training','ranger');
  const player=state.units[0];
  const preview=new AbilityAim();
  const corridor=preview.root.children.find(node=>node instanceof Group)!;
  preview.update(state,player,{key:'q',x:0,z:0});
  expect(corridor.visible).toBe(true);
  expect(corridor.rotation.y).toBeCloseTo(Math.PI/2);
  const [left,right,band]=corridor.children;
  expect(left.position.x).toBe(-PROJECTILE_RULES.hitRadius);
  expect(right.position.x).toBe(PROJECTILE_RULES.hitRadius);
  expect(band.scale.y).toBe(ABILITIES.ranger.q.range);
  preview.update(state,player,{key:'q',x:25,z:0});
  expect(corridor.visible).toBe(false);
  preview.dispose();
});

it('shows a legal area at the clamped target and clears it when aiming ends',()=>{
  const state=createGame('training','guardian');
  const player=state.units[0];
  player.x=32;
  const preview=new AbilityAim();
  preview.update(state,player,{key:'w',x:36,z:0});
  expect(preview.root.children.some(node=>node instanceof Mesh && node.visible && node.position.x===35 && node.scale.x===4.5)).toBe(true);
  preview.update(state,player,undefined);
  expect(preview.root.visible).toBe(false);
  preview.dispose();
});

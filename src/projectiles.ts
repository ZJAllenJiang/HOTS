import type { Projectile, Unit } from './contracts';

// Local prototype values. Three ticks at 20 Hz give a 0.15-second windup.
// Reuse the old Q half-width as the effective hit radius for each target.
export const PROJECTILE_RULES = Object.freeze({ windupTicks: 3, speed: 24, hitRadius: 1.7 });
const ROUNDING_TOLERANCE = 1e-9;

export function projectileContact(
  projectile: Pick<Projectile, 'x' | 'z' | 'dirX' | 'dirZ'>,
  target: Pick<Unit, 'x' | 'z'>,
  travel: number,
): number | undefined {
  const dx = target.x - projectile.x;
  const dz = target.z - projectile.z;
  const along = dx * projectile.dirX + dz * projectile.dirZ;
  const perpendicular = dx * projectile.dirZ - dz * projectile.dirX;
  const halfChordSquared = PROJECTILE_RULES.hitRadius ** 2 - perpendicular ** 2;
  if (halfChordSquared < -ROUNDING_TOLERANCE) return;

  const halfChord = Math.sqrt(Math.max(0, halfChordSquared));
  const entry = Math.max(0, along - halfChord);
  if (along + halfChord >= -ROUNDING_TOLERANCE && entry <= travel + ROUNDING_TOLERANCE) {
    return Math.min(entry, travel);
  }
}

# Experimental ranged Q projectile slice

## Spec coverage

Advances Hero Combat / Legal combat execution / Fast projectile crosses a target and the M0 projectile-readability work. The original M0 1.2/1.3 and M1 remain unchecked: browser visual acceptance, 20-vs-30 Hz comparison, map blocking, full hero rules and hardware measurements are not complete.

## Implemented behavior

Ranger and frost Q now have a 3-tick (150 ms at 20 Hz) windup, then straight travel at 24 world units/second. A sweep tests the whole movement segment against each legal target circle and chooses the earliest contact, with unit ID resolving exact ties. Damage occurs on contact, never from an animation callback. These experimental Qs stop on the first enemy; English and Chinese descriptions no longer claim piercing. Ranger range is 15, frost 14. Guardian Q and other abilities retain their existing behavior.

Allies, dead actors, the source itself and tower-protected cores are excluded. A committed shot persists after its source dies; a missing source removes it. Pause freezes authoritative and displayed flight. New games clear projectiles and visual IDs; core victory removes pending shots and freezes the outcome. Range expiry is bounded. Level/talent scaling follows the existing damage function at impact.

The 3D renderer has a charge orb, directional arrow/ice tip, tail and contact effect. It interpolates only between authoritative samples; visual interpolation never determines a collision. Shared mesh/material resources are disposed with the renderer.

## Evidence

- TypeScript check and 49 tests passed across 10 files.
- 14 projectile simulation cases cover delayed damage, glancing collision missed by endpoints, contact ordering, ties, legality, exact range endpoint, source death/removal, zero aim, pause/reset, deterministic traces and winner cleanup.
- Two CPU scene-graph tests cover charge-to-flight presentation, pause interpolation, expiry and reset with reused IDs. These are not browser screenshots.
- Three deterministic passive-player battle samples ended at 286.05 / 311.5 / 316.45 seconds (ranger/frost/guardian). First kill was 17.3 seconds; first tower roughly 182.65–182.70 seconds. These are narrow balance regression samples, not human playtest results.

## Limits

Effective hit radius is 1.7 for every target, preserving the old Q lane tolerance as a prototype parameter. Targets are sampled after unit updates; relative-motion sweeps for moving targets, terrain collision and native hero-specific hitboxes remain outstanding. No original HOTS build has been pinned. The available cloud browser lacks WebGL 2, so visible flight, dodge readability, GPU performance and physical Mac/Windows acceptance remain pending. The mesh and texture assets are unchanged.

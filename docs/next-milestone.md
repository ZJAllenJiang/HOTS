# Next milestone: fidelity and input acceptance

The shipped local simulation is a technical prototype, not completion of original M0–M3.

1. Browser acceptance: training and battle; all three archetypes; right-click movement and enemy targeting; QWER, cooldown/cost, pause, reset; desktop and narrow viewport; no fatal console error. Record observed results, not inferred claims.
2. Input feedback: targeting range and valid/invalid cast indicators, enemy mesh hit testing, camera options, error/retry controls.
3. Art gate: identify redistributable assets or user-supplied authorized source; pin source/hash/license; validate scale, rig, idle/run/cast/death clips and normal gameplay screenshots. Jaina now uses an audited community port; ranger and guardian remain procedural placeholders. Neither the imported model nor placeholder geometry has completed the native HOTS browser fidelity gate.
4. Rules gate: choose exact upstream content build; data-driven original hero ability/talent fixtures, map collision/structures, XP and ARAM rules. Compare implementation against fixtures before claiming parity.
5. Network gate: server-authoritative simulation and protocol; room admission, validation, reconnect/bot takeover, two-browser consistency and latency tests. Static hosting currently runs one browser's local simulation only.

Each gate must have evidence in implementation-status.md and a source commit. Do not check off original OpenSpec tasks solely because a simplified prototype exists.

## Active spec slice: ranged Q projectiles

See `openspec/changes/projectile-combat/` for the experimental first-hit rule and validation scope. This advances the legal-combat swept-path scenario and M0 projectile readability work. It does not complete M0, validate 30 Hz, implement map navigation blockers or unlock roster expansion. After this slice, keep browser visual acceptance and targeting/invalid-cast feedback ahead of six-hero expansion and multiplayer.

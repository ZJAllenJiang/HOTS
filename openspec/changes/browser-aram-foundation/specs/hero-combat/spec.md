# Hero Combat

## Purpose

Provide consistent hero abilities, shared team experience and talent choices across practice, online play and automated verification, preserving the selected source rules rather than replacing them with an item-shop MOBA.

## ADDED Requirements

### Requirement: Shared team progression
Experience rewards SHALL contribute to the earning team's shared experience. Living and dead teammates SHALL have the same team level and corresponding talent-tier eligibility.

#### Scenario: Experience unlocks a tier
- **WHEN** a team's experience reaches a new talent tier
- **THEN** every teammate receives the same level and tier availability, including a teammate awaiting respawn.

### Requirement: Complete eligible hero kits
Each eligible M2 hero SHALL implement all base abilities, trait behavior, heroic choices and talents allowed by the fixed source build and mode. Map-specific exclusions SHALL be explicit. Incomplete heroes SHALL remain experimental rather than silently omitting source talents.

#### Scenario: Heroic choice becomes available
- **WHEN** a player reaches the required heroic tier and selects an allowed option
- **THEN** that option becomes available under its resource/cooldown rules and mutually exclusive choices cannot also activate.

### Requirement: Legal combat execution
Ability outcomes SHALL respect target legality, range, cooldown, resources, crowd control and the chosen ruleset. Effect timing SHALL not depend on render frame rate or animation completion callbacks.

#### Scenario: Cast is illegal
- **WHEN** a stunned or dead actor requests an ability prohibited in that state
- **THEN** no illegal effect is produced and the rejection does not mutate another actor's state.

#### Scenario: Fast projectile crosses a target
- **WHEN** a projectile crosses a valid target between simulation updates
- **THEN** collision is resolved according to its swept path rather than being skipped due to update spacing.

### Requirement: Reproducible match outcomes
The same ruleset, seed and accepted inputs SHALL produce matching authoritative state on the pinned server runtime. Exact re-simulation replay SHALL only be enabled for browser/runtime combinations that pass cross-host state parity. Unsupported replay/content versions SHALL be rejected explicitly.

#### Scenario: Repeated server simulation
- **WHEN** a fixed trace is replayed on the pinned server runtime
- **THEN** ordered authoritative state hashes agree at every checked simulation step.

#### Scenario: Cross-host parity fails
- **WHEN** a browser produces different hashes from the server trace
- **THEN** exact re-simulation replay is disabled for that combination while authoritative online play and snapshot/event replay remain available.

### Requirement: Bots follow observable rules
Bots SHALL act through the same legal command rules as humans and use only information available to their team. Healer and damage-role bots SHALL support their roles in a complete match.

#### Scenario: Enemy becomes hidden
- **WHEN** an enemy leaves team vision
- **THEN** bots cannot use its unobserved current position to issue targeted abilities.

### Requirement: Traceable source data
Playable content SHALL identify its source build and ruleset version. Imported incremental data SHALL be reconstructed from the appropriate base before applying same-build battleground overrides.

#### Scenario: Data dependency is missing
- **WHEN** an import lacks a required base or patch dependency
- **THEN** content generation fails clearly rather than publishing partially reconstructed hero values.

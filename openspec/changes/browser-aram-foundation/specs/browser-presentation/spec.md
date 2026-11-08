# Browser Presentation

## Purpose

Provide a clear, controllable desktop browser game with recognizable heroes, readable combat and reliable loading, while distinguishing temporary visual placeholders from accepted production-quality content.

## ADDED Requirements

### Requirement: Browser-native play
Supported desktop browsers SHALL run the game without a native game installation. Unsupported rendering capabilities SHALL produce a useful compatibility message rather than an empty screen.

#### Scenario: Unsupported graphics capability
- **WHEN** required browser graphics support is unavailable
- **THEN** the page explains the requirement and offers a return path without starting a broken match.

### Requirement: Clear visuals and controls
Accepted heroes SHALL have readable silhouettes, required action animations, legible HUD text and distinguishable enemy/allied effects at normal game zoom. The game SHALL support movement/attack, attack-move, stop, ability keys, trait and camera recentering.

#### Scenario: Team fight at normal zoom
- **WHEN** ten heroes fight at the target desktop resolution
- **THEN** the player can identify the controlled hero, health, important ground warnings and skill cooldowns without entering a close-up showcase view.

#### Scenario: Visual placeholder is present
- **WHEN** a hero uses placeholder visuals
- **THEN** the build is labelled a development slice and cannot be counted as passing final visual fidelity acceptance.

### Requirement: Reliable versioned loading
The client SHALL load the selected match's mandatory assets before declaring readiness, verify their version/hash, show progress, and expose retry or return actions on failure.

#### Scenario: Asset request fails
- **WHEN** a mandatory model or animation cannot load
- **THEN** the client does not report ready and offers a visible recovery path.

### Requirement: Quality degradation preserves readability
Quality settings SHALL prioritize readable text, selection feedback and ability warnings. Automatic reductions SHALL prefer shadows, particles and background detail before reducing rendering resolution.

#### Scenario: Frame budget is exceeded
- **WHEN** performance falls below the selected quality budget
- **THEN** quality can be reduced without making HUD text or critical combat boundaries unreadable.

### Requirement: Evidence-based visual acceptance
Visual acceptance SHALL include normal-view and close-up images, action footage, resource sizes and performance measurements on recorded hardware/browser versions. Production assets SHALL have recorded sources and distribution basis.

#### Scenario: Asset is proposed for release
- **WHEN** a new asset enters a release manifest
- **THEN** its source, processing version, hash, required animations and release eligibility are recorded before publication.

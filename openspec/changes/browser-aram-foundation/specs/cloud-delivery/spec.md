# Cloud Delivery

## Purpose

Make game development, verification and delivery possible from a browser-accessible cloud environment, with reproducible builds and a clear separation between temporary development previews and persistent online match hosting.

## ADDED Requirements

### Requirement: Cloud development without local setup
The repository SHALL describe a reproducible cloud development environment capable of editing, building and running checks without requiring the user to install a local game editor or runtime.

#### Scenario: Fresh cloud environment
- **WHEN** a contributor opens the documented environment from a clean checkout
- **THEN** the project can install pinned dependencies, run checks and expose the development game through a browser preview.

### Requirement: Appropriate runtime hosting
Practice-only builds SHALL be deployable as static assets. Online builds SHALL use a runtime verified to support persistent authoritative simulation and public secure WebSocket connections.

#### Scenario: Online deployment target is static-only
- **WHEN** a deployment has no authoritative room runtime
- **THEN** the release cannot claim that online play is available.

### Requirement: Traceable immutable releases
Each release SHALL identify its source commit, protocol/content versions, asset manifest hash and immutable build artifact. A running match SHALL retain its chosen rules/content until completion.

#### Scenario: New content is published
- **WHEN** a release changes hero definitions
- **THEN** existing matches keep their original definitions and new clients cannot silently mix them with the new release.

### Requirement: Verification before publishing
Production releases SHALL pass applicable type/build, simulation, content/asset and multi-client checks. Performance and capacity claims SHALL include measurements rather than relying on framework selection or advertised host specifications.

#### Scenario: Capacity is reported
- **WHEN** a release states supported concurrent rooms
- **THEN** it links the tested hardware, scene, duration, tick-time distribution and observed resource use.

### Requirement: Coordinated rollback
The deployment workflow SHALL support draining and rollback of compatible client, server and content artifacts together. At least two release versions of assets SHALL remain available.

#### Scenario: Release fails verification
- **WHEN** a new release fails health or functional checks
- **THEN** operators can restore the last verified client/server/content set without leaving mixed versions publicly active.

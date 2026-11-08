# Online Rooms

## Purpose

Allow friends to play one shared authoritative match in private browser rooms with bot-filled seats, bounded reconnection and explicit failure handling, without requiring a full ranking or account platform.

## ADDED Requirements

### Requirement: Private shared matches
The service SHALL allow creation and joining of private rooms for one to ten humans, with remaining playing seats filled by bots. Room discovery codes SHALL not grant control of another player's seat.

#### Scenario: Friend joins a room
- **WHEN** a visitor supplies a valid room code and receives a seat
- **THEN** the visitor controls only that seat using its separate session identity.

### Requirement: Server authority and input limits
The server SHALL decide movement legality, damage, progression and results. Commands SHALL be validated, deduplicated by sequence and bounded to the configured rate/size limits; the initial limits are 30 commands per second per seat and 8KiB per message.

#### Scenario: Duplicate cast request
- **WHEN** a client resends an already accepted command sequence
- **THEN** it does not generate another ability effect or consume resources again.

#### Scenario: Forged damage or identity
- **WHEN** a client supplies a claimed damage outcome or another seat's identity
- **THEN** the server does not accept it as authoritative state.

### Requirement: Team-limited synchronization
Snapshots SHALL contain authoritative state scoped to the receiving team's visibility, with ordering/version metadata. Missing baselines SHALL trigger full resynchronization.

#### Scenario: Snapshot baseline is missing
- **WHEN** a client cannot apply a delta to a known baseline
- **THEN** it requests a full snapshot instead of continuing with corrupted state.

### Requirement: Loading barrier and version agreement
Clients SHALL share compatible protocol and content versions. Loading SHALL wait for required readiness for at most 60 seconds; unready seats SHALL be replaced with bots and informed of reconnect options.

#### Scenario: Client uses incompatible content
- **WHEN** a client attempts to join with an incompatible version
- **THEN** joining is rejected with a refresh instruction, rather than starting a mixed-version match.

### Requirement: Bounded seat reconnection
Disconnected humans SHALL receive AI takeover after five seconds and a 60-second seat reservation. Successful reconnect SHALL restore a full snapshot and sole seat control; expiration SHALL leave that seat controlled by AI for the match.

#### Scenario: Player reconnects within reservation
- **WHEN** the valid seat identity reconnects before its reservation expires
- **THEN** it receives current state, reclaims control and any previous control connection becomes invalid.

### Requirement: Explicit interruption semantics
The initial release SHALL not claim to preserve live matches across process loss. Planned releases SHALL drain active rooms before replacement; unexpected loss SHALL be communicated as interruption.

#### Scenario: Planned deployment begins
- **WHEN** the service enters draining mode
- **THEN** it stops accepting new matches and allows existing matches to finish within the documented drain deadline.

# Single-lane Battle

## Purpose

Provide a complete browser-based five-versus-five single-lane match, from hero selection to a shared victory result, with explicit small-roster rules and without a three-lane item economy.

## ADDED Requirements

### Requirement: Complete five-versus-five match
The game SHALL provide ten seats divided into two teams, fill unoccupied playing seats with bots, and finish the match when an enemy core is destroyed. The result SHALL be resolved once.

#### Scenario: Human starts a practice match
- **WHEN** one human starts practice
- **THEN** nine bot seats fill and the match can progress through structure destruction to a result screen.

#### Scenario: Core is destroyed
- **WHEN** damage destroys one core during a running match
- **THEN** the opposing team wins and subsequent combat cannot change that recorded result.

### Requirement: Explicit single-lane ruleset
The game SHALL use a versioned single-lane ruleset with shared team progression, defensive structures, replenishment objectives, and no gold/item shop. The selected map and content version SHALL be fixed for the match.

#### Scenario: Match content is selected
- **WHEN** a match begins
- **THEN** all seats use the same map and content version until its result, including mode-specific overrides.

### Requirement: Limited-roster selection
The M2 selection SHALL offer three distinct eligible heroes per seat with a 30-second selection window. Each team SHALL have at least one seat with a healer candidate. Cross-seat duplicate picks SHALL be allowed and disclosed for the initial small roster.

#### Scenario: Player does not choose
- **WHEN** the selection timer expires without a valid choice
- **THEN** a deterministic eligible choice fills the seat and selection advances.

#### Scenario: Experimental hero exists
- **WHEN** candidate lists are generated
- **THEN** heroes with unverified or unavailable required abilities/talents are excluded from the eligible pool.

### Requirement: Readable victory and recovery
The game SHALL display the match result and offer a way to return or play again. Server failure SHALL be displayed as interruption rather than invented victory or defeat.

#### Scenario: Server stops during play
- **WHEN** the match server is unavailable beyond reconnect handling
- **THEN** the client explains that the match was interrupted and permits leaving the failed match.

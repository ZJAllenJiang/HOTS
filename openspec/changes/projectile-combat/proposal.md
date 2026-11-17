# Experimental ranged Q projectile slice

Advance browser-aram-foundation M0 1.2/1.3 and Hero Combat's fast-projectile scenario without expanding the unaccepted hero roster. Ranger/frost Q currently apply immediate line damage and show a target-area burst. Replace this with simulation-owned windup, straight travel and first-contact swept collision, plus presentation-only charge/bolt/impact visuals.

This is an explicitly experimental rule change: ranged Q now hits the first legal enemy rather than every enemy in a line. UI descriptions must match. Prototype values do not claim HOTS build fidelity. Guardian Q and other abilities retain current behavior. Original hero data, native impact timing, map blocking and relative-motion collision against targets moving within the same tick remain separate acceptance work.

Damage must not depend on render frames or animation callbacks. Pause, winner freeze, reset, expiry, source attribution, target legality and deterministic tie ordering require regression coverage. Visual WebGL acceptance remains pending in the current environment.

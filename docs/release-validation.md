# Prototype release validation — 2026-11-08

## Delivered

Private URL: https://hots-aram-lab.zjallenjiang.chatgpt.site/

Runtime source: `bba0562acc812ddbe8d90abf801759890f48bfab`.
Deployment: `appgdep_6af0007862f481919ac3aca334ad3a6a`, status **succeeded**.
Saved version: `appgprj_6aedf88c8b108191917a049f4b70cbea~appgver_8813a904a7188191a9a1f8e7e064be8c`.
The production URL presents the expected ChatGPT sign-in gate in the unsigned-in QA browser. Private access was preserved; no account permissions were expanded.

## Automated evidence

- Final source typecheck passed.
- All 10 simulation tests passed: deterministic fixed stepping, pause guards, cost/range/cooldown and heroic gate, movement/stop/bounds, dummy and player respawn, talents, core protection/victory freeze, and three autonomous hero-roster runs reaching a winner.
- Production build passed. JS 534.39 kB (142.96 kB gzip), CSS 23.97 kB (6.30 kB gzip). Nonblocking Vite chunk-size warning remains.
- Earlier GitHub Actions runs for `0a74ff0` succeeded. These do not establish latest-head CI success; consult PR checks for the current commit.

## Browser evidence

On the final local preview at desktop 1363 × 936:

- Lobby displayed and hero selection changed from ranger to frost and guardian.
- Frost battle started; allied heroes, minions, tower and core rendered in Canvas fallback; kill counters advanced during AI combat.
- Esc opened pause, restart reset the clock and health/mana, and return-to-lobby allowed selecting another hero/mode.
- Frost E consumed mana and displayed cooldown.
- Guardian training began with correct 1550 HP, 450 mana, level 1, zero kills, three dummies and R locked at level 3.
- Earlier prototype preview also verified ranger right-click movement and Q mana/cooldown; latest runtime retains those simulation/input modules.

## Limits and next gates

WebGL is disabled in the QA browser. Therefore **3D appearance, animation and GPU performance remain unverified**. Canvas fallback is a compatibility feature, not evidence of the intended HOTS visual fidelity. Mobile viewport/touch and complete match-through-victory browser acceptance are not claimed; automated simulation covers victory logic.

This is one local browser simulation with experimental hero mechanics and procedural art. Original HOTS assets/kits, map collision, full talents and network rooms are not implemented. Initial WebGL startup failure falls back; mid-session context-loss recovery remains a follow-up. Invalid casts currently lack explanatory feedback. PR #2 remains draft until these wider acceptance gaps are addressed.

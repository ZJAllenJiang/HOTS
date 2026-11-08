# 3D-only correction release — 2026-11-08

Version 2 deployed successfully to https://hots-aram-lab.zjallenjiang.chatgpt.site .

- GitHub runtime commit: `8efbab88128317d4735c32e7cd5132e903d3c7b1`.
- Site source commit: `d75673c4de51259ecb95d1ab0eaeb0aec2e6229f` (same application source).
- Deployment: `appgdep_6af01ef8b2e48191844d43496b0735fe`, **succeeded**.
- Version: `appgprj_6aedf88c8b108191917a049f4b70cbea~appgver_81490392f5148191aaba6b9b83bc1a95`.
- GitHub Actions run `42457250932`: **success** on the runtime commit.
- TypeScript, 21 tests and production build passed. JS 646.17 kB (174.19 kB gzip), CSS 25.61 kB (6.74 kB gzip); Vite chunk-size advisory remains.
- Site access was observed as public before this release and preserved. No access configuration was changed by this correction.

The 2D renderer is deleted. WebGL 2 failure/context loss stops play; browser QA verified the recovery screen and reload while WebGL was disabled. **Actual 3D appearance, real hero assets, physical Mac/Windows controls and GPU performance remain unverified.** Synthetic GLB tests verify independent skeleton instances, animation switching and resource lifecycle, not artistic fidelity.

See [correction details](changes/2026-11-08-3d-correction.md) and [PR #3](https://github.com/ZJAllenJiang/HOTS/pull/3). The real-model source bundle remains the first unfinished acceptance gate. PR #2 was already merged before this correction; PR #3 tracks the new changes separately.

The source-opening issue was a shallow remote rejecting updates to shallow roots. A credential-scoped fetch with `--update-shallow` prepared the local shallow boundary; the standard Site helper then opened, built, committed, pushed and packaged successfully. No remote history was rewritten.

---

## Historical version 1 evidence (superseded where changed above)

### Prototype release validation — 2026-11-08

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

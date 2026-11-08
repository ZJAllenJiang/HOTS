# 3D-only correction and asset gate

The user's acceptance criteria supersede the old fallback decision: the game is 3D only, hero resemblance is the first gate, combat must have readable pacing, and Mac/Windows desktop controls must work. The old 2D compatibility renderer is deleted. This change does not complete the HOTS recreation.

## Implemented correction

- WebGL 2 is required. Initialization failure or context loss pauses/stops simulation and displays a Chinese recovery screen with reload. No Canvas fallback remains.
- Mouse right-click and macOS Control-click move/attack. Trackpad mode additionally supports primary-click movement. Browser modifier shortcuts and key repeats do not cast abilities. Wheel line/page units are normalized and spikes capped.
- Low/balanced/high use 1/1.5/2 pixel ratio caps, no/1024/2048 shadows. Settings survive reload where browser storage is available. These are selectable presets, not measured automatic performance tuning.
- Actual GLB geometry can replace each hero slot. Skeleton-aware clones, normalized ground placement/height, animation mixers and idle/run/attack crossfades are implemented. Shared assets and individual mixers are disposed when replaced.
- Local GLB import is session-only, never uploaded. Only self-contained GLB 2.0 with embedded PNG/JPEG is supported in this slice. DDS, TGA, KTX2, external resources and unsupported required compression extensions get an explicit error. A 32 MiB cap prevents accidentally importing oversized raw exports.
- `src/model-manifest.json` reserves Raynor/Jaina/Muradin slots. Empty URLs mean **source model missing**, not completed models. The existing generic hero kits remain experimental and the UI identifies procedural models as placeholders.

## Pacing change

| Parameter | Before | After |
| --- | --- | --- |
| First minion wave | first simulation tick | 12 seconds |
| Wave spacing | 13 seconds | 30 seconds |
| Minion movement | 3.2 units/s | 1.8 units/s |
| Minion HP | 260 | 620 |
| Minion attack | 24 per 1.2 s | 18 per 1.65 s |
| Tower/core HP | 1800 / 2600 | 12000 / 18000 |
| Ranger/frost/guardian HP | 1050 / 950 / 1550 | 1800 / 1650 / 2900 |
| XP per prototype level | 300 | 1000 |
| AI casting | whole kit in one tick | one successful cast per 1.6 s |

Simulation still ticks at 20 Hz and player movement/cast response is unchanged. These values are tuning parameters, not claims of original HOTS numbers. No global slow-motion time scale was added.

Passive-player deterministic samples (one idle player and nine bots; not real-match averages):

| Player slot | Old end | New first kill | New first tower | New end |
| --- | --- | --- | --- | --- |
| Ranger | 87.00 s | 17.30 s | 126.05 s | 246.20 s |
| Frost | 102.95 s | 17.30 s | 127.65 s | 246.05 s |
| Guardian | 86.70 s | 17.30 s | 123.95 s | 279.35 s |

Longer player-driven matches, positioning, readable attack windups, collision and projectile travel remain work. Increasing health does not substitute for these systems.

## Real-model pipeline and current blocker

Primary converter: https://github.com/AestroFidelium/m3-to-glb (docs https://docs.rs/crate/m3-to-glb/0.2.0).
Alternative authoring/import tool: https://github.com/SC2Mapster/m3addon.

The converter can process M3 meshes, skins and animation clips; it does not supply game models. Its own documentation states that game files are not distributed with its tests. The repo currently has no actual Raynor/Jaina/Muradin M3 or GLB, companion M3A, or referenced texture bundle. That input is the current blocking dependency for fidelity, not a choice between Three.js and Unity.

Required first bundle: one fixed-build base hero, all referenced textures, companion animation files, source/build/provenance record. Start with one complete Raynor or Jaina rather than adding more generic heroes.

Cloud conversion workflow (once source inputs exist):

1. In a cloud build job pin converter 0.2.0, record input checksums and game build.
2. Convert source DDS/TGA textures to PNG, preserving alpha and normal-map semantics. Verify texture suffix matching; the converter documents DDS/TGA passthrough, which this browser loader deliberately rejects.
3. Run `m3-to-glb hero.m3 -t textures-png/ -a hero_anims.m3a -o hero.glb --max-tex-size 2048 --no-fx` (repeat `-a` if needed). The command is documented upstream but has not been executed on a HOTS model here.
4. Inspect the self-contained GLB via the in-game import panel. Check normal/close camera, orientation, alpha hair/cape, base colour, normals, emissive and idle/run/attack. Particle extras do not render automatically: recreate those effects separately.
5. For a persistent reviewed asset, put the file at `public/models/<hero>/base.glb`, record its SHA-256 and source provenance, and fill that hero's manifest URL. Do not rename a generic model to make this gate appear complete.
6. Profile one hero and ten actors on real Mac and Windows hardware. Capture normal-camera and close-camera screenshots and clips before declaring the model accepted.

Unity WebGL would still require the same source models, texture conversion and visual QA. Retain the current browser renderer for this gate; reassess engine costs after an actual hero is measured.

## Verification boundary

Cloud preview browser reports WebGL disabled; verified the 3D-required screen and reload behavior. Actual 3D rendering, imported HOTS assets, GPU memory, Mac/Windows native browser behavior and FPS remain unverified. Never describe the missing-model gate as passed because unit tests or builds succeed.

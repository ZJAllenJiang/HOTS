# Jaina HotS community port conversion — audited candidate

This folder converts one acquired Warcraft III MDX800 community port of the actual HotS Jaina mesh, skin and skeletal clips into one self-contained glTF2 binary. It is a model candidate, not the native HotS asset pipeline or an authoritative HotS ability kit.

Frozen output: `jaina-hots-body.glb`, 2,861,560 bytes. SHA256: `c202b9f858e1bd7b618c14ddc98302814fd8144a2cd88038d63b78f73024a500`.

## Reproduce

Requires Node20+ and Python3 with NumPy/Pillow for the optional CPU image.

```bash
npm ci
node convert-jaina.cjs '/path/to/Jaina Proudmoore/JainaSD+.mdx'
node validate-gltf.cjs
node validate-jaina.cjs '/path/to/Jaina Proudmoore/JainaSD+.mdx'
python render-jaina.py
```

The `JainaSD+.blp` high-resolution texture must be beside the source MDX. The converter's optional second argument chooses a different GLB output path. Validators intentionally read the default output in this folder. No Blender, browser, WebGL, external GPU or proprietary tools are needed. Pinned packages: war3-model4.0.1 (MDX/BLP parser), pngjs7.0.0, Three0.180.0, Khronos gltf-validator2.0.0-dev.3.10. `package-lock.json` pins dependencies. Do not copy node_modules into the app.

## What was preserved

Seven opaque body geosets, 7,255 original vertices and 10,537 original triangles; original vertex groups represented by equal-weight skinning (up to four influences per vertex); 50 body bones plus two hierarchy helpers; all38 source sequence names, durations, translation/rotation/scale keys. Boundary samples hold the first/last key inside each source sequence; absent per-sequence tracks use MDX identity defaults. This matches war3-model's sequence-scoped evaluation. One decoded1024×1024 PNG is embedded in the GLB; no external image or buffer URI. The clothing, face, hair, armor, cloak and staff texture are included.

Source coordinate axes are +X forward, Z up. Outer quaternion[-.5,-.5,-.5,.5] maps source +X to output +Z, source +Y to output +X, source +Z to output +Y. Outer scale is0.01. Physical units are unverified; the app may normalize height independently. Foot placement is determined by the app's minY normalization.

## Validation and corrections

Official Khronos validator: zero errors, warnings, infos or hints (`jaina-hots-body.validator.json`). Three r180 GLTFLoader successfully decodes the GLB. Numeric asset QA uses pngjs to decode its image without WebGL, and compares GLTFLoader skinned vertices against independent original MDX matrices at five times per clip:1,378,450 vertex comparisons. All38 clips load; idle, Walk and Attack1 have nonzero motion.

The source includes non-unit quaternions. glTF requires unit quaternion rotations, so the converter normalizes keys and flips equivalent quaternion signs for continuity. Worst source quaternion norm error is0.0031218895;368 keys differ from unit norm by more than1e-5. Max vertex deviation against normalized source evaluation is0.0000734816 source units (7.34816e-7 after0.01 scaling). Against raw source matrices it is0.701379647 source units (0.00701379647 after scaling), in Spell Channel Three. Required Stand1/Walk/Attack1 deviations from raw source are at most0.000124216 source units. Therefore no exact lossless animation claim is made. See `jaina-hots-body.numeric.json` for each clip.

All nonzero normals are normalized. Three zero normals on source vertices unused by any triangle are replaced with source +Z; original vertex/triangle counts remain unchanged. The script rejects a referenced zero normal, unsupported skin weights, non-linear source tracks or inheritance flags instead of silently approximating them.

`jaina-hots-body-cpu-qa.png` is an offline CPU texture/skinning inspection: stand front, stand three-quarter and Walk midpoint, loaded from converted GLB poses. Visible body, face, cloak and staff UV placement and orientation were inspected. It is an orthographic software preview with simple lighting, not a browser gameplay screenshot, WebGL acceptance test, original engine material match or performance measurement.

## Exclusions and limits

Three replaceable team-glow geosets (22 vertices/10 triangles), nine Warcraft III particle emitters, sounds/events, one camera and collision volumes are excluded. No replacement effects were invented. The original model references missing stock WC3 Clouds8x8/LightningBall/snowflake textures; no missing external references remain in the GLB. The original uploader notes imperfect staff positioning in some added WC3 animations and portrait shading limitations; these are not independently corrected. No claim of full native HotS spell effects or native HotS clip fidelity.

## Provenance and credits

Source ZIP: `jaina-hots-bundle.zip`, SHA256`68e82b0197b94bdbb3d28063b01b7af7994af8f3117752528c31ec35165760de`.
Source MDX SHA256`bc2792ef0d03cf95e94838e1563f6c28f04a7e54c6e5cc114f0cafaca71c67a8`.
Original supplied `readme.html` is preserved verbatim as `source-readme.html`.
Credits: Blizzard Entertainment (HotS base), Razorclaw_X (prior WC3 port), JohnWalk (uploader/modifications); Stefan.K for Jaina Dreadlord Spell Slam and Magna Aegwynn Spell Stand Channel source animations. Consult the source readme for original use conditions. Conversion does not grant additional rights to the original artwork.

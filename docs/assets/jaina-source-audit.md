# Jaina actual-model source audit

**Acquisition passed; visual/animation fidelity gate remains pending.** No game repository edits or publication were performed by this audit.

Retrieved: 2026-11-08 UTC. Source: https://www.hiveworkshop.com/threads/jaina-proudmoore-hots-with-new-animations.363866/

The current public page and its fresh normal Legacy download link succeeded with HTTP 200. An earlier indexed token returned 403; no access restriction was bypassed. The downloaded ZIP is actual MDX geometry, animation, and BLP textures, not screenshots. Temporary token URLs are omitted because they expire.

## Acquired source

| File | Bytes | SHA-256 |
|---|---:|---|
| `jaina-hots-bundle.zip` | 2,696,912 | `68e82b0197b94bdbb3d28063b01b7af7994af8f3117752528c31ec35165760de` |
| `JainaSD+.mdx` | 649,898 | `bc2792ef0d03cf95e94838e1563f6c28f04a7e54c6e5cc114f0cafaca71c67a8` |
| `JainaSD+.blp` | 296,902 | `1a26390e7e416cbb52e0608975702f44ec42e1cb3a1c6d996ab5a840c5d1da3c` |

Base path: `jaina-hots-bundle/Jaina Proudmoore (HotS with new animations)/Jaina Proudmoore/` beside this audit. Archive also includes TeamColor, separate portrait variants, an optional lower resolution BLP, and `readme.html` containing source description and credits.

The base MDX is `MDLX`, format version 800. Its main BLP1 diffuse texture is 1024×1024 RGB and decodes with Pillow. Parsed geometry: 10 geosets, 7,277 vertices, 10,547 triangles; 53 bones, 2 helpers, 80 total nodes. Seven body geosets use the supplied Jaina texture: 7,255 vertices / 10,537 triangles. Three other geosets are stock Warcraft III replaceable team glow: 22 vertices / 10 triangles. Counts independently checked by the conversion probe.

## Provenance and fidelity limits

The uploader is JohnWalk, while the page credits Blizzard Entertainment for the Heroes of the Storm character. JohnWalk identifies the source as Razorclaw_X's prior Warcraft III port: https://www.hiveworkshop.com/threads/hots-jaina-proudmoore-alts.331941/ . That original page is accessible and lists the base `Jaina.mdx` (10,549 polygons) and alternate skins. This audit did not acquire a second source archive from that page; its ordinary Download endpoint returned a server ZIP-generation status page.

This acquired model is a modified Warcraft III port, not an untouched native HotS M3. The body geometry and diffuse preserve the HotS character, but added animation clips borrow from Warcraft III Classic/Reforged Jaina and Paladin, HotS Jaina, Stefan.K's Jaina Dreadlord, and Stefan.K's Magna Aegwynn. The readme acknowledges imperfect staff positioning in some added clips and portrait face-shadow issues. JohnWalk permits modifications and requests author credit; this is contributor permission, not a verified license from Blizzard. No independent redistribution-rights determination was made.

Model texture references:

| MDX texture path | Present | Use / consequence |
|---|---|---|
| `JainaSD+.blp` | Yes, beside base MDX | Complete main character diffuse |
| Empty replaceable entry | No standalone file | Warcraft III team glow; omit or recreate |
| `ReplaceableTextures\Weather\Clouds8x8.blp` | No | Warcraft III stock particle/effect asset |
| `Textures\LightningBall.blp` | No | Warcraft III stock particle/effect asset |
| `Textures\snowflake.blp` | No | Warcraft III stock particle/effect asset |

## Animation sequences

The binary contains these exact 38 sequence names (including its source spelling):

1. `Stand - 1`
2. `Stand - 2`
3. `Stand - 3`
4. `Stand - 4`
5. `Stand Ready`
6. `Stand Victory`
7. `Walk`
8. `Attack - 1`
9. `Attack - 2`
10. `Attack - 3`
11. `Attack - 4`
12. `Attack - 5`
13. `Attack Slam`
14. `Spell One First`
15. `Spell One Second`
16. `Spell Two`
17. `Spell Three`
18. `Spell Four`
19. `Spell Five`
20. `Spell Throw One`
21. `Spell Throw Two`
22. `Spell Throw Three`
23. `Spell Throw Four`
24. `Spell Throw Five`
25. `Spell Slam One`
26. `Spell Slam Two`
27. `Spell Slam Three`
28. `Spell Slam Throw`
29. `Spell Channel One`
30. `Spell Channel Two`
31. `Spell Channel Three`
32. `Spell Channel Four`
33. `Death`
34. `Dissipate`
35. `Portrait - 1`
36. `Portrait - 2`
37. `Portrait Talk - 1`
38. `Portrait Talk - 2`

## Conversion status and alternative

Cloud conversion is being tested separately from this read-only acquisition audit. MDX skinning and BLP must become a GLB with embedded PNG/JPEG, the supported browser pipeline. Missing Warcraft III particle assets can be excluded while retaining the seven complete character body geosets. Rendering, limb deformation, staff placement, clip semantics, scale, and orientation still require a visual check before declaring hero fidelity passed.

For maximal source fidelity, native HotS `.m3` + companion `.m3a` clips + referenced `.dds` textures extracted from the game are the preferable source. No actual native Jaina M3 download was verified in this bounded audit. A concrete Linux-capable converter exists at https://github.com/AestroFidelium/m3-to-glb ; its primary documentation supports skeletons and companion clips but explicitly says game files are not published. It embeds DDS/TGA as-is unless texture inputs are converted first; this game's PNG/JPEG-only GLB path requires that conversion. Particle effects become `extras` and do not render in a plain glTF viewer. Existing https://github.com/SC2Mapster/m3addon is archived and warns it does not support Blender newer than 3.6; its recommended replacement is M3Studio.

**Current best usable source:** the acquired HotS-derived Jaina MDX+BLP bundle, pending the separate conversion/render gate. **Exact blockers for native-source fidelity:** no native Jaina M3/M3A/DDS source acquired; extraction requires game files. **Exact blockers for this bundle:** conversion/render verification and port-specific animation/material limitations above.

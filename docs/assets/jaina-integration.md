# Jaina community model integration

The first real character model is now integrated into the frost slot and selected by default. It replaces the procedural mage body with the acquired HotS-derived community Jaina port. The lobby portrait is a crop of the actual offline model render. The ranger and guardian remain procedural placeholders.

Body GLB: `public/models/jaina/jaina-hots-body.glb` (2,861,560 bytes), SHA256 `c202b9f858e1bd7b618c14ddc98302814fd8144a2cd88038d63b78f73024a500`. Main diffuse 1024×1024; 10,537 body triangles; 38 skeletal clips. All resources are embedded. Source attribution is adjacent in NOTICE.md and detailed in jaina-source-audit.md. Original contributor readme and reproducible pinned converter are in tools/model-conversion.

Evidence: official validator reports zero errors/warnings; independent Three.js skin comparison covers 1,378,450 vertices across all 38 clips. Offline textured CPU front/three-quarter/walk images were inspected. Application typecheck and 21 regression tests passed after integration. This supersedes the earlier statement that no hero source had been acquired.

Limits: this is a modified WC3 port, not native M3 fidelity. Some additional rotations are normalized, Warcraft III particle/glow layers are excluded, and gameplay skills remain the prototype frost kit. The UI explicitly labels the model trial. Default-load failure displays a visible warning before relying on a procedural 3D placeholder.

Actual browser 3D appearance, attack timing/clip synchronization, ten-actor GPU performance and physical Mac/Windows behavior still require acceptance. The CPU render is asset QA, not a gameplay screenshot or FPS measurement. Other heroes, native spell effects and original kits remain unfinished.

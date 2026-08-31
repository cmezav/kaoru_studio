# 3D Lighting Studio - Fase 3 GLB hotfix

Objective:
Replace the generated planar head with a user-selected GLB reference model.

Includes:
- file selector for a .glb planar head
- copies the asset to legacy/3d-lighting/assets/models/head_planes_reference.glb
- scene3d.js now loads the GLB through GLTFLoader
- keeps fallback generated head if the GLB cannot load
- unified material color controlled by the existing HEX base control
- edge overlay for the imported model
- camera, grid and shadow controls preserved
- cache bump to v3.1 for the 3D Studio module

This hotfix improves the visual fidelity of the planar head without waiting for Fase 4.
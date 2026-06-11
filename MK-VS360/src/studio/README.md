# Studio Extraction Plan

Phase 1/2 keeps the existing 360 studio running through `legacyStudio`.

The legacy HTML currently owns these runtime modules:

- `AppStore`
- `DraftDB`
- `Viewer3D`
- `AssetService`
- `FaceEditor`
- export helpers and rendering utilities

Next extraction steps:

1. Move persistence code into `src/studio/DraftDB.js`.
2. Move state transitions into `src/studio/AppStore.js`.
3. Move file parsing into `src/studio/AssetService.js`.
4. Move Photo Sphere Viewer orchestration into `src/studio/Viewer3D.js`.
5. Replace the iframe in `StudioView` with native module initialization.

# Hotspots, sorting and the first 2D/3D simulation

21 September 2026 — local implementation, not deployed. This is a first functional scene, not completion of cinematic Studio or a claim of prototype-quality parity.

## Available locally

- Hotspots: select an uploaded project image in the activity editor, position numbered markers using X/Y percentages and reveal authored explanations by click/keyboard. Empty board also works. Reset clears the reveal. Upload images through Elements first. Image references use the existing authenticated asset path; foreign-project references are rejected on save.
- Sorting: two editable categories, authored answer key, selection-based classification, feedback and reset. Renaming a category updates its existing answer references. Drag/drop sorting remains pending.
- Motion scene: add a scene under Activity or import the script below. A perpendicular journey has editable first/second leg distances (1–100 m), playback duration (2–60 s), object color, camera yaw/elevation and cinematic sweep toggle. Play/pause/reset and timeline scrub share state between the vector 2D view and actual WebGL 3D view. Camera rotation buttons support exploration. Distances are computed from the same progress parameter. 40 m + 30 m gives 70 m travelled and 50 m final displacement.
- Graphics: resolution-independent SVG in 2D and antialiased procedural WebGL geometry with lighting/materials in 3D; drawing pixel ratio capped at 2 for resource control. Existing prototype Three.js r180 engine files are reused locally with MIT notices. The custom renderer is dynamically imported; the engine is not added to the main OS bundle. No external textures or scripts are fetched.

No automatic playback. Reduced-motion preference disables camera sweep. Unsupported WebGL/load failures offer the equivalent 2D view. Resize updates the camera/renderer; disposal disconnects the observer and releases geometry/materials/renderer. Rendering is driven by playback or interaction rather than a continuous idle frame loop.

## Manual script syntax

```text
# Slide 1: Cell explorer
Layout: hotspots
Hotspots:
- Nucleus | Contains genetic material | 40 | 50

# Slide 2: Materials
Layout: sorting
Categories: Metal | Nonmetal
Sorting:
- Copper | Metal
- Sulfur | Nonmetal

# Slide 3: Distance and displacement
Layout: motion-path
First leg: 40
Second leg: 30
Duration: 8
```

Hotspot columns are Label | Explanation | X | Y; coordinates 5–95. Select the image manually after review; no arbitrary script URL is fetched. Sorting columns are Item | Category. Maximum eight items. Malformed/conflicting activities produce warnings instead of silent success.

## Model and compatibility

Activity version 1 gains allowlisted hotspots/sorting kinds, optional imageId and optional item X/Y coordinates. The server requires coordinates for hotspots and valid distinct categories/answer membership for sorting. The asset-reference validator includes activity.imageId in project ownership checks. Scene is a separate optional version-1 object with allowlisted motion-path kind, bounded distances/timing/camera and hex color. One scene or one activity/legacy component per slide; switching uses confirmation and editor undo. Existing saved slides remain valid without new fields.

No SQL migrations, new permissions, changes to LMS business tables, AI activation or production rollout. Deploy compatible backend before frontend; old frontend cannot render new scene/activity fields. Preserve compatible versions on rollback and never strip saved data.

## What remains important and unfinished

The motion-path model is kinematic geometry at illustrative playback speed, not a forces solver. It does not model acceleration, collisions, planetary dynamics or chemistry. The right-angle turn is instantaneous. Subject review and classroom hardware/performance acceptance remain outstanding.

High-end cinematic requirements remain active scope: authored multi-object/keyframe timelines, cinematic shot editing, richer licensed/original assets and materials, 3D labels, importable models, additional validated simulations across subjects, performance tiers and quality review against the prototype. The current procedural journey is a foundation. It is not the final visual-quality benchmark, unrestricted scientific scene generation, 4K export or a general-purpose 3D editor.

## Verification

34 Node tests passed including parser bounds, sorting keys, scene validation, isolated PostgreSQL scene persistence, and cross-project hotspot image denial. Browser checks passed for reveal, incorrect/correct sorting, timeline end-point calculation, real WebGL canvas, play/pause/reset and previous workflows; additional camera controls are covered. Browser uses local mocks and SwiftShader, not target classroom hardware. TypeScript and production build pass; existing large-chunk/Browserslist warnings remain. No paid AI or live publication performed. Screenshot evidence: canonical application/qa/artifacts/hotspot.png and motion-3d.png.

Engine reference: [Three.js documentation](https://threejs.org/docs/). Source notices accompany vendored files in THIRD_PARTY_LICENSES.txt.

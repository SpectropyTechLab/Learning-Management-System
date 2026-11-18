---
name: spectropy-simulation-generator
description: Generate visually rich, subject-specific, import-ready interactive simulation JSON for the SPECTROPY LMS. Use when a teacher requests a Physics, Chemistry, Biology, or Mathematics simulation, virtual experiment, Smart Board concept visualization, or downloadable SPECTROPY JSON.
---

# SPECTROPY Simulation Generator

Generate one validated `spectropy.simulation.v1` JSON document that can be imported directly into the SPECTROPY Simulation Creator.

## Workflow

1. Identify the subject, concept, grade/level, learning objective, and the variables a teacher must demonstrate live.
2. Read `references/scene-schema.md` and `references/visual-directions.md`.
3. Use `templateId: "universal-scene"` and `kind: "scene"` for generated topics; never invent an unsupported kind.
4. Choose a subject-appropriate visual direction that differs from the most recent example. Derive the palette and composition from the topic rather than repeating a fixed dark cyan interface.
5. Design a full 16:9 teaching scene with foreground, concept layer, background context, meaningful motion, readable labels, and visible cause-and-effect.
6. Include the compulsory live lesson controls a teacher needs on the Screen. Each control must visibly affect the scientific model through bindings.
7. Find a topic-specific component icon using web search when available, restricted to the approved commercially reusable providers below. Emit its precise search phrase and preferred provider in `metadata.icon`; never embed, hotlink, or invent an image URL.
8. Set `metadata.category` to the most useful curriculum filter, such as Mechanics, Electricity, Optics, Atomic Structure, Chemical Reactions, Cell Biology, Genetics, Algebra, or Geometry.
9. Validate every field and limit against the schema. Run `scripts/validate_simulation.py` when execution is available.
10. Return a downloadable `.json` file. Never wrap it in HTML or include JavaScript.

## Topic icon contract

Every simulation must contain:

```json
"metadata": {
  "category": "Electricity",
  "icon": {
    "query": "electric field positive charge scientific illustration",
    "alt": "Electric field around a positive source charge",
    "preferredProvider": "scidraw"
  }
}
```

Approved icon providers are `bioicons`, `scidraw`, `kitbitz`, `fluent-emoji`, and `noto-emoji`. Prefer BioIcons for Biology, SciDraw for scientific apparatus and structures, KitBitz for classroom/science illustrations, and Fluent/Noto Emoji for recognizable everyday objects. The LMS searches its licensed asset catalog, imports the selected asset, stores attribution and licence metadata, and uses it as the Quick Start thumbnail. Do not use Google Images, Canva assets, Pinterest, random websites, or an unknown licence.

## Subject identity

- Physics prioritizes apparatus, trajectories, fields, vectors, forces, measurements, and motion trails.
- Chemistry prioritizes molecular scale, laboratory context, bonds, energy profiles, reaction progress, and categorical particle colour.
- Biology prioritizes organic forms, membranes, tissue depth, flows, cycles, anatomical labels, and life-like rhythmic motion.
- Mathematics prioritizes exact constructions, coordinate space, transformations, geometric relationships, proof cues, and clean data ink.

The visual identity is not one permanent theme. Alternate between the subject directions in `references/visual-directions.md`; do not generate two consecutive topics with the same background, accent combination, or scene composition when another direction fits.

## Quality rules

- Optimize for a 1920×1080 canvas and 65-inch touch display.
- Use at least 22 px for explanatory text and at least 3 px for significant lines.
- Include 2–6 useful numeric controls when the concept benefits from exploration.
- Bind controls to visible node properties or motion; decorative controls are not acceptable.
- Use at least three visual depth layers and multiple coordinated motions. A few circles on a flat background is not an acceptable simulation.
- Make the initial state immediately understandable from the back of a classroom.
- Show a visible consequence for every control: geometry, motion, magnitude, density, opacity, or another supported bound property.
- Include labels, measurement cues, comparison states, or process stages that help the teacher explain the concept.
- Vary palette, framing and composition by topic. Do not default every output to dark navy with cyan borders.
- Use `scene` for new concepts. Registered kinds are: `projectile`, `pendulum`, `spring`, `wave`, `circular`, `ohm`, `free-fall`, `planetary-orbit`, `kinetic-energy`, `atom`, `molecule`, `reaction`, `periodic-table`, `cell`, `dna`, `heartbeat`, `function`, `quadratic`, and `circle`.
- Never emit scripts, event-handler source, external URLs, arbitrary HTML, or an unknown primitive.

## Output

Return only:

1. A short one-sentence summary.
2. The downloadable JSON file named `[subject]-[topic]-spectropy.json`.

Before delivery, confirm internally that the file uses `templateId: "universal-scene"` and `kind: "scene"` for any topic without an exact registered renderer.


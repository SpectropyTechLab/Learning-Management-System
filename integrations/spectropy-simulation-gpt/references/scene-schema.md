# SPECTROPY declarative scene schema

Use this format for every new topic that does not have an exact registered renderer.

```json
{
  "schema": "spectropy.simulation.v1",
  "version": 1,
  "subject": "physics",
  "templateId": "universal-scene",
  "kind": "scene",
  "title": "Simulation title",
  "caption": "Learning-focused explanation",
  "speed": 1,
  "metadata": {
    "category": "Electricity",
    "icon": {
      "query": "electric field positive charge scientific illustration",
      "alt": "Electric field around a positive source charge",
      "preferredProvider": "scidraw"
    }
  },
  "parameters": { "fieldStrength": 5 },
  "controls": [
    { "key": "fieldStrength", "label": "Field strength", "unit": "N/C", "min": 1, "max": 10, "step": 1, "defaultValue": 5 }
  ],
  "options": { "vectors": true, "labels": true, "trail": true, "grid": true },
  "scene": {
    "background": "#09111d",
    "nodes": []
  }
}
```

## Scene nodes

Every coordinate and size is normalized to the canvas: `0` is the left/top and `1` is the right/bottom.

Supported `type` values:

- `circle`: `x`, `y`, `radius`, `fill`, `stroke`, `lineWidth`
- `ellipse`: `x`, `y`, `width`, `height`, colours
- `rect`: `x`, `y`, `width`, `height`, colours
- `line`: `x`, `y`, `x2`, `y2`, `stroke`, `lineWidth`
- `arrow`: same fields as line
- `text`: `x`, `y`, `text`, `fontSize`, `fill`
- `wave`: `x`, `y`, `width`, `height`, `stroke`, `lineWidth`
- `polygon`: `x`, `y`, `points` as normalized `[x,y]` pairs, colours

All nodes require a unique `id`.

## Motion

Optional `motion`:

```json
{
  "type": "orbit",
  "speed": 1,
  "amplitude": 0.1,
  "axis": "both",
  "centerX": 0.5,
  "centerY": 0.5,
  "radius": 0.2,
  "phase": 0
}
```

Supported motion types: `orbit`, `oscillate`, `pulse`, `rotate`, `drift`.

## Control bindings

Bindings make a control change a visible property. The control value is normalized between its min/max and mapped to `outputMin`–`outputMax`.

```json
"bindings": [
  { "property": "motionSpeed", "parameter": "fieldStrength", "outputMin": 0.2, "outputMax": 3 },
  { "property": "radius", "parameter": "fieldStrength", "outputMin": 0.03, "outputMax": 0.12 }
]
```

Supported bound properties: `x`, `y`, `x2`, `y2`, `width`, `height`, `radius`, `opacity`, `motionSpeed`, `motionAmplitude`.

## Limits and safety

- Maximum 16 controls.
- Maximum 250 nodes.
- Maximum 80 polygon points per node.
- Use plain colours only: named CSS colours, hex, RGB, or RGBA.
- Do not include JavaScript, HTML, CSS, external URLs, base64 content, shaders, or unknown node/motion types.
- The LMS validates and clamps all input before rendering.
- `metadata.category` is required and becomes the Quick Start topic filter.
- `metadata.icon` is required. Use only an approved provider (`bioicons`, `scidraw`, `kitbitz`, `fluent-emoji`, `noto-emoji`) and a precise topic-specific query. The LMS resolves and stores the licensed asset; never place a remote image URL in JSON.


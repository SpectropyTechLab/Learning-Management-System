#!/usr/bin/env python3
"""Dependency-free structural validator for SPECTROPY simulation JSON."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SUBJECTS = {"physics", "chemistry", "biology", "mathematics"}
NODE_TYPES = {"circle", "ellipse", "rect", "line", "arrow", "text", "wave", "polygon"}
MOTIONS = {"orbit", "oscillate", "pulse", "rotate", "drift"}
BOUND_PROPERTIES = {"x", "y", "x2", "y2", "width", "height", "radius", "opacity", "motionSpeed", "motionAmplitude"}
ICON_PROVIDERS = {"bioicons", "scidraw", "kitbitz", "fluent-emoji", "noto-emoji"}
KEY = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,31}$")


def fail(message: str) -> None:
    raise ValueError(message)


def validate(data: object) -> dict:
    if not isinstance(data, dict):
        fail("The root must be an object")
    if data.get("schema") != "spectropy.simulation.v1" or data.get("version") != 1:
        fail("Expected spectropy.simulation.v1 version 1")
    if data.get("subject") not in SUBJECTS:
        fail("Unsupported subject")
    if data.get("templateId") != "universal-scene" or data.get("kind") != "scene":
        fail("Generated simulations must use universal-scene / scene")
    metadata = data.get("metadata")
    icon = metadata.get("icon") if isinstance(metadata, dict) else None
    if not isinstance(metadata, dict) or not isinstance(metadata.get("category"), str) or len(metadata["category"].strip()) < 2:
        fail("metadata.category is required")
    if not isinstance(icon, dict) or not isinstance(icon.get("query"), str) or len(icon["query"].strip()) < 2:
        fail("metadata.icon.query is required")
    if not isinstance(icon.get("alt"), str) or len(icon["alt"].strip()) < 2 or icon.get("preferredProvider") not in ICON_PROVIDERS:
        fail("metadata.icon requires alt text and an approved preferredProvider")
    controls = data.get("controls")
    parameters = data.get("parameters")
    if not isinstance(controls, list) or len(controls) > 16 or not isinstance(parameters, dict):
        fail("controls/parameters are invalid")
    keys: set[str] = set()
    for index, control in enumerate(controls, 1):
        if not isinstance(control, dict) or not KEY.match(str(control.get("key", ""))):
            fail(f"Control {index} has an invalid key")
        key = control["key"]
        if key in keys or key not in parameters:
            fail(f"Control {key} is duplicated or missing from parameters")
        keys.add(key)
        if not all(isinstance(control.get(field), (int, float)) for field in ("min", "max", "step", "defaultValue")):
            fail(f"Control {key} has invalid numeric limits")
        if control["min"] >= control["max"] or control["step"] <= 0 or not control["min"] <= control["defaultValue"] <= control["max"]:
            fail(f"Control {key} has inconsistent limits")
    scene = data.get("scene")
    nodes = scene.get("nodes") if isinstance(scene, dict) else None
    if not isinstance(nodes, list) or not 1 <= len(nodes) <= 250:
        fail("scene.nodes must contain 1–250 nodes")
    ids: set[str] = set()
    bound_keys: set[str] = set()
    for index, node in enumerate(nodes, 1):
        if not isinstance(node, dict) or node.get("type") not in NODE_TYPES:
            fail(f"Node {index} has an unsupported type")
        node_id = str(node.get("id", ""))
        if not node_id or node_id in ids:
            fail(f"Node {index} has a missing or duplicate id")
        ids.add(node_id)
        motion = node.get("motion")
        if motion is not None and (not isinstance(motion, dict) or motion.get("type") not in MOTIONS):
            fail(f"Node {node_id} has an unsupported motion")
        for binding in node.get("bindings", []):
            if not isinstance(binding, dict) or binding.get("property") not in BOUND_PROPERTIES or binding.get("parameter") not in keys:
                fail(f"Node {node_id} has an invalid binding")
            bound_keys.add(binding["parameter"])
    unbound = keys - bound_keys
    if unbound:
        fail("Controls without visible bindings: " + ", ".join(sorted(unbound)))
    return data


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: validate_simulation.py simulation.json", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    try:
        validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"INVALID: {exc}", file=sys.stderr)
        return 1
    print(f"VALID: {path.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

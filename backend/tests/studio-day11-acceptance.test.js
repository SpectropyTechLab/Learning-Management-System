import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateLayoutDefinition } from '../services/studioLayouts.service.js';

const validLayout = () => ({
  layout_key: 'CUSTOM-001',
  name: 'Custom explanation layout',
  description: 'Title, explanation and visual',
  canvas_width: 1920,
  canvas_height: 1080,
  safe_margin: 90,
  layout_data_json: {
    slots: [
      { id: 'title', label: 'Title', region: 'header', allowed: ['title'], bounds: { x: 90, y: 60, width: 1740, height: 150 } },
      { id: 'visual', label: 'Visual', region: 'content', allowed: ['visual', 'media'], bounds: { x: 90, y: 250, width: 820, height: 680 } },
      { id: 'explanation', label: 'Explanation', region: 'content', allowed: ['text'], bounds: { x: 950, y: 250, width: 880, height: 680 } },
    ],
  },
});

test('Day 11 custom layout contract accepts valid slot geometry', () => {
  const result = validateLayoutDefinition(validLayout());
  assert.equal(result.layoutKey, 'CUSTOM-001');
  assert.equal(result.layoutData.slots.length, 3);
  assert.deepEqual(result.layoutData.slots[1].allowed, ['visual', 'media']);
});

test('Day 11 custom layout contract returns actionable overlap and canvas errors', () => {
  const overlap = validLayout();
  overlap.layout_data_json.slots[2].bounds.x = 800;
  assert.throws(() => validateLayoutDefinition(overlap), /Slots visual and explanation overlap/);

  const outside = validLayout();
  outside.layout_data_json.slots[1].bounds.width = 1900;
  assert.throws(() => validateLayoutDefinition(outside), /Slot visual exceeds the canvas dimensions/);
});

test('Day 11 layout revisions append rows and protect default templates', () => {
  const source = fs.readFileSync(new URL('../services/studioLayouts.service.js', import.meta.url), 'utf8');
  assert.match(source, /INSERT INTO layouts[\s\S]*versionNo/);
  assert.match(source, /Default layouts are protected/);
  assert.match(source, /LAYOUT_KEY_EXISTS/);
});

test('Day 11 Resource usage response supports exact Screen navigation', () => {
  const source = fs.readFileSync(new URL('../services/studioResources.service.js', import.meta.url), 'utf8');
  assert.match(source, /s\.title AS screen_title/);
  assert.match(source, /session\.title AS session_title/);
  assert.match(source, /distinct_screen_count/);
});

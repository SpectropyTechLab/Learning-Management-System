const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const loadModule = (filename, dependencies = {}) => {
  const source = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const result = {};
  new Function('exports', 'require', compiled)(result, (name) => dependencies[name] ?? require(name));
  return result;
};
const targetModule = loadModule('targetLayouts.ts');
const { MASTER, layouts, pilotLayouts, sampleSlides, validateSlide, fitScale } = loadModule('layouts.ts', { './targetLayouts': targetModule });

test('all fourteen target layouts and eight pilot arrangements validate', () => {
  assert.deepEqual(layouts.map((layout) => layout.id), Array.from({ length: 14 }, (_, index) => `LYT-${String(index + 1).padStart(3, '0')}`));
  assert.equal(pilotLayouts.length, 8);
  for (const layout of [...layouts, ...pilotLayouts]) {
    assert.deepEqual(validateSlide(layout, sampleSlides[layout.id]), [], layout.id);
    assert.ok(layout.slots.filter((slot) => slot.region === 'content').length >= 1);
    for (const first of layout.slots.filter((slot) => slot.region === 'content')) {
      for (const second of layout.slots.filter((slot) => slot.region === 'content' && slot.id !== first.id)) {
        const overlap = first.bounds.x < second.bounds.x + second.bounds.width && first.bounds.x + first.bounds.width > second.bounds.x && first.bounds.y < second.bounds.y + second.bounds.height && first.bounds.y + first.bounds.height > second.bounds.y;
        assert.equal(overlap, false, `${layout.id}: ${first.id} overlaps ${second.id}`);
      }
    }
  }
  assert.deepEqual(layouts[0].slots[1].bounds, { x: 90, y: 250, width: 1080, height: 680 });
  assert.deepEqual(layouts[13].slots.at(-2).bounds, { x: 1240, y: 530, width: 590, height: 400 });
});

test('canvas retains 16:9 geometry and flags objects outside slots', () => {
  assert.equal(MASTER.width / MASTER.height, 16 / 9);
  assert.equal(MASTER.safeMargin, 90);
  const layout = structuredClone(layouts[0]);
  layout.slots[1].bounds.x = 0;
  assert.match(validateSlide(layout, sampleSlides['LYT-001']).join(' '), /outside its content region/);
  const wrongType = structuredClone(sampleSlides['LYT-001']);
  wrongType.objects[1].type = 'footer';
  assert.match(validateSlide(layouts[0], wrongType).join(' '), /unsupported type/);
});

test('the slide fits desktop and narrow viewports with one scale on both axes', () => {
  for (const [width, height] of [[1920, 1080], [1600, 900], [900, 700], [390, 600]]) {
    const scale = fitScale(width, height);
    assert.ok(MASTER.width * scale <= width + 0.001);
    assert.ok(MASTER.height * scale <= height + 0.001);
    assert.equal((MASTER.width * scale) / (MASTER.height * scale), 16 / 9);
  }
});

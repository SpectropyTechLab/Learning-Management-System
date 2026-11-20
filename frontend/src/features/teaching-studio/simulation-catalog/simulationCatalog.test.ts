import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

type CatalogEntry = {
  id: string;
  subject: string;
  iconKey: string;
  variables: Array<{ id: string; min: number; max: number; step: number; value: number }>;
  equations: unknown[];
  objects: unknown[];
  results: unknown[];
};

const load = (subject: string): CatalogEntry[] => JSON.parse(readFileSync(
  new URL(`./data/${subject}.generated.json`, import.meta.url),
  'utf8',
)) as CatalogEntry[];

const catalogs = {
  physics: load('physics'), chemistry: load('chemistry'), biology: load('biology'),
  mathematics: load('mathematics'),
};
const all = Object.values(catalogs).flat();

test('the generated catalog contains only the expected source simulations', () => {
  assert.equal(catalogs.physics.length, 38);
  assert.equal(catalogs.chemistry.length, 27);
  assert.equal(catalogs.biology.length, 22);
  assert.equal(catalogs.mathematics.length, 35);
  assert.equal(all.length, 122);
  assert.equal(new Set(all.map((entry) => entry.id)).size, all.length);
});

test('source variables, equations, objects and results are retained', () => {
  assert.equal(all.reduce((total, entry) => total + entry.variables.length, 0), 375);
  assert.equal(all.reduce((total, entry) => total + entry.equations.length, 0), 360);
  assert.equal(all.reduce((total, entry) => total + entry.objects.length, 0), 561);
  assert.equal(all.reduce((total, entry) => total + entry.results.length, 0), 360);
  all.forEach((entry) => {
    assert.ok(entry.iconKey, `${entry.id} is missing an icon key`);
    assert.equal(new Set(entry.variables.map((variable) => variable.id)).size, entry.variables.length);
    entry.variables.forEach((variable) => {
      assert.ok(variable.min <= variable.value && variable.value <= variable.max, `${entry.id}/${variable.id} has an invalid default`);
      assert.ok(variable.step > 0, `${entry.id}/${variable.id} has an invalid step`);
    });
  });
});

test('Physics source tuples retain their correct ranges and defaults', () => {
  const projectile = catalogs.physics.find((entry) => entry.id === 'physics-projectile-motion');
  assert.ok(projectile);
  assert.deepEqual(projectile.variables.slice(0, 3).map(({ id, min, max, step, value }) => ({ id, min, max, step, value })), [
    { id: 'v', min: 5, max: 50, step: 1, value: 20 },
    { id: 'a', min: 5, max: 85, step: 1, value: 45 },
    { id: 'g', min: 1, max: 20, step: 0.1, value: 9.8 },
  ]);
});


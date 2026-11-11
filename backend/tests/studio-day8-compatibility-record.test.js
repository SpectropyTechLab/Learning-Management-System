import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Day 8 compatibility record gives every blocker an owner, severity and schedule impact', async () => {
  const record = JSON.parse(await readFile(
    new URL('./evidence/studio-day8-compatibility.json', import.meta.url),
    'utf8'
  ));
  const supportedStatuses = new Set(['pass', 'synthetic_pass', 'blocked']);

  assert.equal(record.scope, 'Day 8 Developer 2 backend acceptance');
  assert.ok(record.outcomes.length >= 8);
  for (const outcome of record.outcomes) {
    assert.ok(outcome.capability);
    assert.ok(supportedStatuses.has(outcome.status));
    if (outcome.status === 'blocked') {
      assert.ok(outcome.owner, `${outcome.capability} needs an owner`);
      assert.ok(outcome.severity, `${outcome.capability} needs a severity`);
      assert.ok(outcome.schedule_impact, `${outcome.capability} needs a schedule impact`);
      assert.ok(outcome.reason, `${outcome.capability} needs a reason`);
    } else {
      assert.ok(outcome.evidence, `${outcome.capability} needs linked evidence`);
    }
  }
});

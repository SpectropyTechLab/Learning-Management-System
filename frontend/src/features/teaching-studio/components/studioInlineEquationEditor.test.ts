import assert from 'node:assert/strict';
import test from 'node:test';
import { inlineEquationEditorBounds } from './studioInlineEquationEditor.ts';

test('inline equation overlay coordinates are relative to their positioned container', () => {
  assert.deepEqual(
    inlineEquationEditorBounds(
      { left: 430, top: 275, width: 28, height: 20 },
      { left: 300, top: 120, width: 600, height: 300 },
      { left: 1, top: 1 },
    ),
    { left: 129, top: 154, width: 36, height: 32 },
  );
});

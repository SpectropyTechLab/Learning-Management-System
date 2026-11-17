import assert from 'node:assert/strict';
import test from 'node:test';
import { equationControlTarget, shouldCloseEquationKeyboard } from './studioEquationControlModel.ts';

test('a visible keyboard closes only for the equation that owns it', () => {
  assert.equal(shouldCloseEquationKeyboard(true, 'equation-a', 'equation-a'), true);
  assert.equal(shouldCloseEquationKeyboard(true, 'equation-a', 'equation-b'), false);
});

test('an active text caret takes priority over stale equation ownership', () => {
  assert.equal(equationControlTarget(undefined, 'old-inline-equation', true), null);
  assert.equal(equationControlTarget('selected-equation', 'old-inline-equation', false), 'selected-equation');
});

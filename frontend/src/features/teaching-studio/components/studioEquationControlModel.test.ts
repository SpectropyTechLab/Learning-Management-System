import assert from 'node:assert/strict';
import test from 'node:test';
import { equationControlTarget, inlineEquationInsertionOffset, shouldCloseEquationKeyboard } from './studioEquationControlModel.ts';

test('a visible keyboard closes only for the equation that owns it', () => {
  assert.equal(shouldCloseEquationKeyboard(true, 'equation-a', 'equation-a'), true);
  assert.equal(shouldCloseEquationKeyboard(true, 'equation-a', 'equation-b'), false);
});

test('an active text caret takes priority over stale equation ownership', () => {
  assert.equal(equationControlTarget(undefined, 'old-inline-equation', true), null);
  assert.equal(equationControlTarget('selected-equation', 'old-inline-equation', false), 'selected-equation');
});

test('inline equation insertion uses the active caret and falls back to the selected text end', () => {
  assert.equal(inlineEquationInsertionOffset('maths = ', 'text-a', { elementId: 'text-a', offset: 8 }), 8);
  assert.equal(inlineEquationInsertionOffset('maths = ', 'text-a', { elementId: 'other', offset: 2 }), 8);
  assert.equal(inlineEquationInsertionOffset('maths = ', 'text-a', null), 8);
  assert.equal(inlineEquationInsertionOffset('abc', 'text-a', { elementId: 'text-a', offset: 99 }), 3);
});

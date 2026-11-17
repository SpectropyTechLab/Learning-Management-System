import assert from 'node:assert/strict';
import test from 'node:test';
import { stripEquationEditingPlaceholders } from './studioEquationPlaceholders.ts';

test('MathLive placeholders are removed from saved and displayed equations', () => {
  assert.equal(
    stripEquationEditingPlaceholders(String.raw`\begin{pmatrix}\placeholder{} & 2 \\ 3 & \placeholder[id]{}\end{pmatrix}`),
    String.raw`\begin{pmatrix} & 2 \\ 3 & \end{pmatrix}`,
  );
});

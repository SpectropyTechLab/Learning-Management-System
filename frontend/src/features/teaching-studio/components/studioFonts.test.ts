import assert from 'node:assert/strict';
import test from 'node:test';
import { filterStudioFonts, normalizeStudioFontFamily, STUDIO_FONTS, studioFontCssFamily } from './studioFonts.ts';

test('offers a useful initial catalogue without duplicate family names', () => {
  assert.ok(STUDIO_FONTS.length >= 25);
  assert.equal(new Set(STUDIO_FONTS.map((font) => font.name.toLowerCase())).size, STUDIO_FONTS.length);
});

test('normalizes plain, quoted, and fallback font-family values', () => {
  assert.equal(normalizeStudioFontFamily('Calibri'), 'Calibri');
  assert.equal(normalizeStudioFontFamily('"Times New Roman", serif'), 'Times New Roman');
  assert.equal(normalizeStudioFontFamily('Missing Font, Georgia, serif'), 'Georgia');
  assert.equal(normalizeStudioFontFamily('Definitely Missing'), undefined);
});

test('builds deterministic CSS stacks for rendering', () => {
  assert.equal(studioFontCssFamily('Century Gothic'), '"Century Gothic", sans-serif');
  assert.equal(studioFontCssFamily('Garamond'), 'Garamond, serif');
  assert.equal(studioFontCssFamily('unknown'), 'Arial, sans-serif');
});

test('filters the catalogue by a typed partial family name', () => {
  assert.deepEqual(filterStudioFonts('century').map((font) => font.name), ['Century Gothic', 'Century Schoolbook']);
  assert.deepEqual(filterStudioFonts('  CONS  ').map((font) => font.name), ['Constantia', 'Consolas', 'Lucida Console']);
  assert.equal(filterStudioFonts('no matching font').length, 0);
});

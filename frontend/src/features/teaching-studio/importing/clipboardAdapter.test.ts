import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptClipboardSnapshot, sanitizeClipboardHtml, sanitizeClipboardSvg, selectClipboardRepresentation, type ClipboardSnapshot } from './adapters/clipboardAdapter.ts';
import { commitClipboardDocument } from './commit/clipboardCommitter.ts';
import type { StudioResourceSummary } from '../api/studioResourcesApi.ts';

const snapshot = (overrides: Partial<ClipboardSnapshot> = {}): ClipboardSnapshot => ({ files: [], types: [], ...overrides });

test('clipboard representation priority is deterministic and prefers valid native data', () => {
  const native = JSON.stringify([{ id: 'one', slotId: 'free-one', type: 'text', content: { text: 'Rich' }, position: { x: 0, y: 0, width: 100, height: 40 } }]);
  assert.equal(selectClipboardRepresentation(snapshot({ native_payload: native, html: '<b>Rich</b>', plain: 'Rich', types: ['text/plain', 'text/html'] })), 'native');
  assert.equal(selectClipboardRepresentation(snapshot({ native_payload: '{bad', html: '<b>Rich</b>', plain: 'Rich', types: ['text/plain', 'text/html'] })), 'html');
  assert.equal(selectClipboardRepresentation(snapshot({ svg: '<svg/>', html: '<b>Rich</b>', plain: 'Rich', types: ['text/html', 'image/svg+xml'] })), 'svg');
  assert.equal(selectClipboardRepresentation(snapshot({ html: '<b>Rich</b>', plain: 'Rich', types: ['text/plain', 'text/html'] })), 'html');
});

test('rich HTML stays editable while active content and unsafe CSS are removed', () => {
  const safe = sanitizeClipboardHtml('<p onclick="steal()"><strong style="font-size: 24px; color: red; background-image: url(javascript:x)">Hello</strong><script>bad()</script></p>');
  assert.match(safe, /<strong[^>]*font-size: 24px[^>]*color: red/i);
  assert.doesNotMatch(safe, /onclick|script|javascript|background-image/i);
  const result = adaptClipboardSnapshot(snapshot({ html: safe, plain: 'Hello', types: ['text/html', 'text/plain'] }));
  assert.equal(result.representation, 'html');
  assert.equal(result.document.screens[0].elements[0].kind, 'text');
  assert.equal(result.document.screens[0].elements[0].content?.text, 'Hello');
  assert.equal(result.available_modes.includes('editable-content'), true);
});

test('SVG sanitizer removes executable and external content but preserves local vector references', () => {
  const safe = sanitizeClipboardSvg('<svg onload="bad()"><script>bad()</script><use href="https://evil/x"/><use href="#local"/><path fill="url(https://evil/x)"/></svg>');
  assert.doesNotMatch(safe, /onload|script|https:\/\/evil/i);
  assert.match(safe, /href="#local"/);
  const result = adaptClipboardSnapshot(snapshot({ svg: safe, types: ['image/svg+xml'] }));
  assert.equal(result.document.screens[0].elements[0].kind, 'vector');
  assert.equal(result.document.issues.some((entry) => entry.code === 'CLIPBOARD_SVG_PRESERVED'), true);
});

test('plain URLs become editable hyperlinks and unsupported content is actionable', () => {
  const link = adaptClipboardSnapshot(snapshot({ plain: 'https://spectropy.com/resource', types: ['text/plain'] }));
  assert.equal(link.document.screens[0].elements[0].content?.hyperlink, 'https://spectropy.com/resource');
  const unsupported = adaptClipboardSnapshot(snapshot());
  assert.equal(unsupported.document.issues[0].code, 'CLIPBOARD_UNSUPPORTED');
  assert.match(unsupported.document.issues[0].message, /text, an image, SVG/i);
});

test('multiple supported files create multiple non-overlapping resource elements', () => {
  const files = [new File(['a'], 'one.png', { type: 'image/png' }), new File(['b'], 'two.gif', { type: 'image/gif' })];
  const result = adaptClipboardSnapshot(snapshot({ files, types: ['Files'] }));
  assert.equal(result.document.resources.length, 2);
  assert.equal(result.document.screens[0].elements.length, 2);
  assert.notDeepEqual(result.document.screens[0].elements[0].bounds, result.document.screens[0].elements[1].bounds);
  assert.equal(result.document.resources[1].metadata?.resource_type, 'animation');
});

const resourceSummary = (id: number, type: 'image' | 'animation'): StudioResourceSummary => ({
  id, client_id: 1, name: `Resource ${id}`, description: null, resource_type: type, is_active: true,
  created_at: '', updated_at: '', latest_version: { id: id * 10, resource_id: id, version_number: 1, storage_key: 'key', original_file_name: 'asset.png', mime_type: 'image/png', file_size: 1, external_url: null, width: null, height: null, duration_seconds: null, entry_point: null },
});

test('clipboard commit deduplicates resource bytes and binds every element to the persisted version', async () => {
  const adapted = adaptClipboardSnapshot(snapshot({ files: [new File(['same'], 'one.png', { type: 'image/png' }), new File(['same'], 'two.png', { type: 'image/png' })], types: ['Files'] }));
  let creates = 0;
  const committed = await commitClipboardDocument(adapted.document, {
    create: async () => { creates += 1; return resourceSummary(7, 'image'); },
    remove: async () => ({ storage_cleanup_complete: true }),
  });
  assert.equal(creates, 1);
  assert.equal(committed.elements.length, 2);
  assert.deepEqual(committed.elements.map((element) => element.resource?.resource_version_id), [70, 70]);
});

test('clipboard commit rolls back created Resource Library records when a later upload fails', async () => {
  const adapted = adaptClipboardSnapshot(snapshot({ files: [new File(['a'], 'one.png', { type: 'image/png' }), new File(['b'], 'two.gif', { type: 'image/gif' })], types: ['Files'] }));
  let creates = 0;
  const removed: number[] = [];
  await assert.rejects(() => commitClipboardDocument(adapted.document, {
    create: async () => { creates += 1; if (creates === 2) throw new Error('upload failed'); return resourceSummary(9, 'image'); },
    remove: async (id) => { removed.push(id); return { storage_cleanup_complete: true }; },
  }), /upload failed/);
  assert.deepEqual(removed, [9]);
});

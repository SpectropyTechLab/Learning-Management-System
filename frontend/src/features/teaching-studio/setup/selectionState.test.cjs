const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, 'selectionState.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = {};
new Function('exports', 'require', compiled)(mod, require);

test('changing a parent preserves ancestors and clears all descendants', () => {
  const full = { boardId: 1, programId: 2, gradeId: 3, subjectId: 4, chapterId: 5, topicId: 6, subtopicId: 7, sessionId: 8 };
  assert.deepEqual(mod.changeSelection(full, 'gradeId', 30), { boardId: 1, programId: 2, gradeId: 30, subjectId: null, chapterId: null, topicId: null, subtopicId: null, sessionId: null });
});

test('clearing a parent also clears its descendants', () => {
  const full = { boardId: 1, programId: 2, gradeId: 3, subjectId: 4, chapterId: 5, topicId: 6, subtopicId: 7, sessionId: 8 };
  assert.deepEqual(mod.changeSelection(full, 'boardId', null), mod.emptyStudioSelection());
});

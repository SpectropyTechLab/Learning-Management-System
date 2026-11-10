const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, 'selectionState.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const mod = {};
new Function('exports', 'require', compiled)(mod, require);

test('changing a parent preserves ancestors and clears all descendants', () => {
  const full = {
    boardId: 1,
    programId: 2,
    gradeId: 3,
    subjectId: 4,
    chapterId: 5,
    topicId: 6,
    subtopicId: 7,
    sessionId: 8,
  };
  assert.deepEqual(mod.changeSelection(full, 'gradeId', 30), {
    boardId: 1,
    programId: 2,
    gradeId: 30,
    subjectId: null,
    chapterId: null,
    topicId: null,
    subtopicId: null,
    sessionId: null,
  });
});

test('clearing a parent also clears its descendants', () => {
  const full = {
    boardId: 1,
    programId: 2,
    gradeId: 3,
    subjectId: 4,
    chapterId: 5,
    topicId: 6,
    subtopicId: 7,
    sessionId: 8,
  };
  assert.deepEqual(mod.changeSelection(full, 'boardId', null), mod.emptyStudioSelection());
});

test('workflow context round-trips through URL parameters', () => {
  const full = {
    boardId: 1,
    programId: 2,
    gradeId: 3,
    subjectId: 4,
    chapterId: 5,
    topicId: 6,
    subtopicId: 7,
    sessionId: 8,
  };
  const params = mod.selectionSearchParams(full);

  assert.deepEqual(mod.selectionFromSearchParams(params), full);
  assert.equal(
    mod.selectionPath('/studio/curriculum', full),
    '/studio/curriculum?boardId=1&programId=2&gradeId=3&subjectId=4&chapterId=5&topicId=6&subtopicId=7&sessionId=8',
  );
});

test('invalid URL values are ignored and session can be omitted', () => {
  const selection = mod.selectionFromSearchParams(
    new URLSearchParams('boardId=-1&programId=nope&gradeId=3.5&subjectId=4'),
  );
  assert.deepEqual(selection, {
    boardId: null,
    programId: null,
    gradeId: null,
    subjectId: 4,
    chapterId: null,
    topicId: null,
    subtopicId: null,
    sessionId: null,
  });

  const full = {
    boardId: 1,
    programId: 2,
    gradeId: 3,
    subjectId: 4,
    chapterId: 5,
    topicId: 6,
    subtopicId: 7,
    sessionId: 8,
  };
  assert.equal(mod.selectionSearchParams(full, false).has('sessionId'), false);
  assert.equal(mod.hasCompleteHierarchy(full), true);
  assert.equal(mod.hasCompleteHierarchy({ ...full, topicId: null }), false);
});

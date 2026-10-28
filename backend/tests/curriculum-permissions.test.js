import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkPermission, requireRole } from '../middleware/auth.js';

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const run = (middleware, req) => {
  const res = makeRes();
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
};

test('curriculum permissions are part of the existing permission catalog', () => {
  const seed = JSON.parse(
    fs.readFileSync(new URL('../seed/role_permissions.seed.json', import.meta.url), 'utf8')
  );
  const curriculumPermissions = [
    'curriculum.read',
    'curriculum.create',
    'curriculum.update',
    'curriculum.delete',
    'curriculum.authorize',
  ];
  for (const permission of curriculumPermissions) {
    assert.equal(seed.permission_catalog.includes(permission), true);
  }

  const isGranted = (entries, role, permission) => entries.some(
    (entry) => entry.role === role && entry.permission === permission && entry.granted === true
  );
  for (const permission of curriculumPermissions) {
    assert.equal(isGranted(seed.platform_permissions, 'super_admin', permission), true);
    assert.equal(isGranted(seed.platform_permissions, 'content_authorizer', permission), true);
  }
  const readOnlyRoles = ['client_admin', 'school_owner', 'teacher', 'student'];
  for (const role of readOnlyRoles) {
    assert.equal(isGranted(seed.tenant_permissions, role, 'curriculum.read'), true);
    for (const permission of curriculumPermissions.filter((value) => value !== 'curriculum.read')) {
      const entry = seed.tenant_permissions.find(
        (candidate) => candidate.role === role && candidate.permission === permission
      );
      assert.equal(entry?.granted, false);
    }
  }
});

test('read-only roles cannot cross the canonical write role boundary', () => {
  for (const role of ['client_admin', 'school_owner', 'teacher', 'student']) {
    const req = {
      user: { id: 10, role, client_id: 20 },
      permissions: new Map([
        ['curriculum.read', true],
        ['curriculum.update', true],
      ]),
    };

    assert.equal(run(checkPermission('curriculum.read'), req).nextCalled, true);

    const writeRole = run(requireRole(['super_admin', 'content_authorizer']), req);
    assert.equal(writeRole.nextCalled, false);
    assert.equal(writeRole.res.statusCode, 403);
  }
});

test('student has read-only curriculum access by default', () => {
  const req = {
    user: { id: 11, role: 'student', client_id: 20 },
    permissions: new Map([
      ['curriculum.read', true],
      ['curriculum.update', false],
    ]),
  };
  assert.equal(run(checkPermission('curriculum.read'), req).nextCalled, true);
  const write = run(checkPermission('curriculum.update'), req);
  assert.equal(write.nextCalled, false);
  assert.equal(write.res.statusCode, 403);
});

test('author requires both an eligible role and effective curriculum permission', () => {
  const req = {
    user: { id: 12, role: 'content_authorizer', client_id: null },
    permissions: new Map([['curriculum.update', true]]),
  };
  const role = run(
    requireRole(['super_admin', 'content_authorizer']),
    req
  );
  const permission = run(checkPermission('curriculum.update'), req);
  assert.equal(role.nextCalled, true);
  assert.equal(permission.nextCalled, true);
});

test('user-specific denial remains effective for an eligible author role', () => {
  const result = run(checkPermission('curriculum.update'), {
    user: { id: 13, role: 'content_authorizer', client_id: null },
    permissions: new Map([['curriculum.update', false]]),
  });
  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);
});

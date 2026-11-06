import test from 'node:test';
import assert from 'node:assert/strict';
import studioResourcesRoutes from '../routes/studioResources.routes.js';
import studioSessionWorkflowRoutes from '../routes/studioSessionWorkflow.routes.js';

const passThrough = (router, url) => new Promise((resolve, reject) => {
  const request = {
    method: 'GET',
    url,
    originalUrl: `/api${url}`,
    baseUrl: '/api',
    headers: {},
  };
  router.handle(request, {}, (error) => {
    if (error) reject(error);
    else resolve();
  });
});

test('author-only Studio routers do not intercept teacher discovery requests', async () => {
  await assert.doesNotReject(passThrough(studioSessionWorkflowRoutes, '/studio/discovery'));
  await assert.doesNotReject(passThrough(studioResourcesRoutes, '/studio/discovery'));
});

test('workflow and Resource endpoints retain their authorization middleware', () => {
  for (const layer of studioSessionWorkflowRoutes.stack.filter((candidate) => candidate.route)) {
    assert.ok(layer.route.stack.length >= 4, `${layer.route.path} must retain auth, tenant, role and controller middleware`);
  }
  const resourceScope = studioResourcesRoutes.stack.find((layer) => !layer.route);
  assert.ok(resourceScope, 'Resource routes must retain scoped authorization middleware');
  assert.equal(resourceScope.regexp.test('/studio/resources'), true);
  assert.equal(resourceScope.regexp.test('/studio/discovery'), false);
});

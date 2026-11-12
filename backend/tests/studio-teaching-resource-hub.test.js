import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readBackend = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const readFrontend = (path) => fs.readFileSync(new URL(`../../frontend/src/features/teaching-studio/${path}`, import.meta.url), 'utf8');

test('Teaching Resource Hub excludes generic media providers and records curriculum metadata', () => {
  const service = readBackend('services/studioTeachingResources.service.js');
  const routes = readBackend('routes/studioResources.routes.js');
  const hub = readFrontend('components/resources/TeachingResourceHub.tsx');
  const library = readFrontend('components/resources/ResourceLibrary.tsx');
  assert.doesNotMatch(service, /openverse|pexels|polyhaven/i);
  assert.match(service, /pubchem\.ncbi\.nlm\.nih\.gov/);
  assert.match(service, /search\.rcsb\.org/);
  assert.match(service, /chemcollective\.org/);
  assert.match(service, /3d\.nih\.gov/);
  assert.match(service, /learning_objective/);
  assert.match(service, /exam_tracks/);
  assert.match(routes, /teaching-resources\/search/);
  assert.match(routes, /teaching-resources\/import/);
  assert.match(library, /Teaching Resource Hub/);
  assert.match(hub, /PhET, GeoGebra and OpenStax are intentionally not enabled/);
});

test('curated chemistry and biology resources are filtered by subject and concept', async () => {
  const { searchTeachingResources } = await import('../services/studioTeachingResources.service.js');
  const chemistry = await searchTeachingResources({
    query: { provider: 'curated', subject: 'chemistry', q: 'stoichiometry' },
    user: { role: 'content_authorizer' },
  });
  assert.ok(chemistry.results.length > 0);
  assert.ok(chemistry.results.every((item) => item.subject === 'chemistry'));
  assert.ok(chemistry.results.every((item) => item.exam_tracks.includes('JEE')));

  const biology = await searchTeachingResources({
    query: { provider: 'curated', subject: 'biology', q: 'DNA' },
    user: { role: 'content_authorizer' },
  });
  assert.equal(biology.results[0]?.provider_label, 'NIH 3D');
  assert.ok(biology.results[0]?.exam_tracks.includes('NEET'));
});

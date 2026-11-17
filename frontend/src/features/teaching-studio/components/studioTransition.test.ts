import assert from 'node:assert/strict';
import test from 'node:test';
import { studioScreenTransitionPair } from './studioTransition.ts';

test('screen transitions keep none and cut immediate', () => {
  assert.equal(studioScreenTransitionPair({ effect: 'none' }).durationMs, 0);
  assert.equal(studioScreenTransitionPair({ effect: 'cut' }).durationMs, 0);
});

test('push coordinates outgoing and incoming screens in opposite directions', () => {
  const pair = studioScreenTransitionPair({ effect: 'push', direction: 'right', duration: 1.2 });
  assert.equal(pair.durationMs, 1200);
  assert.equal(pair.outgoing.animationName, 'studio-screen-push-out');
  assert.equal(pair.incoming.animationName, 'studio-screen-push-in');
  assert.equal((pair.incoming as Record<string, unknown>)['--studio-screen-x-in'], '100%');
  assert.equal((pair.outgoing as Record<string, unknown>)['--studio-screen-x-out'], '-100%');
});

test('backward navigation reverses a directional screen transition', () => {
  const pair = studioScreenTransitionPair({ effect: 'push', direction: 'right' }, true);
  assert.equal((pair.incoming as Record<string, unknown>)['--studio-screen-x-in'], '-100%');
  assert.equal((pair.outgoing as Record<string, unknown>)['--studio-screen-x-out'], '100%');
});

test('cover keeps the outgoing screen still while the incoming screen moves over it', () => {
  const pair = studioScreenTransitionPair({ effect: 'cover', direction: 'bottom' });
  assert.equal(pair.outgoing.animationName, undefined);
  assert.equal(pair.incoming.animationName, 'studio-screen-push-in');
});

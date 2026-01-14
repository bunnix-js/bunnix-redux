import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStore } from '../src/store.mjs';

test('createStore initializes state', () => {
  const store = createStore({ count: 1 }, {});
  assert.deepEqual(store.getState(), { count: 1 });
});

test('reducer method updates state', () => {
  const store = createStore(0, {
    inc(state) {
      return state + 1;
    }
  });
  store.inc();
  assert.equal(store.getState(), 1);
});

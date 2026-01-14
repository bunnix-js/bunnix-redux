import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStore } from '../src/store.mjs';

test('subscribe fires on update and can unsubscribe', () => {
  const store = createStore(0, {
    inc(state) {
      return state + 1;
    }
  });
  const calls = [];
  const unsubscribe = store.subscribe((state, event, args) => {
    calls.push({ state, event, args });
  });

  store.inc({ step: 1 });
  unsubscribe();
  store.inc({ step: 1 });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { state: 1, event: 'inc', args: { step: 1 } });
});

test('store.state is reactive', () => {
  const store = createStore(1, {
    update(state, args) {
      return args.value;
    }
  });
  const values = [];
  const dispose = store.state.subscribe((value) => values.push(value));
  store.update({ value: 2 });
  store.update({ value: 3 });
  dispose();
  store.update({ value: 4 });

  assert.deepEqual(values, [2, 3]);
});

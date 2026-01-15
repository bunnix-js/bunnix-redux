import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyMiddleware, createStore } from '../src/store.mjs';

test('middleware receives event args and next state', () => {
  const calls = [];
  const store = createStore(
    0,
    applyMiddleware((event, args, nextState) => {
      calls.push({ event, args, nextState });
    })({
      inc(state, args) {
        return state + args.step;
      }
    })
  );

  store.inc({ step: 3 });

  assert.deepEqual(calls, [
    { event: 'inc', args: { step: 3 }, nextState: 3 }
  ]);
});

test('middleware chain runs in order when next is called', () => {
  const order = [];
  const store = createStore(
    0,
    applyMiddleware(
      (event, args, nextState, next) => {
        order.push(`mw1:${event}:${nextState}`);
        return next();
      },
      (event, args, nextState, next) => {
        order.push(`mw2:${event}:${nextState}`);
        return next();
      }
    )({
      inc(state) {
        return state + 1;
      }
    })
  );

  store.inc();

  assert.deepEqual(order, ['mw1:inc:1', 'mw2:inc:1']);
});

test('middleware chain continues automatically when next is omitted', () => {
  const order = [];
  const store = createStore(
    0,
    applyMiddleware(
      (event, args, nextState) => {
        order.push(`mw1:${event}:${nextState}`);
      },
      (event, args, nextState) => {
        order.push(`mw2:${event}:${nextState}`);
      }
    )({
      inc(state) {
        return state + 1;
      }
    })
  );

  store.inc();

  assert.deepEqual(order, ['mw1:inc:1', 'mw2:inc:1']);
});

test('middleware chain stops when next is not called in manual mode', () => {
  const order = [];
  const store = createStore(
    0,
    applyMiddleware(
      (event, args, nextState, next) => {
        order.push(`mw1:${event}:${nextState}`);
      },
      (event, args, nextState) => {
        order.push(`mw2:${event}:${nextState}`);
      }
    )({
      inc(state) {
        return state + 1;
      }
    })
  );

  store.inc();

  assert.deepEqual(order, ['mw1:inc:1']);
});

test('auto-chain awaits async middleware before continuing', async () => {
  const order = [];
  let resolveGate;
  const gate = new Promise((resolve) => {
    resolveGate = resolve;
  });

  const store = createStore(
    0,
    applyMiddleware(
      (event, args, nextState) => {
        order.push(`mw1-start:${event}:${nextState}`);
        return gate.then(() => {
          order.push(`mw1-end:${event}:${nextState}`);
        });
      },
      (event, args, nextState) => {
        order.push(`mw2:${event}:${nextState}`);
      }
    )({
      inc(state) {
        return state + 1;
      }
    })
  );

  store.inc();
  assert.deepEqual(order, ['mw1-start:inc:1']);

  resolveGate();
  await gate;
  await Promise.resolve();

  assert.deepEqual(order, ['mw1-start:inc:1', 'mw1-end:inc:1', 'mw2:inc:1']);
});

test('manual next allows async gating before continuing', async () => {
  const order = [];
  let resolveGate;
  const gate = new Promise((resolve) => {
    resolveGate = resolve;
  });

  const store = createStore(
    0,
    applyMiddleware(
      async (event, args, nextState, next) => {
        order.push(`mw1-start:${event}:${nextState}`);
        await gate;
        order.push(`mw1-end:${event}:${nextState}`);
        return next();
      },
      (event, args, nextState) => {
        order.push(`mw2:${event}:${nextState}`);
      }
    )({
      inc(state) {
        return state + 1;
      }
    })
  );

  store.inc();
  assert.deepEqual(order, ['mw1-start:inc:1']);

  resolveGate();
  await gate;
  await Promise.resolve();

  assert.deepEqual(order, ['mw1-start:inc:1', 'mw1-end:inc:1', 'mw2:inc:1']);
});

test('middleware throwing synchronously stops chain', () => {
  const order = [];
  const store = createStore(
    0,
    applyMiddleware(
      (event, args, nextState) => {
        order.push(`mw1:${event}:${nextState}`);
        throw new Error('boom');
      },
      (event, args, nextState) => {
        order.push(`mw2:${event}:${nextState}`);
      }
    )({
      inc(state) {
        return state + 1;
      }
    })
  );

  assert.throws(() => store.inc(), /boom/);
  assert.deepEqual(order, ['mw1:inc:1']);
});

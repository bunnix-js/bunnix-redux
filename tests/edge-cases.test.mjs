import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyMiddleware, createStore } from '../src/store.mjs';

function createSimpleState(value) {
  const listeners = [];
  return {
    get: () => value,
    set: (next) => {
      value = next;
      listeners.forEach((cb) => cb(next));
    },
    subscribe: (cb) => {
      listeners.push(cb);
      return () => {
        const i = listeners.indexOf(cb);
        if (i > -1) listeners.splice(i, 1);
      };
    }
  };
}

function collectEvents(store) {
  const events = [];
  store.subscribe((state, event, args) => {
    events.push({ state, event, args });
  });
  return events;
}

test('API contract: reducer map creates methods and state-like store.state', () => {
  const store = createStore(0, {
    add(state, args) {
      return state + args.step;
    }
  });

  assert.equal(typeof store.add, 'function');
  assert.equal(typeof store.state.get, 'function');
  assert.equal(typeof store.state.set, 'function');
  assert.equal(typeof store.state.subscribe, 'function');

  const events = collectEvents(store);
  store.add({ step: 2 });

  assert.equal(store.getState(), 2);
  assert.deepEqual(events, [{ state: 2, event: 'add', args: { step: 2 } }]);
});

test('Reducer returns same state reference does not break and still emits', () => {
  const initial = { count: 1 };
  const store = createStore(initial, {
    noop(state) {
      return state;
    }
  });

  const events = collectEvents(store);
  store.noop({});

  assert.strictEqual(store.getState(), initial);
  assert.deepEqual(events, [{ state: initial, event: 'noop', args: {} }]);
});

test('Reducer returns undefined updates state to undefined', () => {
  const store = createStore(10, {
    wipe() {
      return undefined;
    }
  });

  const events = collectEvents(store);
  store.wipe({});

  assert.equal(store.getState(), undefined);
  assert.deepEqual(events, [{ state: undefined, event: 'wipe', args: {} }]);
});

test('Atomicity: multiple sequential calls preserve order', () => {
  const store = createStore(0, {
    inc(state) {
      return state + 1;
    }
  });

  const events = collectEvents(store);
  store.inc();
  store.inc();
  store.inc();

  assert.equal(store.getState(), 3);
  assert.deepEqual(
    events.map((entry) => entry.state),
    [1, 2, 3]
  );
});

test('Atomicity: interleaved reducers preserve event order', () => {
  const store = createStore(0, {
    add(state, args) {
      return state + args.n;
    },
    sub(state, args) {
      return state - args.n;
    }
  });

  const events = collectEvents(store);
  store.add({ n: 5 });
  store.sub({ n: 2 });
  store.add({ n: 1 });

  assert.equal(store.getState(), 4);
  assert.deepEqual(
    events.map((entry) => ({ event: entry.event, state: entry.state })),
    [
      { event: 'add', state: 5 },
      { event: 'sub', state: 3 },
      { event: 'add', state: 4 }
    ]
  );
});

test('Middleware chain runs sync then async after listeners', async () => {
  const order = [];
  let resolveAsync;
  const asyncDone = new Promise((resolve) => {
    resolveAsync = resolve;
  });

  const store = createStore(
    0,
    applyMiddleware(
      (event, args, nextState, next) => {
        order.push(`mw1:${event}:${nextState}`);
        return next();
      },
      (event, args, nextState) => {
        order.push(`mw2-start:${event}:${nextState}`);
        setTimeout(() => {
          order.push(`mw2-end:${event}:${nextState}`);
          resolveAsync();
        }, 10);
      }
    )({
      inc(state, args) {
        return state + args.step;
      }
    })
  );

  store.subscribe((state, event) => {
    order.push(`listener:${event}:${state}`);
  });

  store.inc({ step: 2 });

  assert.equal(store.getState(), 2);
  assert.deepEqual(order.slice(0, 3), [
    'listener:inc:2',
    'mw1:inc:2',
    'mw2-start:inc:2'
  ]);

  await asyncDone;
  assert.deepEqual(order, [
    'listener:inc:2',
    'mw1:inc:2',
    'mw2-start:inc:2',
    'mw2-end:inc:2'
  ]);
});

test('Middleware throwing surfaces error after state update', () => {
  const order = [];
  const store = createStore(
    0,
    applyMiddleware((event, args, nextState) => {
      order.push(`mw:${event}:${nextState}`);
      throw new Error('boom');
    })({
      inc(state) {
        return state + 1;
      }
    })
  );

  store.subscribe((state, event) => {
    order.push(`listener:${event}:${state}`);
  });

  assert.throws(() => store.inc(), /boom/);
  assert.equal(store.getState(), 1);
  assert.deepEqual(order, ['listener:inc:1', 'mw:inc:1']);
});

test('Slow middleware completes after state update', async () => {
  const order = [];
  let resolveAsync;
  const asyncDone = new Promise((resolve) => {
    resolveAsync = resolve;
  });

  const store = createStore(
    0,
    applyMiddleware((event, args, nextState) => {
      order.push(`mw-start:${event}:${nextState}`);
      setTimeout(() => {
        order.push(`mw-end:${event}:${nextState}`);
        resolveAsync();
      }, 15);
    })({
      inc(state) {
        return state + 1;
      }
    })
  );

  store.subscribe((state, event) => {
    order.push(`listener:${event}:${state}`);
  });

  store.inc();

  assert.equal(store.getState(), 1);
  assert.deepEqual(order, ['listener:inc:1', 'mw-start:inc:1']);

  await asyncDone;
  assert.deepEqual(order, ['listener:inc:1', 'mw-start:inc:1', 'mw-end:inc:1']);
});

test('Async initial load updates state and state bindings', async () => {
  const store = createStore(0, {
    init(state, args) {
      return args.data ?? state;
    }
  });

  const events = collectEvents(store);
  const stateEvents = [];
  store.state.subscribe((value) => stateEvents.push(value));

  await new Promise((resolve) => {
    setTimeout(() => {
      store.init({ data: 5 });
      resolve();
    }, 10);
  });

  assert.equal(store.getState(), 5);
  assert.deepEqual(events, [{ state: 5, event: 'init', args: { data: 5 } }]);
  assert.deepEqual(stateEvents, [5]);
});

test('Update while loading true still updates state and events', () => {
  const loading = createSimpleState(true);
  const store = createStore(0, {
    update(state, args) {
      return state + args.n;
    }
  });

  const events = collectEvents(store);
  const loadingEvents = [];
  loading.subscribe((value) => loadingEvents.push(value));

  store.update({ n: 3 });
  loading.set(false);

  assert.equal(store.getState(), 3);
  assert.deepEqual(events, [{ state: 3, event: 'update', args: { n: 3 } }]);
  assert.deepEqual(loadingEvents, [false]);
});

test('unsubscribe stops updates and can be called twice', () => {
  const store = createStore(0, {
    inc(state) {
      return state + 1;
    }
  });

  const events = [];
  const unsubscribe = store.subscribe((state, event) => {
    events.push(`${event}:${state}`);
  });

  store.inc();
  assert.doesNotThrow(() => {
    unsubscribe();
    unsubscribe();
  });
  store.inc();

  assert.equal(store.getState(), 2);
  assert.deepEqual(events, ['inc:1']);
});

test('Large arrays: add/update/remove maintain integrity and emit events', () => {
  const initial = Array.from({ length: 1000 }, (_, index) => ({
    id: index,
    value: index
  }));
  const store = createStore(initial, {
    add(state, args) {
      return [...state, args.item];
    },
    update(state, args) {
      return state.map((item) =>
        item.id === args.item.id ? args.item : item
      );
    },
    remove(state, args) {
      return state.filter((item) => item.id !== args.id);
    }
  });

  const events = [];
  store.subscribe((state, event) => {
    events.push({ event, length: state.length });
  });

  store.add({ item: { id: 1000, value: 1000 } });
  store.update({ item: { id: 500, value: 9999 } });
  store.remove({ id: 10 });

  const finalState = store.getState();
  assert.equal(finalState.length, 1000);
  assert.equal(finalState.find((item) => item.id === 500).value, 9999);
  assert.equal(finalState.some((item) => item.id === 10), false);
  assert.deepEqual(events, [
    { event: 'add', length: 1001 },
    { event: 'update', length: 1001 },
    { event: 'remove', length: 1000 }
  ]);
});

test('Nested objects update produces new tree and emits', () => {
  const initial = { profile: { name: 'Ana', tags: ['a', 'b'] } };
  const store = createStore(initial, {
    updateName(state, args) {
      return {
        ...state,
        profile: {
          ...state.profile,
          name: args.name,
          tags: [...state.profile.tags]
        }
      };
    }
  });

  const events = collectEvents(store);
  store.updateName({ name: 'Bea' });

  assert.deepEqual(store.getState(), {
    profile: { name: 'Bea', tags: ['a', 'b'] }
  });
  assert.deepEqual(events, [
    { state: store.getState(), event: 'updateName', args: { name: 'Bea' } }
  ]);
});

test('Reducer mutates in place and still emits (discouraged pattern)', () => {
  const initial = { count: 1, items: [1, 2] };
  const store = createStore(initial, {
    mutate(state) {
      state.count += 1;
      state.items.push(3);
      return state;
    }
  });

  const events = collectEvents(store);
  store.mutate();

  assert.strictEqual(store.getState(), initial);
  assert.deepEqual(store.getState(), { count: 2, items: [1, 2, 3] });
  assert.deepEqual(events, [
    { state: store.getState(), event: 'mutate', args: undefined }
  ]);
});

test('Calling a non-existent reducer throws and emits no events', () => {
  const store = createStore(0, {});
  const events = collectEvents(store);

  assert.throws(() => store.missing());
  assert.equal(store.getState(), 0);
  assert.deepEqual(events, []);
});

test('Reducer throws: state unchanged and no events emitted', () => {
  const store = createStore(0, {
    boom() {
      throw new Error('explode');
    }
  });

  const events = collectEvents(store);
  assert.throws(() => store.boom(), /explode/);

  assert.equal(store.getState(), 0);
  assert.deepEqual(events, []);
});

test('Accounts scenario: middleware persistence runs after listeners', () => {
  const order = [];
  const store = createStore(
    [],
    applyMiddleware((event, args, nextState) => {
      order.push(`mw:${event}:${nextState.length}`);
    })({
      add(state, args) {
        return [...state, args.account];
      },
      update(state, args) {
        return state.map((item) =>
          item.id === args.account.id ? args.account : item
        );
      },
      remove(state, args) {
        return state.filter((item) => item.id !== args.account.id);
      }
    })
  );

  store.subscribe((state, event) => {
    order.push(`listener:${event}:${state.length}`);
  });

  store.add({ account: { id: 1, name: 'A' } });
  store.update({ account: { id: 1, name: 'B' } });
  store.remove({ account: { id: 1, name: 'B' } });

  assert.deepEqual(store.getState(), []);
  assert.deepEqual(order, [
    'listener:add:1',
    'mw:add:1',
    'listener:update:1',
    'mw:update:1',
    'listener:remove:0',
    'mw:remove:0'
  ]);
});

test('Expenses per accountId are isolated across stores', () => {
  const stores = new Map();
  const useExpensesStore = (accountId) => {
    if (stores.has(accountId)) return stores.get(accountId);
    const store = createStore([], {
      add(state, args) {
        return [...state, args.expense];
      }
    });
    stores.set(accountId, store);
    return store;
  };

  const a = useExpensesStore('a');
  const b = useExpensesStore('b');
  const eventsA = collectEvents(a);
  const eventsB = collectEvents(b);

  a.add({ expense: { id: 1, amount: 10 } });

  assert.deepEqual(a.getState(), [{ id: 1, amount: 10 }]);
  assert.deepEqual(b.getState(), []);
  assert.deepEqual(eventsA, [
    { state: [{ id: 1, amount: 10 }], event: 'add', args: { expense: { id: 1, amount: 10 } } }
  ]);
  assert.deepEqual(eventsB, []);
});

test('Derived state map updates as store.state changes', () => {
  const store = createStore([], {
    add(state, args) {
      return [...state, args.item];
    },
    remove(state, args) {
      return state.filter((item) => item.id !== args.id);
    }
  });

  const events = collectEvents(store);
  const lengths = [];
  const derived = store.state.map((list) => list.length);
  derived.subscribe((value) => lengths.push(value));

  store.add({ item: { id: 1 } });
  store.add({ item: { id: 2 } });
  store.remove({ id: 1 });

  assert.deepEqual(store.getState(), [{ id: 2 }]);
  assert.deepEqual(
    events.map((entry) => entry.event),
    ['add', 'add', 'remove']
  );
  assert.deepEqual(lengths, [1, 2, 1]);
});

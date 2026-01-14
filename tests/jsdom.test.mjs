import assert from 'node:assert/strict';
import { test } from 'node:test';
import Bunnix, { useEffect, Compute } from '@bunnix/core';
import { createStore } from '../src/store.mjs';

test('global store binds to DOM and updates', () => {
  const counter = createStore(0, {
    increment(state) {
      return state + 1;
    }
  });

  const { div, p, button } = Bunnix;
  const View = () =>
    div([
      p(['Count: ', counter.state]),
      button({ click: () => counter.increment() }, 'Inc')
    ]);

  const container = document.createElement('div');
  Bunnix.render(View, container);

  assert.equal(container.textContent.includes('Count: 0'), true);
  counter.increment();
  assert.equal(container.textContent.includes('Count: 1'), true);
});

test('useEffect reacts to global store updates', () => {
  const counter = createStore(0, {
    increment(state) {
      return state + 1;
    }
  });
  const log = [];

  useEffect((val) => {
    log.push(val);
  }, [counter.state]);

  counter.increment();
  counter.increment();

  assert.deepEqual(log, [0, 1, 2]);
  assert.equal(counter.getState(), 2);
});

test('Compute derives from global store state', () => {
  const counter = createStore(1, {
    increment(state) {
      return state + 1;
    }
  });

  const doubled = Compute([counter.state], (value) => value * 2);

  const { p } = Bunnix;
  const View = () => p(['Double: ', doubled]);

  const container = document.createElement('div');
  Bunnix.render(View, container);

  assert.equal(container.textContent.includes('Double: 2'), true);
  counter.increment();
  assert.equal(container.textContent.includes('Double: 4'), true);
});

test('ForEach renders accounts from store', () => {
  const accounts = createStore([], {
    add(state, args) {
      return [...state, args.account];
    }
  });

  const { div, ul, li } = Bunnix;
  const View = () =>
    div([
      ul([Bunnix.ForEach(accounts.state, 'id', (acc) => li(acc.name))])
    ]);

  const container = document.createElement('div');
  Bunnix.render(View, container);

  accounts.add({ account: { id: 1, name: 'A' } });
  accounts.add({ account: { id: 2, name: 'B' } });

  const items = container.querySelectorAll('li');
  assert.equal(items.length, 2);
  assert.equal(items[0].textContent, 'A');
  assert.equal(items[1].textContent, 'B');
  assert.equal(accounts.getState().length, 2);
});

test('input updates store and DOM via bindings', () => {
  const profile = createStore({ name: '' }, {
    setName(state, args) {
      return { ...state, name: args.name };
    }
  });

  const name = profile.state.map((state) => state.name);
  const { div, input, p } = Bunnix;

  const View = () =>
    div([
      input({
        value: name,
        input: (event) => profile.setName({ name: event.target.value })
      }),
      p(['Name: ', name])
    ]);

  const container = document.createElement('div');
  Bunnix.render(View, container);

  const field = container.querySelector('input');
  field.value = 'Ada';
  field.dispatchEvent(new window.Event('input', { bubbles: true }));

  assert.equal(container.textContent.includes('Name: Ada'), true);
  assert.deepEqual(profile.getState(), { name: 'Ada' });
});

---
layout: default
title: API Reference
---

# API Reference

Public exports from `@bunnix/redux`.

## createStore(initialState, reducersOrMiddleware)

Creates a store with reducer methods and a reactive `state` value.

- `initialState`: any value used as the initial state
- `reducersOrMiddleware`: either a reducer map, or the output of `applyMiddleware`
- Returns a store with `getState`, `subscribe`, `state`, and reducer methods

Example:

```js
import { createStore } from '@bunnix/redux';

const todos = createStore([], {
  add(state, args) {
    return [...state, args.text];
  }
});

todos.add({ text: 'Ship docs' });
```

## applyMiddleware(...middlewares)

Wraps a reducer map with middleware. Each middleware receives the event name, args, and next state.

- If a middleware declares `next` (4th parameter), it must call `next()` to continue.
- If it does not declare `next`, the chain continues automatically and waits for Promises.

Example:

```js
import { applyMiddleware, createStore } from '@bunnix/redux';

const withLog = applyMiddleware((event, args, nextState) => {
  console.log(event, args, nextState);
});

const counter = createStore(
  0,
  withLog({
    increment(state) {
      return state + 1;
    }
  })
);
```

## Store shape

- `store.getState()` returns the current state
- `store.subscribe(listener)` listens to updates and returns an unsubscribe function
- `store.state` is a reactive Bunnix state object for binding in views
- `store[action](args)` runs a reducer and updates state

Example binding:

```js
import Bunnix from '@bunnix/core';
import { createStore } from '@bunnix/redux';

const counter = createStore(0, {
  increment(state) {
    return state + 1;
  }
});

const View = () => Bunnix('p', ['Count: ', counter.state]);
```

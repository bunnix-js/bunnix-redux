---
layout: default
title: Examples
---

# Examples

- [Counter store](#counter-store)
- [Middleware persistence](#middleware-persistence)
- [Async init](#async-init)

## Counter store

```js
import { createStore } from '@bunnix/redux';

const counter = createStore(0, {
  increment(state) {
    return state + 1;
  }
});

counter.increment();
```

## Middleware persistence

```js
import { applyMiddleware, createStore } from '@bunnix/redux';

const persist = applyMiddleware((event, args, nextState) => {
  localStorage.setItem('state', JSON.stringify(nextState));
});

const store = createStore(0, persist({
  inc(state) {
    return state + 1;
  }
}));
```

## Async init

```js
import { createStore } from '@bunnix/redux';

const store = createStore(null, {
  init(state, args) {
    return args.data;
  }
});

fetch('/api/data')
  .then((res) => res.json())
  .then((data) => store.init({ data }));
```

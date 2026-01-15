---
layout: default
title: Troubleshooting
---

# Troubleshooting

## Reducer method is undefined

Ensure you pass a reducer map to `createStore` or to `applyMiddleware`.

```js
const store = createStore(0, {
  inc(state) {
    return state + 1;
  }
});
```

## Middleware did not run

If you use `applyMiddleware`, pass the wrapped reducer map into `createStore`.

```js
const wrapped = applyMiddleware(mw)({ inc: (s) => s + 1 });
const store = createStore(0, wrapped);
```

## Middleware chain stops unexpectedly

If a middleware declares `next`, it must call `next()` to continue the chain.

## Async errors are not caught

Store methods are synchronous. Handle async errors inside the middleware.

```js
const safe = applyMiddleware(async (event, args, nextState) => {
  try {
    await persist(nextState);
  } catch (error) {
    console.error(error);
  }
});
```

## Missing peer dependency

This package expects `@bunnix/core` as a peer dependency. Install it if you see module resolution errors.

```bash
npm install @bunnix/core
```

---
layout: default
title: Bunnix Redux
---

# Bunnix Redux

Bunnix Redux is a small global state store for Bunnix apps. It provides a reducer based API and a state object that binds directly into Bunnix views.

## Fit in the Bunnix ecosystem

Use this module when you want shared state across multiple views, or when you prefer reducer style updates instead of local component state.

## Get started

- [Getting Started](/getting-started)

## Minimal example

```js
import { createStore } from '@bunnix/redux';

const counter = createStore(0, {
  increment(state) {
    return state + 1;
  }
});

counter.increment();
```

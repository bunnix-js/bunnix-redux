---
layout: default
title: Getting Started
---

# Getting Started

Install and wire a store into a Bunnix app.

## Install

```bash
npm install @bunnix/redux
```

## Minimal usage

```js
import { createStore } from '@bunnix/redux';

const counter = createStore(0, {
  increment(state) {
    return state + 1;
  }
});

counter.increment();
```

## Integrate with Bunnix

```js
import Bunnix from '@bunnix/core';
import { createStore } from '@bunnix/redux';

const counter = createStore(0, {
  increment(state) {
    return state + 1;
  }
});

const { button, p, div } = Bunnix;
const View = () => div([
  p(['Count: ', counter.state]),
  button({ click: () => counter.increment() }, 'Add')
]);

Bunnix.render(View, document.getElementById('root'));
```

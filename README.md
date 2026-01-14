# bunnix-redux

Bunnix Redux: global state management framework built for Bunnix.

## Install

```sh
npm install @bunnix/redux
```

## Usage

```js
import { createStore } from '@bunnix/redux';

const counter = createStore(0, {
  increment(state) {
    return state + 1;
  }
});

counter.increment();
```

## Bunnix bindings

`store.state` is a Bunnix `State`, so it can be used directly in views and props.

```js
import { createStore } from '@bunnix/redux';

const counter = createStore(0, {
  increment(state) {
    return state + 1;
  }
});

// Example Bunnix usage
const view = () => (
  <div>
    <button onclick={() => counter.increment()}>+</button>
    <span>{counter.state}</span>
  </div>
);
```

Built for Bunnix.

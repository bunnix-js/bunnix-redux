function State(value) {
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
    },
    map: (fn) => {
      const derived = State(fn(value));
      listeners.push((next) => derived.set(fn(next)));
      return derived;
    }
  };
}

function normalizeReducers(input) {
  if (input && input.reducerMap && input.middleware) return input;
  return { reducerMap: input || {}, middleware: null };
}

export function applyMiddleware(...middlewares) {
  return (reducers) => ({
    reducerMap: reducers,
    middleware: (event, args, nextState) => {
      let i = 0;
      const run = () => {
        const mw = middlewares[i++];
        if (!mw) return;
        return mw(event, args, nextState, run);
      };
      return run();
    }
  });
}

export function createStore(initialState, reducersOrMiddleware) {
  const state = State(initialState);
  const listeners = [];
  const { reducerMap, middleware } = normalizeReducers(reducersOrMiddleware);

  const getState = () => state.get();
  const subscribe = (cb) => {
    listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i > -1) listeners.splice(i, 1);
    };
  };

  const store = {
    state,
    getState,
    get: getState,
    set: (value) => state.set(value),
    subscribe
  };

  Object.entries(reducerMap || {}).forEach(([name, fn]) => {
    store[name] = (args) => {
      const next = fn(state.get(), args);
      state.set(next);
      listeners.forEach((cb) => cb(next, name, args));
      if (middleware) middleware(name, args, next);
      return next;
    };
  });

  return store;
}

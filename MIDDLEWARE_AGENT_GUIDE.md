# Middleware Simplification Guidance

This document provides detailed instructions for an AI coding agent to simplify
middleware usage so callers do not need to pass or call `next` explicitly.

## Goal

Make middleware chaining automatic when the middleware does not declare `next`.
If a middleware declares `next`, keep the current manual chaining behavior.
Support async middleware so execution order is preserved.

## Required Behavior

- If a middleware function has arity < 4 (no `next` parameter):
  - The framework must call the next middleware automatically.
  - If it returns a Promise, the chain must wait for it to resolve before
    continuing.
  - If it throws synchronously, the chain must stop and propagate the error.
- If a middleware function has arity >= 4 (declares `next`):
  - The middleware controls the flow by calling `next()`.
  - The chain must not continue unless `next()` is called.
- The store update and store listeners must still run before middleware,
  preserving the existing ordering.
- Errors thrown by manual middlewares should continue to surface to the caller
  after state update, matching current behavior.

## Implementation Notes

- This logic should live in `applyMiddleware` in `src/store.mjs`.
- The middleware signature should remain:
  `(event, args, nextState, next)`.
- Auto-chain path:
  - Call middleware with `(event, args, nextState)`.
  - If it returns a Promise, `await` it before continuing.
  - Then call `run()` for the next middleware.
- Manual path:
  - Call middleware with `(event, args, nextState, run)`.
  - The middleware decides when to call `run()`.

## Test Expectations

Add or update tests (prefer `tests/middleware.test.mjs`) to cover:
- Auto-chain runs all middlewares when `next` is omitted.
- Manual chain stops when `next()` is not called.
- Auto-chain waits for async middleware before continuing.
- Manual middleware can `await` before calling `next()`.
- Synchronous throw in auto-chain stops the chain and surfaces the error.

## Non-goals

- Do not change reducer execution, state updates, or store listener semantics.
- Do not change public API names or export paths.
- Do not make store methods async.

## Notes on Async Errors

Async errors (Promise rejections) do not propagate through `store.method()`
because it is synchronous. If needed, catch errors inside the middleware itself
and handle them (log, rethrow in microtask, etc.).

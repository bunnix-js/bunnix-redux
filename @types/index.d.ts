export interface Store<S> {
  getState(): S;
  subscribe(listener: (state: S, event: string, args: any) => void): () => void;
  state: {
    get(): S;
    set(value: S): void;
    subscribe(cb: (value: S) => void): () => void;
  };
}

export type Reducer<S, A = any> = (state: S, args: A) => S;

export function createStore<S, A = any>(
  initialState: S,
  reducersOrMiddleware:
    | Record<string, Reducer<S, A>>
    | {
        reducerMap: Record<string, Reducer<S, A>>;
        middleware: (event: string, args: A, nextState: S) => any;
      }
): Store<S> & Record<string, (args: A) => S>;

export function applyMiddleware<S, A = any>(
  ...middlewares: Array<(event: string, args: A, nextState: S, next: () => any) => any>
): (reducers: Record<string, Reducer<S, A>>) => {
  reducerMap: Record<string, Reducer<S, A>>;
  middleware: (event: string, args: A, nextState: S) => any;
};

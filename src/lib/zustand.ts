import { useReducer, useEffect, useRef } from 'react';

type SetState<S> = (partial: Partial<S> | ((state: S) => Partial<S>)) => void;
type GetState<S> = () => S;
type StateCreator<S> = (set: SetState<S>, get: GetState<S>) => S;

export function create<S>(creator: StateCreator<S>) {
  let state: S;
  const listeners = new Set<() => void>();

  const set: SetState<S> = (partial) => {
    const next = typeof partial === 'function' ? (partial as (s: S) => Partial<S>)(state) : partial;
    state = { ...state, ...next };
    listeners.forEach(l => l());
  };

  const get: GetState<S> = () => state;

  state = creator(set, get);

  function useStore(): S;
  function useStore<T>(selector: (state: S) => T): T;
  function useStore<T>(selector?: (state: S) => T): S | T {
    const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
    const selectorRef = useRef(selector);
    selectorRef.current = selector;

    useEffect(() => {
      listeners.add(forceUpdate);
      return () => { listeners.delete(forceUpdate); };
    }, []);

    return selector ? selector(state) : state;
  }

  return useStore;
}

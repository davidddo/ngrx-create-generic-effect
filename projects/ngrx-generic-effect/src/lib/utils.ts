import { Action } from '@ngrx/store';
import { On, OnCallbacks, UnpackAction } from './types';

export const onFn = <T, A>(
  on: On<A, T>,
  action: UnpackAction<A>,
  type: keyof OnCallbacks<T>,
) => {
  return (response: T | any) => {
    const onFns = typeof on === 'function' ? on(action) : on;
    const onFn = onFns[type];

    return typeof onFn !== 'function' ? (onFn as Action) : onFn(response);
  };
};

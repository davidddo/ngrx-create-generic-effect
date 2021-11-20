import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, ActionCreator, Creator } from '@ngrx/store';
import { FunctionWithParametersType } from '@ngrx/store/src/models';
import { Observable, of } from 'rxjs';
import {
  catchError,
  concatMap,
  delay,
  map,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';

type UnpackAction<T> = T extends string
  ? Extract<Action, { type: T }>
  : ReturnType<
      Extract<
        T,
        ActionCreator<string, FunctionWithParametersType<any[], object>>
      >
    >;

type On<A, T> = ((action: UnpackAction<A>) => OnCallbacks<T>) | OnCallbacks<T>;

type Method<A, T> =
  | ((action: UnpackAction<A>) => Observable<T>)
  | Observable<T>;

type CachingSelector<A> =
  | ((action: UnpackAction<A>) => Observable<boolean>)
  | Observable<boolean>;

interface OnCallbacks<T = any, E = any> {
  /**
   * Callback function which will be fired if the response of the HTTP service 
   * is successful.
   */
  success: ((response: T) => Action) | Action;
  failure: ((response: E) => Action) | Action;
}

interface Options {
  /**
   * The delay in milliseconds between the response of the HTTP service method
   * and execution of the execution callback method.
   */
  delay?: number;

  /**
   * Whether the action should be dispatched or not.
   */
  dispatch?: boolean;
}

const onFn = <T, A>(
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

/**
 * Creates a generic effect for interacting with a HTTP service method.
 *
 * @param allowedType The action on which the effect should get triggered
 *
 * @param method The HTTP method which will be called if the effect has been
 * triggered by the given action.
 *
 * @param on The callback functions for
 *
 * @param cachingSelector
 *
 * @returns
 */
export function createGenericEffect<
  T,
  AC extends ActionCreator<string, Creator>,
  AT extends string | AC,
>(
  allowedType: AT,
  method: Method<AT, T>,
  on: On<AT, T>,
  caching?: {
    selector: CachingSelector<AT>;
    on: Action;
  },
) {
  return (actions$: Actions, options?: Options) => {
    const withCaching = caching !== undefined && 'cache' in on;
    const apiCall$ = (action: UnpackAction<AT>) => {
      return (typeof method === 'function' ? method(action) : method).pipe(
        delay(options?.delay ?? 250),
        map(onFn(on, action, 'success')),
        catchError((response) => {
          return of(onFn(on, action, 'failure')(response));
        }),
      );
    };

    const effect = createEffect(
      () => {
        if (withCaching) {
          return actions$.pipe(
            ofType(allowedType),
            concatMap((action) =>
              of(action).pipe(
                withLatestFrom(
                  typeof caching.selector === 'function'
                    ? caching.selector(action)
                    : caching.selector,
                ),
              ),
            ),
            switchMap(([action, cached]) =>
              cached ? of(caching.on) : apiCall$(action),
            ),
          );
        }

        return actions$.pipe(ofType(allowedType), switchMap(apiCall$));
      },
      { dispatch: options?.dispatch ?? true },
    );

    return effect;
  };
}

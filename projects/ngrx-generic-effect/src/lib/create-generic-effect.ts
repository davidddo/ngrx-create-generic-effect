import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, ActionCreator, Creator } from '@ngrx/store';
import { of } from 'rxjs';
import {
  catchError,
  concatMap,
  delay,
  map,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';
import { CachingSelector, Method, On, Options, UnpackAction } from './types';
import { onFn } from './utils';

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

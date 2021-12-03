import { Action, ActionCreator } from '@ngrx/store';
import { FunctionWithParametersType } from '@ngrx/store/src/models';
import { Observable } from 'rxjs';

export type UnpackAction<T> = T extends string
  ? Extract<Action, { type: T }>
  : ReturnType<
      Extract<
        T,
        ActionCreator<string, FunctionWithParametersType<any[], object>>
      >
    >;

export type On<A, T> =
  | ((action: UnpackAction<A>) => OnCallbacks<T>)
  | OnCallbacks<T>;

export type Method<A, T> =
  | ((action: UnpackAction<A>) => Observable<T>)
  | Observable<T>;

export type CachingSelector<A> =
  | ((action: UnpackAction<A>) => Observable<boolean>)
  | Observable<boolean>;

export interface OnCallbacks<T = any, E = any> {
  /**
   * Callback function which will be fired if the response of the HTTP service
   * is successful.
   */
  success: ((response: T) => Action) | Action;
  failure: ((response: E) => Action) | Action;
}

export interface Options {
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

import {ExecutorCallback, IExecution} from './createExecutor';
import React from 'react';
import {useExecutor} from './useExecutor';

const NO_DEPS: React.DependencyList = [];

/**
 * Executes a callback when dependencies are changed and returns an {@link IExecution}.
 */
export function useExecution<T>(cb: ExecutorCallback<T>, deps?: React.DependencyList): IExecution<T> {
  const executor = useExecutor<T>();

  React.useEffect(() => {
    executor.execute(cb);
  }, deps || NO_DEPS);

  return executor;
}

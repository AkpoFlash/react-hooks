import AbortController from 'node-abort-controller';
import {createExecutor, IExecutor} from '../main/createExecutor';

global.AbortController = AbortController;

describe('createExecutor', () => {

  let listenerMock: jest.Mock;
  let executor: IExecutor<string | number>;

  beforeEach(() => {
    listenerMock = jest.fn();
    executor = createExecutor(listenerMock);
  });

  it('creates a blank executor', () => {
    expect(listenerMock).not.toHaveBeenCalled();
    expect(executor.disposed).toBe(false);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(undefined);
  });

  it('synchronously invokes callback with signal', () => {
    const cbMock = jest.fn();
    executor.execute(cbMock);

    expect(cbMock).toHaveBeenCalledTimes(1);
    expect(cbMock).toHaveBeenNthCalledWith(1, expect.objectContaining({aborted: false}));
  });

  it('synchronously resolves execution', () => {
    executor.execute(() => 123);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(123);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(undefined);
  });

  it('synchronously rejects execution', () => {
    executor.execute(() => {
      throw 'abc';
    });

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe('abc');
    expect(executor.promise).toBe(undefined);
  });

  it('asynchronously resolves execution', async () => {
    const promise = executor.execute(() => Promise.resolve(123));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.pending).toBe(true);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(123);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(undefined);
  });

  it('asynchronously rejects execution', async () => {
    const promise = executor.execute(() => Promise.reject('abc'));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.pending).toBe(true);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe('abc');
    expect(executor.promise).toBe(undefined);
  });

  it('does not notify listener on sequential asynchronous executions', async () => {
    executor.execute(() => Promise.resolve(123));
    executor.execute(() => Promise.resolve(456));

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  it('aborts pending execution if new execution is submitted', async () => {
    const cbMock = jest.fn(() => Promise.resolve(123));

    executor.execute(cbMock);

    const promise = executor.execute(() => 'abc');

    expect(cbMock).toHaveBeenNthCalledWith(1, expect.objectContaining({aborted: true}));
    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.result).toBe('abc');

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.result).toBe('abc');
  });

  it('synchronously resolves', () => {
    executor.resolve(123);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(123);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(undefined);
  });

  it('synchronously rejects', () => {
    executor.reject('abc');

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe('abc');
    expect(executor.promise).toBe(undefined);
  });

  it('stores only last result', () => {
    executor.reject('abc');
    executor.resolve(123);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(123);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(undefined);
  });

  it('stores only last reason', () => {
    executor.resolve(123);
    executor.reject('abc');

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe('abc');
    expect(executor.promise).toBe(undefined);
  });

  it('preserves previous result on asynchronous execution', () => {
    executor.resolve(123);
    const promise = executor.execute(() => Promise.resolve(456));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(true);
    expect(executor.resolved).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(123);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);
  });

  it('preserves previous reason on asynchronous execution', () => {
    executor.reject('abc');
    const promise = executor.execute(() => Promise.resolve(123));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(true);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe('abc');
    expect(executor.promise).toBe(promise);
  });

  it('does not invoke listener if result did not change after resolve', () => {
    executor.resolve(123);
    executor.resolve(123);

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  it('does not invoke listener if reason did not change after reject', () => {
    executor.reject('abc');
    executor.reject('abc');

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  it('does not invoke listener if result did not change after execute', () => {
    executor.resolve(123);
    executor.execute(() => 123);

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  it('does not invoke listener if reason did not change after execute', () => {
    executor.reject('abc');
    executor.execute(() => {
      throw 'abc';
    });

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  it('clears after resolve', () => {
    executor.resolve(123);
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(undefined);
  });

  it('clears after reject', () => {
    executor.reject('abc');
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(undefined);
  });

  it('clear does not interrupt execution', async () => {
    executor.resolve(123);
    const promise = executor.execute(() => Promise.resolve(456));
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.pending).toBe(true);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(4);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(456);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(undefined);
  });

  it('abort preserves result intact', () => {
    executor.resolve(123);
    executor.execute(() => Promise.resolve(456));
    executor.abort();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(123);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(undefined);
  });

  it('abort preserves reason intact', () => {
    executor.reject('abc');
    executor.execute(() => Promise.resolve(123));
    executor.abort();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe('abc');
    expect(executor.promise).toBe(undefined);
  });

  it('aborts pending execution', async () => {
    executor.resolve(123);
    const promise = executor.execute(() => Promise.resolve(456));
    executor.abort();
    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(123);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(undefined);
  });

  it('disposes executor', () => {
    executor.dispose();

    expect(executor.disposed).toBe(true);
  });

  it('disposal preserves result', () => {
    executor.resolve(123);
    executor.dispose();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(123);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(undefined);
  });

  it('disposal preserves reason', () => {
    executor.reject('abc');
    executor.dispose();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.resolved).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe('abc');
    expect(executor.promise).toBe(undefined);
  });

  it('does not execute after disposal', () => {
    const cbMock = jest.fn();

    executor.dispose();
    executor.execute(cbMock);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(cbMock).not.toHaveBeenCalled();
  });

  it('does not clear after disposal', () => {
    executor.resolve(123);
    executor.dispose();
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(2);
  });

  it('does not abort after disposal', () => {
    executor.resolve(123);
    executor.dispose();
    executor.abort();

    expect(listenerMock).toHaveBeenCalledTimes(2);
  });

  it('sequential disposal is a no-op', () => {
    executor.resolve(123);
    executor.dispose();
    executor.dispose();

    expect(listenerMock).toHaveBeenCalledTimes(2);
  });
});

// Helper to clear all mocks in a test
export const clearAllMocks = () => {
  jest.clearAllMocks();
  jest.useRealTimers();
};

// Helper to setup fake timers
export const setupFakeTimers = () => {
  jest.useFakeTimers();
};

// Helper to advance timers by time
export const advanceTimersByTime = async (ms: number) => {
  await jest.advanceTimersByTimeAsync(ms);
};

// Helper to run all timers
export const runAllTimers = async () => {
  await jest.runAllTimersAsync();
};

// Helper to create a mock event emitter spy
export const createEventEmitterSpy = (instance: any) => {
  return jest.spyOn(instance, 'emit');
};

// Helper to wait for next tick
export const waitForNextTick = () => new Promise((resolve) => process.nextTick(resolve));

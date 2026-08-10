export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  intervalMs: number,
): T & { flush: () => void; cancel: () => void } {
  let last = 0;
  let trailing: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const invoke = (args: Parameters<T>) => {
    last = Date.now();
    fn(...args);
  };

  const wrapped = ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = intervalMs - (now - last);
    lastArgs = args;

    if (remaining <= 0) {
      if (trailing) {
        clearTimeout(trailing);
        trailing = null;
      }
      invoke(args);
      return;
    }

    if (!trailing) {
      trailing = setTimeout(() => {
        trailing = null;
        if (lastArgs) invoke(lastArgs);
      }, remaining);
    }
  }) as T & { flush: () => void; cancel: () => void };

  wrapped.flush = () => {
    if (trailing && lastArgs) {
      clearTimeout(trailing);
      trailing = null;
      invoke(lastArgs);
    }
  };

  wrapped.cancel = () => {
    if (trailing) {
      clearTimeout(trailing);
      trailing = null;
    }
    lastArgs = null;
  };

  return wrapped;
}

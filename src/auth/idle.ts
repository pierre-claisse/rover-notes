export function createIdleWatch(options: { ms: number; onLock: () => void; now?: () => number }) {
  const now = options.now ?? (() => Date.now());
  let expiresAt = now() + options.ms;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (timer) clearTimeout(timer);
    const delay = Math.max(0, expiresAt - now());
    timer = setTimeout(() => {
      if (now() >= expiresAt) options.onLock();
    }, delay);
  };

  return {
    bump() {
      expiresAt = now() + options.ms;
      schedule();
    },
    check() {
      if (now() >= expiresAt) options.onLock();
    },
    stop() {
      if (timer) clearTimeout(timer);
    },
  };
}

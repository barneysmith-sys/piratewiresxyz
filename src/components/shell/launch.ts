let query: string | null = null;
const listeners = new Set<() => void>();

export const launchStore = {
  get: () => query,
  set: (value: string | null) => {
    if (query === value) return;
    query = value;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function createStudioAppStore({ projectId }) {
  const listeners = new Set();
  const state = { projectId };
  return {
    state,
    set(patch) {
      Object.assign(state, patch);
      listeners.forEach(listener => listener(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

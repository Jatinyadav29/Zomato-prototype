// Tiny global toast bus so any page can say "Added to bag" without prop drilling.
const listeners = new Set();
export function toast(message, tone = "ink") {
  listeners.forEach((l) => l({ id: Math.random().toString(36).slice(2), message, tone }));
}
export function onToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

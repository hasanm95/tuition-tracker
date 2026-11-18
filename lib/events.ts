type Fn = (count: number) => void;
const listeners = new Set<Fn>();

export function onQueueReplayed(fn: Fn): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitQueueReplayed(count: number): void {
  listeners.forEach((fn) => fn(count));
}

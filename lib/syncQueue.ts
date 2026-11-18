import { listMutations, deleteMutation, pushMutation } from './db';
import { emitQueueReplayed } from './events';

export async function queueMutation(url: string, method: string, body: unknown): Promise<void> {
  await pushMutation({ url, method, body: JSON.stringify(body) });
}

/** Replay queued mutations in order. Returns the number successfully sent. */
export async function replayQueue(): Promise<number> {
  const mutations = await listMutations();
  if (mutations.length === 0) return 0;
  let count = 0;
  for (const m of mutations) {
    try {
      const res = await fetch(m.url, {
        method: m.method,
        headers: { 'Content-Type': 'application/json' },
        body: m.body,
      });
      if (res.ok) {
        await deleteMutation(m.id!);
        count++;
      } else {
        break; // server error — stop, retry next time
      }
    } catch {
      break; // still offline
    }
  }
  if (count > 0) emitQueueReplayed(count);
  return count;
}

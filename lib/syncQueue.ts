import { listMutations, deleteMutation, pushMutation } from './db';
import { emitQueueReplayed } from './events';

export async function queueMutation(url: string, method: string, body: unknown): Promise<void> {
  await pushMutation({ url, method, body: JSON.stringify(body) });
}

// Guards against two replays running at once (mount + `online` event, StrictMode,
// multiple tabs) — each would POST the same queued payment, creating duplicates.
let replaying = false;

/** Replay queued mutations in order. Returns the number successfully sent. */
export async function replayQueue(): Promise<number> {
  if (replaying) return 0;
  replaying = true;
  try {
    const mutations = await listMutations();
    let count = 0;
    for (const m of mutations) {
      let res: Response;
      try {
        res = await fetch(m.url, {
          method: m.method,
          headers: { 'Content-Type': 'application/json' },
          body: m.body,
        });
      } catch {
        break; // network error — still offline, retry next time
      }
      if (res.ok) {
        // Stop if we can't clear the row: it's already saved server-side, so
        // continuing risks re-sending it on the next replay.
        try { await deleteMutation(m.id!); } catch { break; }
        count++;
      } else if (res.status >= 400 && res.status < 500) {
        // Terminal client error (e.g. 400 validation) — it will never succeed.
        // Drop it so one bad item can't block every payment queued behind it.
        try { await deleteMutation(m.id!); } catch { break; }
      } else {
        break; // 5xx / transient — stop, retry next time
      }
    }
    if (count > 0) emitQueueReplayed(count);
    return count;
  } finally {
    replaying = false;
  }
}

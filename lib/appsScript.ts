import 'server-only';

const BASE = process.env.APPS_SCRIPT_URL;
const TOKEN = process.env.APPS_SCRIPT_TOKEN;

type Params = Record<string, string | number | undefined>;

function assertConfigured(): { base: string; token: string } {
  if (!BASE || !TOKEN) {
    throw new Error(
      'Missing APPS_SCRIPT_URL or APPS_SCRIPT_TOKEN. Copy .env.local.example to .env.local and fill them in.'
    );
  }
  return { base: BASE, token: TOKEN };
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Backend did not return JSON. Check the deployment URL and that it is deployed as a Web app. Raw: ' + text.slice(0, 200));
  }
  if (!data.ok) throw new Error(data.error || 'Backend error');
  return data as T;
}

/**
 * Call the Apps Script backend. Always POST with the token in the JSON body —
 * never in the query string — so the secret can't leak into server/access logs,
 * browser history, or the Referer header. Reads and writes use the same path;
 * the backend routes on `action`.
 */
async function call<T>(action: string, payload: Params = {}): Promise<T> {
  const { base, token } = assertConfigured();
  const body: Params = { action, token };
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) body[k] = v;
  }
  const res = await fetch(base, {
    method: 'POST',
    // text/plain avoids a CORS preflight; harmless since we call server-side.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return parse<T>(res);
}

/** Read from the Apps Script backend. */
export async function query<T>(action: string, params: Params = {}): Promise<T> {
  return call<T>(action, params);
}

/** Write to the Apps Script backend. */
export async function mutate<T>(action: string, payload: Params = {}): Promise<T> {
  return call<T>(action, payload);
}

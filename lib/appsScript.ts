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

/** GET request to the Apps Script backend (reads). */
export async function query<T>(action: string, params: Params = {}): Promise<T> {
  const { base, token } = assertConfigured();
  const url = new URL(base);
  url.searchParams.set('action', action);
  url.searchParams.set('token', token);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return parse<T>(res);
}

/** POST request to the Apps Script backend (writes). */
export async function mutate<T>(action: string, payload: Params = {}): Promise<T> {
  const { base, token } = assertConfigured();
  const res = await fetch(base, {
    method: 'POST',
    // text/plain avoids a CORS preflight; harmless since we call server-side.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token, ...payload }),
    cache: 'no-store',
  });
  return parse<T>(res);
}

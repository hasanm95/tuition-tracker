/**
 * True when an error means the Apps Script backend isn't wired up yet —
 * e.g. the request got redirected to a Google sign-in page and returned HTML
 * instead of JSON, or the env vars are missing. These are setup problems the
 * user fixes once on /setup, not transient failures worth a raw error dump.
 */
export function isNotConnected(error: string | null | undefined): boolean {
  return !!error && /APPS_SCRIPT|not return JSON|deployment URL|accounts\.google\.com|Unauthorized/i.test(error);
}

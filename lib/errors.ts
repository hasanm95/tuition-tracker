/**
 * True when an error means the Apps Script backend isn't wired up yet —
 * e.g. the request got redirected to a Google sign-in page and returned HTML
 * instead of JSON, or the token/env vars are missing. Fixed once on /setup.
 */
export function isNotConnected(error: string | null | undefined): boolean {
  return !!error && /APPS_SCRIPT|not return JSON|deployment URL|accounts\.google\.com|Unauthorized/i.test(error);
}

/**
 * True when the backend IS connected but running an older Code.gs that doesn't
 * know a newer action (e.g. "Unknown action: listPayments"). Fixed by pasting
 * the latest code into Apps Script and deploying a new version.
 */
export function isBackendOutdated(error: string | null | undefined): boolean {
  return !!error && /Unknown action/i.test(error);
}

/** Either a not-connected or an outdated-backend error — both block normal use. */
export function isSetupError(error: string | null | undefined): boolean {
  return isNotConnected(error) || isBackendOutdated(error);
}

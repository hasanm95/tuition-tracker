'use client';

import { useEffect, useState } from 'react';

// Chrome fires this before offering install; it's not in the standard DOM lib types.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'ft-install-dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Already installed (launched standalone)? Nothing to offer.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Dismissed earlier on this device? Respect that.
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // ignore storage errors (private mode, etc.)
    }

    // iOS has no beforeinstallprompt — show a manual hint for Safari.
    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const iosSafari = ios && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (iosSafari) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault(); // stop Chrome's own mini-banner; we show our own button
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => setShow(false);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="install-bar">
      <div className="install-text">
        {isIOS ? (
          <>
            Install this app: tap <strong>Share</strong>, then{' '}
            <strong>Add to Home Screen</strong>.
          </>
        ) : (
          <>Install Fee Tracker for one-tap access, like an app.</>
        )}
      </div>
      <div className="install-actions">
        {!isIOS && (
          <button className="btn" style={{ width: 'auto' }} onClick={install}>
            Install
          </button>
        )}
        <button className="btn ghost" style={{ width: 'auto' }} onClick={dismiss}>
          {isIOS ? 'Got it' : 'Not now'}
        </button>
      </div>
    </div>
  );
}

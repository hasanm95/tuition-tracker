'use client';

import { useState } from 'react';
import Link from 'next/link';

function genToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function SetupPage() {
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  async function copyCode() {
    try {
      const res = await fetch('/Code.gs.txt', { cache: 'no-store' });
      const code = await res.text();
      await navigator.clipboard.writeText(code);
      setCopied('code');
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Set up your data</h1>
          <div className="sub">One-time setup · about 10 minutes</div>
        </div>
        <Link href="/" className="btn ghost">Done</Link>
      </div>

      <div className="card">
        <p style={{ marginTop: 0 }}>
          This app stores everything in <strong>your own Google Sheet</strong>, in{' '}
          <strong>your</strong> Google account. Nobody else can see it. You do this setup
          once; after that the app reads and writes that sheet for you.
        </p>
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
          At the end you&apos;ll have two values — a <strong>link</strong> and a{' '}
          <strong>token</strong> — to send to whoever set up this app for you. They paste
          those in once and the app goes live. You keep the sheet forever.
        </p>
      </div>

      <ol className="steps">
        <li className="step">
          <div className="step-head">Create a Google Sheet</div>
          <div className="step-body">
            Go to <a className="lnk" href="https://sheets.new" target="_blank" rel="noreferrer">sheets.new</a>{' '}
            (signed in with the Google account that should own this data). A blank sheet
            opens. You can name it “Tuition” — you won&apos;t touch it by hand again.
          </div>
        </li>

        <li className="step">
          <div className="step-head">Open the script editor</div>
          <div className="step-body">
            In that sheet&apos;s menu, click <strong>Extensions → Apps Script</strong>. A
            code editor opens in a new tab. Delete whatever sample code is shown so the
            file is empty.
          </div>
        </li>

        <li className="step">
          <div className="step-head">Paste in the backend code</div>
          <div className="step-body">
            Copy the code below and paste it into the empty editor.
            <div className="row-gap" style={{ marginTop: 10 }}>
              <button className="btn secondary" onClick={copyCode}>
                {copied === 'code' ? 'Copied ✓' : 'Copy the code'}
              </button>
              <a className="btn secondary" href="/Code.gs.txt" target="_blank" rel="noreferrer">
                View it
              </a>
            </div>
          </div>
        </li>

        <li className="step">
          <div className="step-head">Set your secret token</div>
          <div className="step-body">
            Generate a token below and paste it into the line near the top of the code that
            reads <code className="inline">var API_TOKEN = &apos;...&apos;</code>, replacing
            the placeholder between the quotes. Keep a copy — you&apos;ll send it along at
            the end.
            <div style={{ marginTop: 10 }}>
              <button className="btn secondary" onClick={() => setToken(genToken())}>
                {token ? 'Generate a new one' : 'Generate token'}
              </button>
              {token && (
                <div className="valuebox" style={{ marginTop: 10 }}>
                  <code>{token}</code>
                  <button className="btn ghost" onClick={() => copy(token, 'token')}>
                    {copied === 'token' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </li>

        <li className="step">
          <div className="step-head">Create the tabs</div>
          <div className="step-body">
            At the top of the editor, pick <strong>setup</strong> from the function
            dropdown (next to the Run button) and click <strong>Run</strong>. Google will
            ask for permission the first time — choose your account, click{' '}
            <strong>Advanced → Go to (project) → Allow</strong>. This creates the{' '}
            <strong>Students</strong> and <strong>Payments</strong> tabs in your sheet.
          </div>
        </li>

        <li className="step">
          <div className="step-head">Publish it as a web app</div>
          <div className="step-body">
            Click <strong>Deploy → New deployment</strong>. Click the gear icon and choose{' '}
            <strong>Web app</strong>. Set:
            <ul className="tight">
              <li><strong>Execute as:</strong> Me</li>
              <li><strong>Who has access:</strong> Anyone</li>
            </ul>
            <span className="muted" style={{ fontSize: 13 }}>
              “Anyone” is safe here — the token you set is what actually protects your data.
            </span>
            <br />
            Click <strong>Deploy</strong>, allow access if asked, then{' '}
            <strong>copy the Web app URL</strong>. It ends in <code className="inline">/exec</code>.
          </div>
        </li>

        <li className="step">
          <div className="step-head">Send these two values</div>
          <div className="step-body">
            Send the person who set up this app:
            <ul className="tight">
              <li>the <strong>Web app URL</strong> (ends in <code className="inline">/exec</code>)</li>
              <li>the <strong>token</strong> you generated in step 4</li>
            </ul>
            That&apos;s it. They paste those in once, and your app starts showing your
            students. You never have to do this again.
          </div>
        </li>
      </ol>

      <div className="card center muted" style={{ fontSize: 13 }}>
        Later edits to the code: in the editor, <strong>Deploy → Manage deployments</strong>,
        edit the existing one, and choose Version → New version. That keeps the same URL.
      </div>

      <Link href="/" className="btn" style={{ marginTop: 4 }}>
        Back to app
      </Link>
    </>
  );
}

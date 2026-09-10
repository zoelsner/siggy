"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { SUPPORT_EMAIL } from "@/lib/site";
import { requestAccessRestore } from "@/lib/billing/request-restore";

export default function RestorePage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFailed(false);
    try {
      await requestAccessRestore(email);
      setSent(true);
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="legal-page">
      <a href="/" className="legal-page__back">&larr; Back to Siggy</a>
      <h1>Restore access</h1>
      <p>
        Lost your access on a new browser or computer? Enter the email you used at checkout and
        we&rsquo;ll send a fresh access link if we find a purchase.
      </p>

      {sent ? (
        <p>
          If that email has a Siggy purchase, we&rsquo;ve sent an access link. Check your inbox
          (and spam folder) in a few minutes.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          {failed ? (
            <p role="alert">Couldn&rsquo;t request your access link right now. Please try again later, or email us below for help.</p>
          ) : null}
          <div className="field">
            <label htmlFor="restore-email">Email</label>
            <input
              id="restore-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <p>
            <button className="button button--primary" type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send access link"}
            </button>
          </p>
        </form>
      )}

      <p className="legal-page__updated">
        Still stuck? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </main>
  );
}

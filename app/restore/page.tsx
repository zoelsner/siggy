"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { SUPPORT_EMAIL } from "@/lib/site";

export default function RestorePage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/billing/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Always show the success state — the response never reveals whether a
      // purchase was found, so a network error looks the same to the user.
    }
    setSubmitting(false);
    setSent(true);
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

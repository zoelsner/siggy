"use client";

import { useState } from "react";

export function LicenseInput({ onUnlock }: { onUnlock: (key: string) => Promise<boolean> }) {
  const [show, setShow] = useState(false);
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "invalid">("idle");

  async function handleSubmit() {
    if (!key.trim() || status === "verifying") return;
    setStatus("verifying");
    const valid = await onUnlock(key.trim());
    if (!valid) {
      setStatus("invalid");
    }
  }

  if (!show) {
    return (
      <button className="license-toggle" onClick={() => setShow(true)} type="button">
        Have a license key?
      </button>
    );
  }

  return (
    <div className="license-input">
      <input
        className="license-input__field"
        onChange={(e) => {
          setKey(e.target.value);
          if (status === "invalid") setStatus("idle");
        }}
        onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
        placeholder="Paste your license key"
        value={key}
      />
      <button
        className="button button--primary button--small"
        disabled={!key.trim() || status === "verifying"}
        onClick={handleSubmit}
        type="button"
      >
        {status === "verifying" ? "Verifying..." : "Activate"}
      </button>
      {status === "invalid" ? (
        <span className="license-input__error">Invalid key. Check your email for the correct key.</span>
      ) : null}
    </div>
  );
}

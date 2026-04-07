"use client";

import { useCallback, useEffect, useState } from "react";

export { CHECKOUT_URL } from "./checkout";

async function verifyLicense(licenseKey: string): Promise<boolean> {
  try {
    const res = await fetch("/api/verify-license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { valid?: boolean };
    return data.valid === true;
  } catch {
    return false;
  }
}

export function useUnlocked() {
  const [unlocked, setUnlocked] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    async function resolve() {
      // Re-verify stored license key for returning users
      const storedKey = localStorage.getItem("siggy_license");
      if (storedKey) {
        const valid = await verifyLicense(storedKey);
        if (valid) {
          setUnlocked(true);
        } else {
          localStorage.removeItem("siggy_license");
        }
      }
      setResolved(true);
    }

    void resolve();
  }, []);

  const unlock = useCallback(async (licenseKey: string): Promise<boolean> => {
    const valid = await verifyLicense(licenseKey);
    if (valid) {
      localStorage.setItem("siggy_license", licenseKey);
      setUnlocked(true);
    }
    return valid;
  }, []);

  return { unlocked, resolved, unlock };
}

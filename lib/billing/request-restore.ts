// Success remains generic: the server never reveals whether a purchase exists.
// Transport failures are different — the request has not been accepted for processing.
export async function requestAccessRestore(email: string): Promise<void> {
  const response = await fetch("/api/billing/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });
  if (!response.ok) throw new Error("restore_request_failed");
}

import { SITE_URL } from "@/lib/site";

export type AccessEmailKind = "receipt" | "restore";

const COPY: Record<AccessEmailKind, { subject: string; intro: string }> = {
  receipt: {
    subject: "Thanks for unlocking Siggy — here's your permanent access link",
    intro: "Thanks for unlocking Siggy! Here's your permanent access link.",
  },
  restore: {
    subject: "Here's your Siggy access link",
    intro: "Here's your Siggy access link.",
  },
};

export async function sendAccessEmail({
  to,
  token,
  kind,
}: {
  to: string;
  token: string;
  kind: AccessEmailKind;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const { subject, intro } = COPY[kind];
  const link = `${SITE_URL}/editor?access_token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${intro}</p>
      <p style="margin: 0 0 24px;">
        <a href="${link}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Open Siggy
        </a>
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #666666; margin: 0 0 8px;">
        This link unlocks Siggy on any browser or computer — keep it somewhere safe.
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #666666; margin: 0;">
        Or paste this URL directly: ${link}
      </p>
    </div>
  `;

  const text = `${intro}\n\nOpen Siggy: ${link}\n\nThis link unlocks Siggy on any browser or computer — keep it somewhere safe.`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Siggy <access@trysiggy.com>",
      to,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend request failed (${res.status}): ${body}`);
  }
}

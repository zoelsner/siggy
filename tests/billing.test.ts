import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { signAccessToken, verifyAccessToken } from "@/lib/billing/token";
import { POST as render } from "@/app/api/render/route";
import { createFixture } from "@/lib/fixtures";

afterEach(() => vi.unstubAllEnvs());

describe("watermark purchase proof", () => {
  it("keeps the watermark when an untrusted request claims it is unlocked", async () => {
    vi.stubEnv("SIGGY_TOKEN_SECRET", "local-regression-secret-only");
    const response = await render(new NextRequest("http://localhost/api/render", {
      method: "POST", body: JSON.stringify({ document: createFixture("full"), unlocked: true, token: "forged.token" }),
    }));
    expect(response.status).toBe(200);
    expect((await response.json()).html).toContain("Made with Siggy");
  });

  it("removes only the watermark for a valid signed access token", async () => {
    vi.stubEnv("SIGGY_TOKEN_SECRET", "local-regression-secret-only");
    const token = await signAccessToken("cs_test_regression");
    const document = { ...createFixture("full"), templateId: "card", fontFamily: "fraunces" };
    const response = await render(new NextRequest("http://localhost/api/render", {
      method: "POST", body: JSON.stringify({ document, token }),
    }));
    const { html } = await response.json();
    expect(html).not.toContain("Made with Siggy");
    expect(html).toContain("Fraunces");
    expect(html).toContain("avatar.jpg");
  });

  it("rejects modified purchase claims and tokens signed with another secret", async () => {
    vi.stubEnv("SIGGY_TOKEN_SECRET", "local-regression-secret-only");
    const token = await signAccessToken("cs_test_regression");
    expect((await verifyAccessToken(token))?.sid).toBe("cs_test_regression");
    const [payload, signature] = token.split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    const modified = Buffer.from(JSON.stringify({ ...claims, sid: "another" })).toString("base64url");
    expect(await verifyAccessToken(`${modified}.${signature}`)).toBeNull();
    vi.stubEnv("SIGGY_TOKEN_SECRET", "different-local-secret");
    expect(await verifyAccessToken(token)).toBeNull();
  });
});

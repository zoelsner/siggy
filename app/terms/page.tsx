import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Siggy",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <a href="/" className="legal-page__back">&larr; Back to Siggy</a>
      <h1>Terms &amp; Conditions</h1>
      <p className="legal-page__updated">Last updated: March 30, 2026</p>

      <h2>1. Overview</h2>
      <p>
        Siggy (&ldquo;Service&rdquo;) is an email signature builder operated by Zach Oelsner
        (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By using the Service, you agree
        to these Terms &amp; Conditions (&ldquo;Terms&rdquo;). If you do not agree, do not use the
        Service.
      </p>

      <h2>2. License</h2>
      <p>
        Upon purchase of a lifetime deal (&ldquo;License&rdquo;), you receive a non-exclusive,
        non-transferable, perpetual license to use Siggy for generating email signatures for
        personal or business use. The License covers one individual user.
      </p>

      <h2>3. Payment &amp; Refunds</h2>
      <p>
        Payments are processed through Lemon Squeezy. All sales are final. If you experience a
        technical issue that prevents you from using the Service, contact us within 14 days of
        purchase and we will work to resolve it or issue a refund at our discretion.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Resell, redistribute, or sublicense the Service or its output.</li>
        <li>Use the Service to send spam or misleading communications.</li>
        <li>Attempt to reverse-engineer, decompile, or extract the source code of the Service.</li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <p>
        The Service, including its design, code, and branding, is owned by us. The email signatures
        you create using the Service are yours to use freely.
      </p>

      <h2>6. Data &amp; Privacy</h2>
      <p>
        We do not collect personal data beyond what you voluntarily enter into the signature editor.
        Uploaded images are stored via Vercel Blob storage and are used solely to render your
        signature. We do not sell or share your data with third parties.
      </p>

      <h2>7. Disclaimer of Warranties</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any kind, express or
        implied. We do not guarantee that the Service will be uninterrupted, error-free, or
        compatible with all email clients.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, we shall not be liable for any indirect, incidental,
        or consequential damages arising from your use of the Service. Our total liability shall not
        exceed the amount you paid for the License.
      </p>

      <h2>9. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service after changes
        constitutes acceptance of the updated Terms.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these Terms? Email us at{" "}
        <a href="mailto:zach@siggy.app">zach@siggy.app</a>.
      </p>
    </main>
  );
}

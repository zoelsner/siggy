"use client";

import type { ClientProfileId } from "@/lib/types";

const guides = {
  gmail_web: {
    name: "Gmail", surface: "Gmail settings on desktop",
    help: "https://support.google.com/mail/answer/8395?hl=en",
    steps: ["Open Gmail on desktop, then choose Settings and See all settings.", "In General, scroll to Signature and create or select a signature.", "Paste your copied signature into the signature editor.", "Choose defaults for new messages and replies, then click Save Changes."],
  },
  outlook_web: {
    name: "Outlook", surface: "Outlook on the web or new Outlook",
    help: "https://support.microsoft.com/en-us/outlook/mail/how-to-add-and-change-an-email-signature-in-outlook",
    steps: ["Open Outlook Settings, then Accounts and Signatures.", "Choose your account and create or edit a signature.", "Paste your copied signature, choose defaults for new messages and replies, then save."],
  },
  outlook_windows_classic: {
    name: "Outlook classic", surface: "classic Outlook for Windows",
    help: "https://support.microsoft.com/en-us/outlook/mail/how-to-add-and-change-an-email-signature-in-outlook",
    steps: ["Open a new message in classic Outlook, then choose Signature and Signatures.", "Create or select a signature and paste your copied signature.", "Assign the account and defaults for new messages and replies, then choose OK."],
  },
  apple_mail: {
    name: "Apple Mail", surface: "Mail settings on Mac",
    help: "https://support.apple.com/guide/mail/change-signatures-settings-cpmlprefsig/mac",
    steps: ["Open Mail on your Mac, then choose Mail, Settings, and Signatures.", "Select your email account and add or select a signature.", "Turn off Always match my default message font if you want to keep the copied formatting, then paste your signature.", "Assign the signature to your account and choose its default in Choose Signature."],
  },
} satisfies Record<ClientProfileId, { name: string; surface: string; help: string; steps: string[] }>;

interface InstallGuideProps {
  profileId?: ClientProfileId;
  isOpen: boolean;
  isConfirmed: boolean;
  onToggle: () => void;
  onConfirmInstall: () => void;
}

export function InstallGuide({
  profileId = "gmail_web",
  isOpen,
  isConfirmed,
  onToggle,
  onConfirmInstall
}: InstallGuideProps) {
  const guide = guides[profileId];
  return (
    <section className="install-guide">
      <button className="install-guide__toggle" onClick={onToggle} type="button" aria-expanded={isOpen}>
        <div>
          <div className="eyebrow">Install guide</div>
          <strong>Paste into {guide.surface}</strong>
        </div>
        <span className="mono">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen ? (
        <div className="install-guide__body">
          <ol className="install-guide__steps">
            {guide.steps.map(step => <li key={step}>{step}</li>)}
            <li>Compose a draft to check the result before using it in your emails.</li>
          </ol>
          <div className="install-guide__footer">
            <a
              className="button button--subtle"
              href={guide.help}
              rel="noreferrer"
              target="_blank"
            >
              Open official {guide.name} help
            </a>
            <button className="button button--primary" onClick={onConfirmInstall} type="button">
              {isConfirmed ? `Installed in ${guide.name}` : `I installed it in ${guide.name}`}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

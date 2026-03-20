"use client";

interface InstallGuideProps {
  isOpen: boolean;
  isConfirmed: boolean;
  onToggle: () => void;
  onConfirmInstall: () => void;
}

export function InstallGuide({
  isOpen,
  isConfirmed,
  onToggle,
  onConfirmInstall
}: InstallGuideProps) {
  return (
    <section className="install-guide">
      <button className="install-guide__toggle" onClick={onToggle} type="button">
        <div>
          <div className="eyebrow">Install guide</div>
          <strong>Paste into Gmail settings on desktop</strong>
        </div>
        <span className="mono">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen ? (
        <div className="install-guide__body">
          <ol className="install-guide__steps">
            <li>Open Gmail on desktop, then choose Settings and See all settings.</li>
            <li>In General, scroll to Signature and click Create new.</li>
            <li>Paste the copied Siggy HTML into the signature editor.</li>
            <li>Set the signature as the default for new emails and replies if you want full rollout.</li>
            <li>Scroll down and click Save Changes, then send yourself a test email.</li>
          </ol>
          <div className="install-guide__footer">
            <a
              className="button button--subtle"
              href="https://support.google.com/mail/answer/8395?hl=en"
              rel="noreferrer"
              target="_blank"
            >
              Open official Gmail help
            </a>
            <button className="button button--primary" onClick={onConfirmInstall} type="button">
              {isConfirmed ? "Install confirmed" : "I installed it in Gmail"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

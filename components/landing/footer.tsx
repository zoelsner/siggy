import { PROFESSIONS } from "@/lib/professions";
import { SUPPORT_EMAIL } from "@/lib/site";

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer__professions">
        <span>Signatures by profession</span>
        {PROFESSIONS.map((profession) => (
          <a key={profession.slug} href={`/for/${profession.slug}`}>
            {profession.plural}
          </a>
        ))}
      </div>
      <div className="landing-footer__row">
        <span>&copy; {new Date().getFullYear()} Siggy</span>
        <a href="/terms">Terms</a>
        <a href="/restore">Restore access</a>
        <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>
      </div>
    </footer>
  );
}

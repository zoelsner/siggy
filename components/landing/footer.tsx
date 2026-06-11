import { SUPPORT_EMAIL } from "@/lib/site";

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <span>&copy; {new Date().getFullYear()} Siggy</span>
      <a href="/terms">Terms</a>
      <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>
    </footer>
  );
}

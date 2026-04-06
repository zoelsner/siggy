export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <span>&copy; {new Date().getFullYear()} Siggy</span>
      <a href="/terms">Terms</a>
      <a href="mailto:hello@siggy.email">Contact</a>
    </footer>
  );
}

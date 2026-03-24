import { StudioShell } from "@/components/studio-shell";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <span className="hero__eyebrow">Email signature builder</span>
        <h1 className="hero__headline">
          Stop sending emails with a default signature.
        </h1>
        <p className="hero__desc">
          Siggy renders your name in custom typography — DM Sans, Montserrat, Unbounded — as a pixel-perfect image. Your email signature looks designed, not generated.
        </p>
      </section>
      <StudioShell />
    </>
  );
}

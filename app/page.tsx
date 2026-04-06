import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { Pricing } from "@/components/landing/pricing";
import { Templates } from "@/components/landing/templates";

export default function HomePage() {
  return (
    <div className="landing">
      <LandingNav />
      <Hero />
      <Templates />
      <HowItWorks />
      <Pricing />
      <LandingFooter />
    </div>
  );
}

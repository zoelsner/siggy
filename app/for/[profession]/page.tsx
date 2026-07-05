import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LandingPage } from "@/components/landing/landing-page";
import { getProfession, PROFESSIONS } from "@/lib/professions";

export function generateStaticParams() {
  return PROFESSIONS.map((profession) => ({ profession: profession.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ profession: string }>;
}): Promise<Metadata> {
  const { profession: slug } = await params;
  const profession = getProfession(slug);
  if (!profession) return {};

  return {
    title: profession.title,
    description: profession.metaDescription,
    alternates: {
      canonical: `/for/${profession.slug}`
    },
    openGraph: {
      title: profession.title,
      description: profession.metaDescription,
      url: `/for/${profession.slug}`,
      siteName: "Siggy",
      type: "website"
    }
  };
}

export default async function ProfessionPage({
  params
}: {
  params: Promise<{ profession: string }>;
}) {
  const { profession: slug } = await params;
  const profession = getProfession(slug);
  if (!profession) notFound();

  return <LandingPage profession={profession} />;
}

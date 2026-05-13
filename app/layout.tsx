import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://siggy-orpin.vercel.app"),
  title: "Siggy — Email signatures that don't look like Arial 11pt",
  description:
    "An email signature builder that makes you look sharp in every inbox. $19, own it forever, no subscription.",
  openGraph: {
    title: "Siggy — Email signatures that don't look like Arial 11pt",
    description:
      "Pick a template, customize your details, copy the HTML. $19, own it forever, no subscription.",
    url: "/",
    siteName: "Siggy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Siggy — Email signatures that don't look like Arial 11pt",
    description:
      "Pick a template, customize your details, copy the HTML. $19, own it forever, no subscription.",
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Montserrat:wght@400;700;900&family=Geist+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

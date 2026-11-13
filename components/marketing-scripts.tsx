"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

import { captureAttribution } from "@/lib/attribution";
import { hasAccessParams } from "@/lib/billing/access-params";

export function MarketingScripts() {
  // Fail closed: ad scripts read location.href, so they never load while a
  // purchase credential is still in the URL (see lib/billing/access-params.ts).
  const [urlIsClean, setUrlIsClean] = useState(false);
  useEffect(() => {
    captureAttribution();
    setUrlIsClean(!hasAccessParams(window.location.search));
  }, []);

  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

  return (
    <>
      {metaPixelId ? (
        <>
          {urlIsClean ? <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `}
          </Script> : null}
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              alt=""
              referrerPolicy="no-referrer"
            />
          </noscript>
        </>
      ) : null}
      {googleAdsId && urlIsClean ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
            strategy="afterInteractive"
          />
          <Script id="google-ads" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAdsId}');
            `}
          </Script>
        </>
      ) : null}
    </>
  );
}

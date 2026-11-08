import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { defaultLocale, isLocale } from "@/i18n/config";
import { getSite } from "@/lib/api";

export const alt = "Company logo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The picture shown when a page is shared on Facebook, WhatsApp, Viber and similar. */
export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const site = await getSite(isLocale(lang) ? lang : defaultLocale);
  const logo = await readFile(join(process.cwd(), "public/logo-mark.png"));
  const host = process.env.SITE_URL ? new URL(process.env.SITE_URL).host : "";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0c0a09",
        backgroundImage: "radial-gradient(circle at 18% 12%, rgba(242,107,29,0.5), transparent 58%)",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 220,
          height: 220,
          borderRadius: 44,
          backgroundColor: "#ffffff",
        }}
      >
        <img src={`data:image/png;base64,${logo.toString("base64")}`} alt="" width={176} height={144} />
      </div>
      <div style={{ marginTop: 48, fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>{site.company_name}</div>
      {host && <div style={{ marginTop: 16, fontSize: 32, color: "#f26b1d" }}>{host}</div>}
    </div>,
    size,
  );
}

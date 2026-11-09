import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "New House World",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1c1917" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // lang is set on the client from the saved/browser language (lib/i18n.ts) before hydration.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

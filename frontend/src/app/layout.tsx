import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/site-shell";
import "@fontsource-variable/public-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vegetation Assessment", template: "%s | Vegetation Assessment" },
  description: "Review vegetation assessments, complete corrective work, and share property progress with fire-prevention staff.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-city-gray text-charcoal antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4 focus:text-civic-blue">Skip to content</a>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}

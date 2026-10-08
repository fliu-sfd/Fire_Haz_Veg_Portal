import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vegetation Assessment", template: "%s | Vegetation Assessment" },
  description: "Wildland fire prevention vegetation assessment portal — Team 4 capstone.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
        <SiteHeader />
        <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-6 text-sm text-slate-500 sm:px-6">Team 4 · Frontend starter</footer>
      </body>
    </html>
  );
}

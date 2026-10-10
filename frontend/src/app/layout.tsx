import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
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
        <SiteHeader />
        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
        <footer className="mt-8 bg-city-dark text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm sm:px-6">
            <span>Vegetation Assessment Portal</span>
            <span className="text-city-light">Scottsdale Fire Prevention</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

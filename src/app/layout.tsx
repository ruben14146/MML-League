import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import WaveTexture from "@/components/WaveTexture";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MML League",
  description: "Manchester Milan League — ticket system, roster items, and staff tools.",
};

// Required for nonce-based CSP: the nonce is generated per-request in
// proxy.ts and can only be embedded in dynamically rendered HTML (a
// statically prerendered page has no request to read it from).
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col">
        <WaveTexture className="fixed" />
        <Providers>
          <div className="relative z-10 flex min-h-screen flex-col">
            <Nav />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-panel-border px-5 py-6 text-center text-xs text-muted">
              MML - Manchester Milan League
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

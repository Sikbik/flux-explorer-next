import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Flux Explorer - Blockchain Explorer for Flux Network",
  description: "Modern, high-performance blockchain explorer for Flux - Real-time network monitoring, transaction tracking, and FluxNode analytics",
  keywords: ["flux", "blockchain", "explorer", "cryptocurrency", "fluxnode", "monitoring"],
  icons: {
    icon: [
      { url: "/flux-logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/flux-logo.svg",
    apple: "/flux-logo.svg",
  },
  openGraph: {
    title: "Flux Explorer - Blockchain Explorer for Flux Network",
    description: "Modern, high-performance blockchain explorer for Flux - Real-time network monitoring, transaction tracking, and FluxNode analytics",
    type: "website",
    images: [
      {
        url: "/flux-logo.svg",
        width: 256,
        height: 256,
        alt: "Flux Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Flux Explorer",
    description: "Modern blockchain explorer for Flux network",
    images: ["/flux-logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SiteHeader from "./site-header";
import SiteFooter from "./site-footer";
import InstallPrompt from "./install-prompt";

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
  title: "PotholeWatch AI | Mysuru Civic Issue Management",
  description: "Detect, verify, prioritize and resolve civic issues in Mysuru.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/potholewatch-192.svg", type: "image/svg+xml", sizes: "192x192" },
      { url: "/icons/potholewatch-512.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: "/icons/potholewatch-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PotholeWatch",
  },
};

export const viewport: Viewport = {
  themeColor: "#06b6d4",
  colorScheme: "dark",
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
        <SiteHeader />
        {children}
        <SiteFooter />
        <InstallPrompt />
      </body>
    </html>
  );
}

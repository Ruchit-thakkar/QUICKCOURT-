import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "QuickCourt — Don't Just Book a Court. Find Your Game.",
    template: "%s · QuickCourt",
  },
  description:
    "Demand-first sports discovery. Find players, form games, match facilities, and book courts. Owners recover empty slots with QuickFill.",
  keywords: [
    "sports booking",
    "find players",
    "court booking",
    "QuickFill",
    "turf management",
  ],
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full bg-qc-black text-qc-white antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Marck_Script, Outfit } from "next/font/google";
import ErrorBeacon from "@/components/ErrorBeacon";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const marck = Marck_Script({
  variable: "--font-marck",
  subsets: ["latin", "cyrillic"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Voice Memory Album",
  description: "The moments you love, told in your own voice.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Memory Album" },
  icons: { apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#f2efe9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${outfit.variable} ${marck.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <ErrorBeacon />
        {children}
      </body>
    </html>
  );
}

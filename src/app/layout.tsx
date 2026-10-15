import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

// Named "--font-sans" (not "--font-inter") to match the theme token
// globals.css's `@theme inline` forwards to the `font-sans` utility — that
// var() reference resolves against whatever real custom property is set on
// <html>, which is this one.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MF Studio",
    template: "%s",
  },
  description:
    "Plataforma de gestão para studios de treinamento personalizado.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}

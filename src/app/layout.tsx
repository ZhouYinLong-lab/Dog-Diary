import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CommandPalette } from "@/components/command-palette";
import { NavBar } from "@/components/nav-bar";
import { OfflineIndicator } from "@/components/offline-indicator";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dog-Diary",
  description: "Local-first diary workbench — write, track, reflect",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Dog-Diary",
    statusBarStyle: "default",
  },
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <NavBar />
        </Suspense>
        {children}
        <OfflineIndicator />
        <CommandPalette />
      </body>
    </html>
  );
}

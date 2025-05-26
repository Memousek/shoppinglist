import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CustomToaster } from './components/toast';
import Navbar from './components/navbar';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shopping List",
  description: "Moderní aplikace pro správu a sdílení nákupních seznamů. Přehledně, bezpečně a zdarma.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <head>
        <meta name="description" content="Moderní aplikace pro správu a sdílení nákupních seznamů. Přehledně, bezpečně a zdarma." />
        <link rel="preconnect" href="https://db.kpvhxnsqihyymtovcafr.supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}>
        <CustomToaster />
        <div className="min-h-12">
          <Navbar />
        </div>
        {children}
      </body>
    </html>
  );
}

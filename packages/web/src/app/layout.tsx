import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { cookieToInitialState } from "wagmi";

import { getConfig } from "@/utils";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
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
  title: "Analytic dApp built on Zama",
  description: "Analytic dApp allowing analysts to query on-chain confidential data with dynamic predicate.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(getConfig(), (await headers()).get("cookie"));

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers initialState={initialState}>
          <div className="flex flex-col items-start justify-center min-h-screen gap-12 px-8 mb-8 md:px-[0] font-[family-name:var(--font-geist-sans)]">
            <header>Header</header>
            <main>{children}</main>
            <footer class="bg-gray-800 text-gray-200 p-4 text-center">Footer</footer>
          </div>
          <Toaster richColors closeButton={true} />
        </Providers>
      </body>
    </html>
  );
}

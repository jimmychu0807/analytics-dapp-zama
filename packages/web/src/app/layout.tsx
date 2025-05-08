import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import { getConfig } from "@/utils";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Analytics dApp built on Zama",
  description:
    "Analytic dApp allowing analysts to query on-chain confidential data with dynamic predicate.",
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
          <div className="flex flex-col items-center justify-center min-h-screen md:px-[0] font-[family-name:var(--font-geist-sans)]">
            <Header />
            <main className="flex-auto w-full">{children}</main>
            <footer className="h-20 flex flex-row items-center">Footer</footer>
          </div>
          <Toaster richColors closeButton={true} />
        </Providers>
      </body>
    </html>
  );
}

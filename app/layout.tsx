import "@/styles/globals.css";
import clsx from "clsx";
import { Metadata, Viewport } from "next";

import { Providers } from "./providers";

import { Fira_Code as FontMono, Inter as FontSans } from "next/font/google";
import NavBar from "@/components/NavBar";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "FlowTribe Interactive Avatar SDK Demo",
    template: `%s - FlowTribe Interactive Avatar SDK Demo`,
  },
  icons: {
    icon: "/flowtribe-png-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`${fontSans.variable} ${fontMono.variable} font-sans dark`}
    >
      <head />
      <body className={clsx("min-h-screen bg-gray-900 antialiased")}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark", forcedTheme: "dark" }}>
          <main className="relative flex flex-col h-screen w-screen">
            <NavBar />
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

import { LogoProvider } from "@/context/LogoContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Niveshak - Finance Club of IIM Shillong",
  description: "The official website of Niveshak, the Finance Club of IIM Shillong. Featuring financial dashboard, magazines, and events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <LogoProvider>
            {children}
          </LogoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

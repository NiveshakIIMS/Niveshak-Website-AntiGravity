import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import { LogoProvider } from "@/context/LogoContext";
import Navbar from "@/components/Navbar";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json?v=2" />
        <meta name="theme-color" content="#0d1b2a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Niveshak" />
        <link rel="apple-touch-icon" href="/pwa-icon.png?v=2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/pwa-icon.png?v=2" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme');
                  if (savedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <LogoProvider>
            <Navbar />
            {children}
            <PWAInstallPrompt />
          </LogoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

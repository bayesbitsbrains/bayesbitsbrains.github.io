import Page from "@/components/Page";
import { DESCRIPTION, GTM_ID, TITLE } from "@/lib/config";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { JetBrains_Mono, Merriweather } from "next/font/google";
import { StrictMode } from "react";
import "./globals.css";

// Define Merriweather font configuration
const merriweather = Merriweather({
  variable: "--font-serif", // CSS variable name for main font
  subsets: ["latin"],
  // Include weights needed for mathematical content
  weight: ["300", "400", "700", "900"],
});

// Define JetBrains Mono font configuration
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono", // CSS variable name for monospace font
  subsets: ["latin"],
  // Include multiple weights for better typography control
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${merriweather.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext x='16' y='24' font-size='24' text-anchor='middle'%3E%F0%9F%93%8E%3C/text%3E%3C/svg%3E"
        />
      </head>
      <StrictMode>
        <body className="antialiased">
          <Page>{children}</Page>
        </body>
        {GTM_ID && <GoogleAnalytics gaId={GTM_ID} />}
      </StrictMode>
    </html>
  );
}

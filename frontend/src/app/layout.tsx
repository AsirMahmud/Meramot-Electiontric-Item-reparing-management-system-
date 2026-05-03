import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import FloatingAiChatButton from "@/components/chat/FloatingAiChatButton";
import { AppThemeProvider } from "@/components/theme/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "meramot",
  description:
    "Repair, pickup, and spare parts marketplace for hardware devices.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <AppThemeProvider>
            {children}
            <FloatingAiChatButton />
          </AppThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Geist_Mono, Inter, Manrope, Noto_Sans, Noto_Sans_Thaana } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { PlayerErrorGuard } from "@/components/providers/player-error-guard";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const notoSansThaana = Noto_Sans_Thaana({
  variable: "--font-noto-sans-thaana",
  subsets: ["latin", "thaana"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GaugeHow - Your Learning. Measured.",
  description:
    "A modern AI-powered learning operating system for students, goals, notes, books, tests, roadmaps, and progress.",
  icons: {
    icon: "/64 logo.png",
    shortcut: "/64 logo.png",
    apple: "/64 logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${notoSansThaana.variable} ${notoSans.variable} ${inter.variable} ${manrope.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <PlayerErrorGuard />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

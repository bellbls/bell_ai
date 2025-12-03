import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { CacheProvider } from "@/contexts/CacheContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BellAi - Tiered Rewards",
  description: "Premium Staking and Referral System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen`}>
        <ThemeProvider>
          <ConvexClientProvider>
            <CacheProvider>{children}</CacheProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

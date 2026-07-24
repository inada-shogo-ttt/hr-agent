import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Zen_Kaku_Gothic_New, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/app/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/app/providers/auth-provider";
import { BackgroundRunIndicator } from "@/app/components/workflow/BackgroundRunIndicator";

// Airbnb Cereal VF の代替: 欧文 = Plus Jakarta Sans / 和文 = Zen Kaku Gothic New
const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const zenKakuGothic = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "採用エージェント — 媒体別の求人原稿をAIで作成・改善",
  description: "テキストや求人票から、Indeed・AirWork・JobMedley・ハローワーク向けの原稿とサムネイルを生成。掲載結果をもとにした改善まで支援します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${jakartaSans.variable} ${zenKakuGothic.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <AppHeader />
          {children}
          <BackgroundRunIndicator />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}

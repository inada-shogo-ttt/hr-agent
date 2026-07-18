import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Zen_Kaku_Gothic_New, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/app/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/app/providers/auth-provider";

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
  title: "採用エージェント — 伝わる求人は、つくれる。",
  description: "求人原稿の作成から媒体別最適化、掲載後の改善まで。採用業務をひとつの流れで進めるAIパートナーです。",
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
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}

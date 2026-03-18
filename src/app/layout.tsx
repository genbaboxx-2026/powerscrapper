import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LiffProvider } from "@/components/LiffProvider";

export const metadata: Metadata = {
  title: "PowerScrapper - 解体業界マッチングプラットフォーム",
  description: "解体業界で働く人たちがつながり、協力し合うためのコミュニティ＋マッチングプラットフォーム",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[#F4F3F0]">
        <LiffProvider>
          {children}
        </LiffProvider>
      </body>
    </html>
  );
}

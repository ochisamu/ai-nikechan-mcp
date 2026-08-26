import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ai-nikechan-mcp.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AIニケちゃん MCP | 公開された記憶を、いつものAIへ。",
    template: "%s | AIニケちゃん MCP",
  },
  description: "AIニケちゃんの公開情報を、Codex Desktop・Claude Code・CharaDockから検索できる読み取り専用MCP。ブラウザのキャラクターチャットとMCP Appsも試せます。",
  applicationName: "AIニケちゃん MCP",
  keywords: ["AIニケちゃん", "MCP", "MCP Apps", "Codex Desktop", "Claude Code", "CharaDock", "AIキャラクター"],
  authors: [{ name: "ochisamu", url: "https://github.com/ochisamu" }],
  creator: "ochisamu",
  publisher: "ochisamu",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    siteName: "AIニケちゃん MCP",
    title: "AIニケちゃん MCP | 公開された記憶を、いつものAIへ。",
    description: "Codex Desktop・Claude Code・CharaDockへ約1分で接続。9個の読み取り専用ツールとMCP Appsを体験できます。",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "AIニケちゃん MCP — 公開された記憶を、いつものAIへ。" }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@tegnike",
    title: "AIニケちゃん MCP | 公開された記憶を、いつものAIへ。",
    description: "Codex Desktop・Claude Code・CharaDockからAIニケちゃんの公開情報を検索。チャットデモとMCP Appsも試せます。",
    images: [{ url: "/opengraph-image", alt: "AIニケちゃん MCP — 公開された記憶を、いつものAIへ。" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0b13",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

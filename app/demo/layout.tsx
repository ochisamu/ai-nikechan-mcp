import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AIニケちゃんと話す",
  description: "AIニケちゃんの公開情報をMCPで検索しながら、キャラクターと短く対話できる非公式デモです。",
  alternates: { canonical: "/demo" },
  openGraph: {
    url: "/demo",
    title: "AIニケちゃんと話す | AIニケちゃん MCP",
    description: "キャラクターを主役にしたチャットUIで、AIニケちゃんMCPとMCP Appsを体験できます。",
  },
};

export default function DemoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "MCPセットアップ",
  description: "AIニケちゃん MCPをCodex Desktop、Claude Code、CharaDockへ接続する手順と利用可能なツールの一覧です。",
};

export default function SetupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}

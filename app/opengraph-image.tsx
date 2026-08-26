import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "AIニケちゃん MCP — 公開された記憶を、いつものAIへ。";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OpenGraphImage() {
  const avatarFile = await readFile(join(process.cwd(), "public/avatar/nikechan/eyes-open-mouth-closed.png"));
  const avatarData = avatarFile.buffer.slice(avatarFile.byteOffset, avatarFile.byteOffset + avatarFile.byteLength) as ArrayBuffer;
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0b0a12 0%, #151224 55%, #09161c 100%)",
          color: "#fbf9ff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ position: "absolute", inset: 0, opacity: 0.15, backgroundImage: "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        <div style={{ position: "absolute", left: -180, top: -230, width: 600, height: 600, borderRadius: 999, background: "rgba(132, 84, 235, .26)", filter: "blur(85px)" }} />
        <div style={{ position: "absolute", right: -150, bottom: -260, width: 620, height: 620, borderRadius: 999, background: "rgba(58, 202, 221, .18)", filter: "blur(95px)" }} />

        <div style={{ position: "relative", zIndex: "3", display: "flex", width: 690, padding: "54px 0 48px 62px", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <div style={{ display: "flex", width: 52, height: 52, alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,.35)", borderRadius: 16, background: "linear-gradient(145deg,#a381ff,#55cedd)", boxShadow: "0 12px 32px rgba(87,58,164,.32)", fontSize: 20, fontWeight: 800 }}>N</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 22, fontWeight: 750, letterSpacing: "-.02em" }}>AIニケちゃん MCP</span>
              <span style={{ marginTop: 4, color: "rgba(228,220,246,.55)", fontSize: 12, fontWeight: 700, letterSpacing: ".15em" }}>PUBLIC KNOWLEDGE · MCP APPS</span>
            </div>
          </div>

          <div style={{ display: "flex", marginTop: 58, flexDirection: "column" }}>
            <span style={{ color: "#78eab7", fontSize: 15, fontWeight: 750, letterSpacing: ".15em" }}>CONNECT YOUR AGENT</span>
            <div style={{ display: "flex", marginTop: 14, flexDirection: "column", fontSize: 55, fontWeight: 760, lineHeight: 1.13, letterSpacing: "-.055em" }}>
              <span>公開された記憶を、</span>
              <span>いつものAIへ。</span>
            </div>
            <span style={{ width: 560, marginTop: 22, color: "rgba(241,237,250,.68)", fontSize: 21, lineHeight: 1.55 }}>セットアップから、画像つきの検索結果とキャラクターチャットまで。</span>
          </div>

          <div style={{ display: "flex", marginTop: "auto", alignItems: "center", gap: 10 }}>
            {['Codex Desktop', 'Claude Code', 'CharaDock'].map((label) => (
              <span key={label} style={{ display: "flex", padding: "9px 13px", border: "1px solid rgba(255,255,255,.14)", borderRadius: 999, background: "rgba(255,255,255,.055)", color: "rgba(248,245,255,.72)", fontSize: 13, fontWeight: 650 }}>{label}</span>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", zIndex: "1", right: -42, top: 18, display: "flex", width: 600, height: 600, alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 480, height: 480, border: "1px solid rgba(184,157,255,.18)", borderRadius: 999, background: "radial-gradient(circle, rgba(145,100,247,.22), rgba(75,206,220,.05) 48%, transparent 69%)" }} />
          <div style={{ position: "absolute", width: 360, height: 360, border: "1px solid rgba(255,255,255,.08)", borderRadius: 999 }} />
          <img src={avatarData as unknown as string} alt="" width="590" height="590" style={{ position: "absolute", right: -4, bottom: -76, objectFit: "contain", filter: "drop-shadow(0 32px 32px rgba(0,0,0,.5))" }} />
        </div>

        <div style={{ position: "absolute", zIndex: "5", right: 44, bottom: 42, display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", border: "1px solid rgba(255,255,255,.18)", borderRadius: 999, background: "rgba(18,18,28,.72)" }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: "#75edb8", boxShadow: "0 0 14px #75edb8" }} />
          <span style={{ fontSize: 13, fontWeight: 760 }}>9 READ-ONLY TOOLS</span>
        </div>
      </div>
    ),
    size,
  );
}

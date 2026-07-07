import { ImageResponse } from "next/og";

export const alt = "Breakout — Find the YouTube videos that blew up";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #1c1917 0%, #09090b 55%, #18181b 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "22px", marginBottom: "44px" }}>
          <div
            style={{
              display: "flex",
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #f43f5e, #f97316)",
            }}
          />
          <div style={{ display: "flex", fontSize: "56px", fontWeight: 800 }}>Breakout</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", fontSize: "76px", fontWeight: 800, lineHeight: 1.05 }}>
          <span style={{ display: "flex" }}>Find the videos that&nbsp;</span>
          <span style={{ display: "flex", color: "#fb7185" }}>blew up</span>
        </div>
        <div style={{ display: "flex", fontSize: "34px", color: "#a1a1aa", marginTop: "30px" }}>
          Free YouTube outlier finder · Made for Telugu creators
        </div>
        <div style={{ display: "flex", fontSize: "28px", color: "#71717a", marginTop: "auto" }}>
          thebreakout.in
        </div>
      </div>
    ),
    { ...size },
  );
}

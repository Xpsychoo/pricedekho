import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Site-wide social preview card (generated at build time). */
export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "src/app/icon.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "linear-gradient(135deg, #ffffff 0%, #eef2ff 60%, #e0e7ff 100%)", padding: 72, flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img only */}
          <img src={logoSrc} width={88} height={88} alt="" />
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#0f172a" }}>
            Price<span style={{ color: "#4f46e5" }}>Dekho</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 700, color: "#0f172a", lineHeight: 1.1, maxWidth: 950 }}>Compare prices across Indian online stores</div>
          <div style={{ fontSize: 30, color: "#475569", maxWidth: 950 }}>Same product, same variant — with clear source and freshness labels on every price.</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {["Mobiles", "Laptops", "Audio", "Fashion", "Home & Kitchen"].map((c) => (
            <div key={c} style={{ display: "flex", fontSize: 24, color: "#3730a3", background: "#ffffff", border: "2px solid #c7d2fe", borderRadius: 999, padding: "8px 22px" }}>
              {c}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

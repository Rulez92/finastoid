import { ImageResponse } from "next/og";
import { BRAND, leafMark } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(145deg, #2c5e34 0%, ${BRAND.green} 60%, #1b3d21 100%)`,
        }}
      >
        {leafMark(104, 1.9)}
      </div>
    ),
    { ...size },
  );
}
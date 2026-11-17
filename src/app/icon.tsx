import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#234d2a", // brand green-deep
          color: "#e8c06a", // brand gold
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: -1,
          borderRadius: 14,
        }}
      >
        FT
      </div>
    ),
    { ...size },
  );
}
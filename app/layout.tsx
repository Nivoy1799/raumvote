import "./globals.css";
import { ReactNode } from "react";
import GlobalTabbar from "@/components/GlobalTabbar";
import { PageWrapper } from "@/components/PageWrapper";
import ColorblindFilter from "@/components/ColorblindFilter";

// iOS / PWA viewport best practice
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "black", color: "white", minHeight: "100dvh" }}>
        <ColorblindFilter />
        <PageWrapper>{children}</PageWrapper>
        <GlobalTabbar />
      </body>
    </html>
  );
}

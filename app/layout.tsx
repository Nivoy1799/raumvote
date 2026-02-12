import "./globals.css";
import { ReactNode } from "react";
import GlobalTabbar from "@/components/GlobalTabbar";

// iOS / PWA viewport best practice
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const TABBAR_HEIGHT = 64;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={styles.body}>
        <div style={styles.page}>{children}</div>
        <GlobalTabbar />
      </body>
    </html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    background: "black",
    color: "white",
    minHeight: "100dvh",
  },

  // Reserve space for tabbar + iPhone home indicator
  page: {
    minHeight: "100dvh",
    paddingBottom: `calc(${TABBAR_HEIGHT}px + env(safe-area-inset-bottom) + 12px)`,
  },
};

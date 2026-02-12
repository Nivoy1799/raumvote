import "./globals.css";
import { ReactNode } from "react";
import GlobalTabbar from "@/components/GlobalTabbar";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={styles.body}>
        <div style={styles.page}>
          {children}
        </div>

        <GlobalTabbar />
      </body>
    </html>
  );
}

const styles = {
  body: {
    margin: 0,
    background: "black",
    color: "white",
  },
  page: {
    minHeight: "100dvh",
    paddingBottom: 90, // Platz für Tabbar
  },
};

import type { Metadata, Viewport } from "next";
import NavigationEpoch from "@/components/shell/NavigationEpoch";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pirate Wires",
  description: "Editorial intelligence and audience analytics.",
  robots: { index: false, follow: false }, // internal tool
};

export const viewport: Viewport = {
  themeColor: "#080D1B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavigationEpoch />
        {children}
      </body>
    </html>
  );
}

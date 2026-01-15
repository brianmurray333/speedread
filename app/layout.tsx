import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F7931A",
};

export const metadata: Metadata = {
  title: "SpeedRead - Read Faster, Retain More",
  description: "A distraction-free speed reading app using RSVP technology. Upload PDFs and read at your own pace with optimal word recognition.",
  keywords: ["speed reading", "RSVP", "PDF reader", "reading app", "focus reading"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpeedRead",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

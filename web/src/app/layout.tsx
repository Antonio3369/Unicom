import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "联通业务工作台",
  description: "罗湖联通业务录单与看板",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased bg-[#f4f6f9] text-[#111827]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

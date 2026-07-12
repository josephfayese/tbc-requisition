import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "TBC OutOfZion · Finance Requisitions",
  description: "Church finance requisition workflow for TBC OutOfZion",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TBC Finance",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#064E2F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

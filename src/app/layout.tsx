import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: { default: "TBC OutOfZion · Finance Requisitions", template: "%s · TBC Finance" },
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
  themeColor: "#0D2F1B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

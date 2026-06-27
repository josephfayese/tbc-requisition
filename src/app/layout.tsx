import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "TBC OutOfZion · Finance Requisitions",
  description: "Church finance requisition workflow for TBC OutOfZion",
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

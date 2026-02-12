import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coalition X Exchange Layer API",
  description: "REST API for Coalition X Exchange Layer - Building sustainability KPI tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

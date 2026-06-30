import type { Metadata } from "next";
import "./globals.css";
import "geist/font/sans";
import "geist/font/mono";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Business Operator Dashboard",
  description: "The B2B operator command cockpit for EvansAiSolutions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

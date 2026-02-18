import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ProjektProvider } from "@/lib/context/ProjektContext";

import { ChatAssistant } from "@/components/shared/ChatAssistant";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MethaDesk Pro",
  description: "Advanced Frontend Framework for METHABAU",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        <ProjektProvider>
          {children}
        </ProjektProvider>
      </body>
    </html>
  );
}

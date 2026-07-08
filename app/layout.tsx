import "./globals.css";
import type { Viewport } from "next";

import { NgrokClientSupport } from "@/components/NgrokClientSupport";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata = {
  title: "Sistema de Pedidos Consignados",
  description: "Sistema de Pedidos Consignados - Viva Ecológicos e Buriti",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <NgrokClientSupport />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

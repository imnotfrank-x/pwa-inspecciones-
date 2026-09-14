import type { Metadata, Viewport } from "next";
import { AppShell } from "../components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Inspecciones de laboratorio",
  title: "Inspecciones de laboratorio",
  description: "Consulta de inspecciones sintéticas de mantenimiento de laboratorios.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Inspecciones"
  }
};

export const viewport: Viewport = {
  themeColor: "#172b62",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
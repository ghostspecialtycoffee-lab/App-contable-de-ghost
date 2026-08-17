import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ghost Specialty Coffee · Cali · Bit Hotels El Peñón",
  description:
    "Coffee lab · brunch · lunch. Café de especialidad SCA 85+ en Bit Hotels El Peñón, Cali.",
  openGraph: {
    title: "Ghost Specialty Coffee",
    description: "Brunch · lunch · coffee lab · SCA 85+ · Cali",
    locale: "es_CO",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="font-sans">{children}</body>
    </html>
  );
}

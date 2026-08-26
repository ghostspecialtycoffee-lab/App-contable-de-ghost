import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";

import { CafeCarta } from "@/components/cafe-carta";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-carta-display",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-carta-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Carta · Ghost Café",
  description:
    "Carta de cafés calientes y fríos, acompañantes, cócteles summer, desayuno express y almuerzos fitness.",
};

export default function CartaPage() {
  return (
    <div className={`${syne.variable} ${figtree.variable}`}>
      <CafeCarta />
    </div>
  );
}

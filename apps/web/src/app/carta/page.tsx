import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";

import { CafeCarta } from "@/components/cafe-carta";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-carta-display",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-carta-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Carta · Ghost Specialty Coffee",
  description:
    "Carta de cafés calientes, fríos, acompañantes, cócteles summer, desayunos y almuerzos fitness.",
};

export default function CartaPage() {
  return (
    <div className={`${fraunces.variable} ${sourceSans.variable}`}>
      <CafeCarta />
    </div>
  );
}

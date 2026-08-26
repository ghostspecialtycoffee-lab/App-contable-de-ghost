import type { Metadata } from "next";

import { CafeCarta } from "@/components/cafe-carta";

export const metadata: Metadata = {
  title: "Carta · Ghost Coffee",
  description: "Carta de cafés, acompañantes, cócteles, desayunos y almuerzos fitness.",
};

export default function CartaPage() {
  return <CafeCarta />;
}

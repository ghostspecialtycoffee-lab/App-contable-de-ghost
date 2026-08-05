"use client";

import Link from "next/link";

import { OperationalModelPanel } from "@/components/operational-model-panel";
import { PageHeader } from "@/components/page-header";

export default function GuiaPage() {
  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Cómo funciona"
        description="Lógica operativa de Ghost Contable: documentos, flujos y clases de producto."
        backHref="/dashboard"
        backLabel="Inicio"
      />

      <nav className="flex flex-wrap gap-2 text-sm">
        <a href="#zonas" className="ghost-pill-link">
          Zonas
        </a>
        <a href="#documentos" className="ghost-pill-link">
          Documentos
        </a>
        <a href="#ventas" className="ghost-pill-link">
          Ventas
        </a>
        <a href="#compras" className="ghost-pill-link">
          Compras
        </a>
        <a href="#productos" className="ghost-pill-link">
          Productos
        </a>
      </nav>

      <OperationalModelPanel />

      <div className="flex flex-wrap gap-3">
        <Link href="/ventas" className="ghost-pill-link">
          Centro de ventas
        </Link>
        <Link href="/purchases" className="ghost-pill-link">
          Compras
        </Link>
        <Link href="/inventory/items" className="ghost-pill-link">
          Inventario
        </Link>
      </div>
    </div>
  );
}

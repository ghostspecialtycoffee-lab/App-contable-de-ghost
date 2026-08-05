"use client";

import Link from "next/link";

import { OperationalModelPanel } from "@/components/operational-model-panel";
import { PageHeader } from "@/components/page-header";

export default function GuiaPage() {
  return (
    <div className="ghost-page-stack pb-8">
      <PageHeader
        title="Cómo funciona"
        description="Documentos, flujos y clases de producto."
        backHref="/dashboard"
        backLabel="Inicio"
      />

      <nav className="ghost-anchor-nav" aria-label="Secciones">
        <a href="#zonas" className="ghost-pill-link shrink-0">
          Zonas
        </a>
        <a href="#documentos" className="ghost-pill-link shrink-0">
          Documentos
        </a>
        <a href="#ventas" className="ghost-pill-link shrink-0">
          Ventas
        </a>
        <a href="#compras" className="ghost-pill-link shrink-0">
          Compras
        </a>
        <a href="#productos" className="ghost-pill-link shrink-0">
          Productos
        </a>
      </nav>

      <OperationalModelPanel />

      <div className="flex flex-wrap gap-2">
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

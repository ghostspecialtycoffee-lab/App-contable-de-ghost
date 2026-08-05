"use client";

import { OperationalModelPanel } from "@/components/operational-model-panel";
import { InitialDataImportPanel } from "@/components/initial-data-import-panel";
import { PageHeader } from "@/components/page-header";

export default function GuiaPage() {
  return (
    <div className="ghost-page-stack pb-8">
      <PageHeader
        title="Guía operativa"
        description="Documentos, flujos y reglas del sistema."
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
        <a href="#carga-inicial" className="ghost-pill-link shrink-0">
          Carga inicial
        </a>
      </nav>

      <div id="carga-inicial" className="scroll-mt-20">
        <InitialDataImportPanel showGuiaLink={false} />
      </div>

      <OperationalModelPanel />
    </div>
  );
}

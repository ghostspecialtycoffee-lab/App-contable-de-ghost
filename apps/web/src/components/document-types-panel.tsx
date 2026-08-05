import Link from "next/link";

import { OPERATIONAL_DOCUMENT_TYPES } from "@ghost/domain";

export function DocumentTypesPanel() {
  const purchase = OPERATIONAL_DOCUMENT_TYPES.purchase_invoice;
  const sale = OPERATIONAL_DOCUMENT_TYPES.sale_receipt;

  return (
    <section className="ghost-doc-compare" aria-label="Tipos de documento">
      <p className="ghost-section-label">Documentos — no mezclar</p>
      <div className="ghost-doc-grid">
        <article className="ghost-doc-card">
          <p className="ghost-doc-type">{purchase.label}</p>
          <p className="ghost-doc-summary">{purchase.summary}</p>
          <p className="ghost-doc-key">
            Clave: {purchase.dedupKeys.join(" + ")}
          </p>
          <Link href={purchase.route} className="ghost-doc-link">
            Ir a Compras →
          </Link>
        </article>
        <article className="ghost-doc-card">
          <p className="ghost-doc-type">{sale.label}</p>
          <p className="ghost-doc-summary">{sale.summary}</p>
          <p className="ghost-doc-key">
            Clave: {sale.dedupKeys.join(" + ")}
          </p>
          <Link href={sale.route} className="ghost-doc-link">
            Ir a Registros →
          </Link>
        </article>
      </div>
    </section>
  );
}

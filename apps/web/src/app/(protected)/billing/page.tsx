"use client";

import Link from "next/link";
import { useState } from "react";

import { useSales } from "@/hooks/use-sales";
import { PAYMENT_METHOD_LABELS, type Sale } from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

function formatMoney(value: number) {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function SaleReceipt({ sale }: { sale: Sale }) {
  return (
    <div className="rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] p-4 text-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Comprobante {sale.saleNumber}</p>
          <p className="text-xs text-[var(--ghost-text-muted)]">
            Pago: {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
          </p>
        </div>
        <p className="text-base font-bold">{formatMoney(sale.total)}</p>
      </div>
      <ul className="space-y-1 border-t border-[var(--ghost-border)] pt-3">
        {sale.lines.map((line, index) => (
          <li key={`${sale.id}-${index}`} className="flex justify-between gap-2">
            <span>
              {line.quantity}x {line.name}
            </span>
            <span>{formatMoney(line.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-1 border-t border-[var(--ghost-border)] pt-3 text-xs text-[var(--ghost-text-muted)]">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(sale.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>IVA</span>
          <span>{formatMoney(sale.taxAmount)}</span>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { sales, loading, error } = useSales();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const selectedSale = sales.find((sale) => sale.id === selectedSaleId) ?? sales[0];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--ghost-text-muted)]">Facturación básica</p>
          <h1 className="text-2xl font-bold">Ventas y comprobantes</h1>
          <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
            Comprobante de venta con IVA. Factura electrónica DIAN en fase posterior.
          </p>
        </div>
        <Link href="/pos">
          <Button variant="secondary" size="sm">
            Nueva venta
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando ventas...</p>
      ) : error ? (
        <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
      ) : sales.length === 0 ? (
        <Card title="Sin ventas">
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Registra la primera venta desde el POS.
          </p>
          <Link href="/pos" className="mt-4 inline-block">
            <Button>Ir al POS</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card title="Historial de ventas">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--ghost-border)] text-[var(--ghost-text-muted)]">
                  <tr>
                    <th className="px-2 py-2 font-medium">Número</th>
                    <th className="px-2 py-2 font-medium">Total</th>
                    <th className="px-2 py-2 font-medium">Pago</th>
                    <th className="px-2 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-[var(--ghost-border)] last:border-0"
                    >
                      <td className="px-2 py-2 font-mono text-xs">{sale.saleNumber}</td>
                      <td className="px-2 py-2">{formatMoney(sale.total)}</td>
                      <td className="px-2 py-2">
                        {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedSaleId(sale.id)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {selectedSale ? (
            <Card title="Comprobante">
              <SaleReceipt sale={selectedSale} />
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

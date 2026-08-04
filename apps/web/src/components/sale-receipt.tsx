"use client";

import { DocumentFooter, DocumentHeader } from "@/components/document-header";
import { CO_TAX_CATEGORY_LABELS, PAYMENT_METHOD_LABELS, type Sale } from "@ghost/domain";
import { Button } from "@ghost/ui";

import { formatDateTime, formatMoney } from "@/lib/format";

interface SaleReceiptProps {
  sale: Sale;
  showPrint?: boolean;
}

export function SaleReceipt({ sale, showPrint = true }: SaleReceiptProps) {
  function handlePrint() {
    window.print();
  }

  const taxLines =
    sale.taxBreakdown && sale.taxBreakdown.length > 0
      ? sale.taxBreakdown
      : [
          {
            category: "IVA_19" as const,
            label: CO_TAX_CATEGORY_LABELS.IVA_19,
            amount: sale.taxAmount,
          },
        ];

  const extraLines = [
    sale.customerName ? `Cliente / referencia: ${sale.customerName}` : "",
    sale.tableNumber ? `Mesa ${sale.tableNumber}` : "",
  ].filter(Boolean);

  return (
    <div className="sale-receipt space-y-4">
      <div className="rounded-lg border border-[var(--ghost-border)] bg-white p-4 text-sm text-black print:border-none print:p-0">
        <DocumentHeader
          documentNumber={sale.saleNumber}
          documentDate={formatDateTime(sale.soldAt ?? sale.createdAt)}
          extraLines={extraLines}
        />

        <ul className="space-y-2 py-3">
          {sale.lines.map((line, index) => (
            <li key={`${sale.id}-${index}`} className="flex justify-between gap-3">
              <span>
                {line.quantity} x {line.name}
              </span>
              <span>{formatMoney(line.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-1 border-t border-dashed border-gray-300 pt-3 text-xs">
          <div className="flex justify-between">
            <span>Base gravable</span>
            <span>{formatMoney(sale.subtotal)}</span>
          </div>
          {taxLines.map((entry) => (
            <div key={entry.category} className="flex justify-between">
              <span>{entry.label}</span>
              <span>{formatMoney(entry.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatMoney(sale.total)}</span>
          </div>
          <div className="flex justify-between pt-1 text-gray-600">
            <span>Medio de pago</span>
            <span>{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</span>
          </div>
        </div>

        <DocumentFooter className="mt-4" />
      </div>

      {showPrint ? (
        <Button variant="secondary" fullWidth onClick={handlePrint} className="print:hidden">
          Imprimir factura
        </Button>
      ) : null}
    </div>
  );
}

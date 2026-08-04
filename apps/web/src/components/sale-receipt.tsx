"use client";

import { useAuth } from "@/providers/auth-provider";
import { PAYMENT_METHOD_LABELS, type Sale } from "@ghost/domain";
import { Button } from "@ghost/ui";

import { formatDateTime, formatMoney } from "@/lib/format";

interface SaleReceiptProps {
  sale: Sale;
  showPrint?: boolean;
}

export function SaleReceipt({ sale, showPrint = true }: SaleReceiptProps) {
  const { organization } = useAuth();

  function handlePrint() {
    window.print();
  }

  return (
    <div className="sale-receipt space-y-4">
      <div className="rounded-lg border border-[var(--ghost-border)] bg-white p-4 text-sm text-black print:border-none print:p-0">
        <div className="border-b border-dashed border-gray-300 pb-3 text-center">
          <p className="text-base font-bold">{organization?.name ?? "Ghost ERP"}</p>
          <p className="text-xs text-gray-600">Comprobante de venta</p>
          <p className="mt-2 font-mono text-xs">{sale.saleNumber}</p>
          <p className="text-xs text-gray-600">
            {formatDateTime(sale.soldAt ?? sale.createdAt)}
          </p>
          {sale.customerName ? (
            <p className="mt-1 text-xs">Cliente: {sale.customerName}</p>
          ) : null}
        </div>

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
            <span>Subtotal</span>
            <span>{formatMoney(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA ({Math.round(sale.taxRate * 100)}%)</span>
            <span>{formatMoney(sale.taxAmount)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatMoney(sale.total)}</span>
          </div>
          <div className="flex justify-between pt-1 text-gray-600">
            <span>Forma de pago</span>
            <span>{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</span>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-500">
          Documento interno de venta. No reemplaza factura electrónica DIAN.
        </p>
      </div>

      {showPrint ? (
        <Button variant="secondary" fullWidth onClick={handlePrint} className="print:hidden">
          Imprimir comprobante
        </Button>
      ) : null}
    </div>
  );
}

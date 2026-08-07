"use client";

import { DocumentFooter, DocumentHeader } from "@/components/document-header";
import {
  buildSaleDocumentWhatsAppUrl,
  CO_TAX_CATEGORY_LABELS,
  INVENTORY_COST_METHOD_LABELS,
  PAYMENT_METHOD_LABELS,
  type Sale,
  type SaleDocumentType,
} from "@ghost/domain";
import { Button } from "@ghost/ui";
import { useState } from "react";

import { formatDateTime, formatMoney } from "@/lib/format";
import { SaleLotTracePanel } from "@/components/sale-lot-trace-panel";
import { sendSaleDocument } from "@/lib/sales/send-sale-document";
import { useAuth } from "@/providers/auth-provider";

interface SaleReceiptProps {
  sale: Sale;
  showPrint?: boolean;
  documentType?: SaleDocumentType;
}

export function SaleReceipt({
  sale,
  showPrint = true,
  documentType = "factura",
}: SaleReceiptProps) {
  const { organization } = useAuth();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  function handlePrint() {
    window.print();
  }

  async function handleEmailShare() {
    const email = window.prompt("Correo del cliente:")?.trim();
    if (!email || !organization?.id) {
      return;
    }

    setSendingEmail(true);
    setEmailMessage(null);

    try {
      const result = await sendSaleDocument({
        organizationId: organization.id,
        saleId: sale.id,
        email,
        documentType,
      });

      if (result.sent) {
        setEmailMessage(
          result.method === "emailjs" || result.method === "cloud"
            ? `Correo enviado a ${email}.`
            : "Se abrió tu app de correo. Revisa y envía el mensaje.",
        );
      } else {
        setEmailMessage(result.message ?? "No se pudo enviar el correo.");
      }
    } catch {
      setEmailMessage("Error al enviar el correo.");
    } finally {
      setSendingEmail(false);
    }
  }

  function handleWhatsAppShare() {
    const url = buildSaleDocumentWhatsAppUrl({
      document: {
        documentType,
        saleNumber: sale.saleNumber,
        soldAt: formatDateTime(sale.soldAt ?? sale.createdAt),
        organizationName: organization?.name ?? "Ghost Contable",
        tableNumber: sale.tableNumber,
        customerName: sale.customerName || undefined,
        lines: sale.lines.map((line) => ({
          name: line.name,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
        })),
        subtotal: sale.subtotal,
        taxAmount: sale.taxAmount,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
      },
    });
    window.open(url, "_blank", "noopener,noreferrer");
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

      <div className="print:hidden">
        <SaleLotTracePanel sale={sale} />
      </div>

      {sale.costSnapshot ? (
        <div className="rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] p-4 text-sm print:hidden">
          <p className="font-medium">Costo de venta</p>
          <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">
            Método: {INVENTORY_COST_METHOD_LABELS[sale.costSnapshot.method as keyof typeof INVENTORY_COST_METHOD_LABELS] ?? sale.costSnapshot.method}
          </p>
          <div className="mt-2 flex justify-between text-xs">
            <span>Costo insumos</span>
            <span>{formatMoney(sale.costSnapshot.totalIngredientCost)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span>Food cost</span>
            <span>{(sale.costSnapshot.foodCostPct * 100).toFixed(1)}%</span>
          </div>
        </div>
      ) : null}

      {showPrint ? (
        <div className="grid gap-2 print:hidden">
          <Button variant="secondary" fullWidth onClick={handlePrint}>
            Imprimir comprobante
          </Button>
          <Button variant="secondary" fullWidth onClick={handleEmailShare} disabled={sendingEmail}>
            {sendingEmail ? "Enviando correo…" : "Enviar por correo automático"}
          </Button>
          <Button variant="secondary" fullWidth onClick={handleWhatsAppShare}>
            Compartir por WhatsApp
          </Button>
          {emailMessage ? (
            <p className="text-center text-xs text-[var(--ghost-text-muted)]">{emailMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { useInventoryItems } from "@/hooks/use-inventory-items";
import { usePurchaseInvoices } from "@/hooks/use-purchase-invoices";
import { useWarehouses } from "@/hooks/use-warehouses";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { formatDate, formatMoney, todayIsoDate } from "@/lib/format";
import { compressImageFile } from "@/lib/image/compress-image";
import {
  confirmPurchaseInvoice,
  createPurchaseInvoice,
} from "@/lib/purchases/purchases";
import {
  BASE_UNITS,
  BASE_UNIT_LABELS,
  CO_TAX_CATEGORIES,
  CO_TAX_CATEGORY_LABELS,
  buildPurchaseInvoiceLines,
  summarizePurchaseInvoice,
  type BaseUnit,
  type CoTaxCategory,
  type PurchaseInvoiceLineInput,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

const emptyLine = (): PurchaseInvoiceLineInput => ({
  description: "",
  quantity: 1,
  unit: "unit",
  unitPriceNet: 0,
  taxCategory: "IVA_19",
});

export default function PurchasesPage() {
  const { items: inventoryItems } = useInventoryItems();
  const { warehouses } = useWarehouses();
  const { invoices, loading, error } = usePurchaseInvoices();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayIsoDate());
  const [warehouseId, setWarehouseId] = useState("");
  const [lines, setLines] = useState<PurchaseInvoiceLineInput[]>([emptyLine()]);
  const [attachmentDataUrl, setAttachmentDataUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const preview = useMemo(() => {
    const built = buildPurchaseInvoiceLines(lines.filter((line) => line.description.trim()));
    return summarizePurchaseInvoice(built);
  }, [lines]);

  function updateLine(index: number, patch: Partial<PurchaseInvoiceLineInput>) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  }

  function linkInventoryItem(index: number, itemId: string) {
    const item = inventoryItems.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    updateLine(index, {
      inventoryItemId: item.id,
      description: item.name,
      unit: item.baseUnit as BaseUnit,
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setSubmitError(null);

    try {
      if (file.type.startsWith("image/")) {
        const compressed = await compressImageFile(file);
        setAttachmentDataUrl(compressed.dataUrl);
        setAttachmentName(compressed.name);
        return;
      }

      if (file.type === "application/pdf") {
        const dataUrl = await readFileAsDataUrl(file);
        if (dataUrl.length > 500_000) {
          throw new Error("El PDF es demasiado pesado. Máximo ~450 KB.");
        }
        setAttachmentDataUrl(dataUrl);
        setAttachmentName(file.name.replace(/\.pdf$/i, ""));
        return;
      }

      throw new Error("Formato no soportado. Usa imagen (PNG, JPG) o PDF.");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      await createPurchaseInvoice({
        supplierName,
        invoiceNumber,
        invoiceDate,
        warehouseId: warehouseId || warehouses[0]?.id || "",
        lines: lines.filter((line) => line.description.trim()),
        attachmentDataUrl: attachmentDataUrl || undefined,
        attachmentName: attachmentName || undefined,
      });
      setSupplierName("");
      setInvoiceNumber("");
      setLines([emptyLine()]);
      setAttachmentDataUrl("");
      setAttachmentName("");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(invoiceId: string) {
    setSubmitError(null);
    setConfirmingId(invoiceId);

    try {
      const result = await confirmPurchaseInvoice({ invoiceId });
      setSubmitError(
        result.movements > 0
          ? null
          : "Factura confirmada sin movimientos (vincula ítems de inventario en las líneas).",
      );
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/inventory" className="underline">
            Inventario
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Compras</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Registra facturas de compra con precio, cantidad, unidad e IVA Colombia. Al confirmar,
          entra inventario con costo promedio.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card title="Nueva factura de compra">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Proveedor</span>
              <input
                required
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                className="ghost-input"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium">N.º factura</span>
                <input
                  required
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  className="ghost-input"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Fecha</span>
                <input
                  required
                  type="date"
                  value={invoiceDate}
                  onChange={(event) => setInvoiceDate(event.target.value)}
                  className="ghost-input"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Bodega destino</span>
              <select
                required
                value={warehouseId || warehouses[0]?.id || ""}
                onChange={(event) => setWarehouseId(event.target.value)}
                className="ghost-input"
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Líneas</span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setLines((current) => [...current, emptyLine()])}
                >
                  + Línea
                </Button>
              </div>
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-lg border border-[var(--ghost-border)] p-3"
                >
                  <select
                    value={line.inventoryItemId ?? ""}
                    onChange={(event) => linkInventoryItem(index, event.target.value)}
                    className="ghost-input"
                  >
                    <option value="">Ítem inventario (opcional)</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    value={line.description}
                    onChange={(event) => updateLine(index, { description: event.target.value })}
                    className="ghost-input"
                    placeholder="Descripción"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      required
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={line.quantity || ""}
                      onChange={(event) =>
                        updateLine(index, { quantity: Number(event.target.value) })
                      }
                      className="ghost-input"
                      placeholder="Cantidad"
                    />
                    <select
                      value={line.unit}
                      onChange={(event) =>
                        updateLine(index, { unit: event.target.value as BaseUnit })
                      }
                      className="ghost-input"
                    >
                      {BASE_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {BASE_UNIT_LABELS[unit]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={line.unitPriceNet || ""}
                      onChange={(event) =>
                        updateLine(index, { unitPriceNet: Number(event.target.value) })
                      }
                      className="ghost-input"
                      placeholder="Precio neto/unidad"
                    />
                    <select
                      value={line.taxCategory}
                      onChange={(event) =>
                        updateLine(index, { taxCategory: event.target.value as CoTaxCategory })
                      }
                      className="ghost-input"
                    >
                      {CO_TAX_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {CO_TAX_CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-dashed border-[var(--ghost-border)] p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
              >
                Subir factura (imagen o PDF)
              </Button>
              {attachmentName ? (
                <p className="mt-2 text-xs text-[var(--ghost-text-muted)]">
                  Adjunto: {attachmentName}
                </p>
              ) : null}
            </div>

            <div className="rounded-lg bg-[var(--ghost-surface-2)] p-3 text-sm">
              <p>Subtotal: {formatMoney(preview.subtotal)}</p>
              <p>IVA: {formatMoney(preview.taxAmount)}</p>
              <p className="font-medium">Total: {formatMoney(preview.total)}</p>
            </div>

            {submitError ? (
              <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
            ) : null}
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar borrador"}
            </Button>
          </form>
        </Card>

        <Card title="Facturas registradas">
          {loading ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>
          ) : error ? (
            <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">
              Aún no hay facturas de compra.
            </p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-lg border border-[var(--ghost-border)] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {invoice.supplierName} · {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-[var(--ghost-text-muted)]">
                        {formatDate(invoice.invoiceDate)} · {invoice.lines.length} líneas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatMoney(invoice.total)}</p>
                      <p className="text-xs uppercase text-[var(--ghost-text-muted)]">
                        {invoice.status === "draft" ? "Borrador" : "Confirmada"}
                      </p>
                    </div>
                  </div>
                  {invoice.status === "draft" ? (
                    <Button
                      className="mt-3"
                      fullWidth
                      disabled={confirmingId === invoice.id}
                      onClick={() => handleConfirm(invoice.id)}
                    >
                      {confirmingId === invoice.id
                        ? "Confirmando..."
                        : "Confirmar y entrar inventario"}
                    </Button>
                  ) : null}
                  {invoice.attachmentDataUrl ? (
                    <a
                      href={invoice.attachmentDataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm text-[var(--ghost-brand-500)] underline"
                    >
                      Ver adjunto
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

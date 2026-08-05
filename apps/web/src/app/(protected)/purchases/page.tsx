"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { OperationalHint } from "@/components/operational-model-panel";
import { PageHeader } from "@/components/page-header";
import { useInventoryItems } from "@/hooks/use-inventory-items";
import { usePurchaseInvoices } from "@/hooks/use-purchase-invoices";
import { useWarehouses } from "@/hooks/use-warehouses";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { formatDate, formatMoney, todayIsoDate } from "@/lib/format";
import { compressImageFile } from "@/lib/image/compress-image";
import { createInventoryItem, createWarehouse } from "@/lib/inventory/inventory";
import {
  confirmPurchaseInvoice,
  createPurchaseInvoice,
  updatePurchaseInvoice,
} from "@/lib/purchases/purchases";
import { useActiveMembership } from "@/providers/auth-provider";
import {
  BASE_UNITS,
  BASE_UNIT_LABELS,
  CO_TAX_CATEGORIES,
  CO_TAX_CATEGORY_LABELS,
  buildPurchaseInvoiceLines,
  formatPresentationLabel,
  isoDateInTimezone,
  purchaseInvoiceAffectsInventory,
  resolvePurchaseInventoryEntry,
  summarizePurchaseInvoice,
  type BaseUnit,
  type CoTaxCategory,
  type InventoryItem,
  type PurchaseInvoice,
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
  const membership = useActiveMembership();
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
  const [creatingWarehouse, setCreatingWarehouse] = useState(false);
  const [creatingItemIndex, setCreatingItemIndex] = useState<number | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const branchId = membership?.branchIds[0] ?? "";
  const selectedWarehouseId = warehouseId || warehouses[0]?.id || "";
  const canSubmitPurchase = Boolean(selectedWarehouseId);
  const operationalToday = useMemo(() => isoDateInTimezone("America/Bogota"), []);
  const formAffectsInventory = purchaseInvoiceAffectsInventory(invoiceDate, {
    todayIso: operationalToday,
  });

  const preview = useMemo(() => {
    const built = buildPurchaseInvoiceLines(lines.filter((line) => line.description.trim()));
    return summarizePurchaseInvoice(built);
  }, [lines]);

  function removeLine(index: number) {
    setLines((current) =>
      current.length <= 1 ? current : current.filter((_, lineIndex) => lineIndex !== index),
    );
  }

  function resetForm() {
    setEditingInvoiceId(null);
    setSupplierName("");
    setInvoiceNumber("");
    setInvoiceDate(todayIsoDate());
    setLines([emptyLine()]);
    setAttachmentDataUrl("");
    setAttachmentName("");
    setSubmitError(null);
    setSaveMessage(null);
  }

  function loadInvoiceForEdit(invoice: PurchaseInvoice) {
    if (invoice.status !== "draft") {
      return;
    }

    setEditingInvoiceId(invoice.id);
    setSupplierName(invoice.supplierName);
    setInvoiceNumber(invoice.invoiceNumber);
    setInvoiceDate(invoice.invoiceDate);
    setWarehouseId(invoice.warehouseId ?? "");
    setLines(
      invoice.lines.length > 0
        ? invoice.lines.map((line) => ({
            inventoryItemId: line.inventoryItemId,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            unitPriceNet: line.unitPriceNet,
            taxCategory: line.taxCategory,
          }))
        : [emptyLine()],
    );
    setAttachmentDataUrl(invoice.attachmentDataUrl ?? "");
    setAttachmentName(invoice.attachmentName ?? "");
    setSubmitError(null);
    setSaveMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
      unit: (item.purchaseUnit ?? item.baseUnit) as BaseUnit,
    });
  }

  async function handleCreateDefaultWarehouse() {
    if (!branchId) {
      setSubmitError("No hay sucursal activa.");
      return;
    }

    setSubmitError(null);
    setCreatingWarehouse(true);

    try {
      const result = await createWarehouse({
        branchId,
        name: "Bodega principal",
        code: "MAIN",
        isDefault: true,
      });
      setWarehouseId(result.warehouseId);
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setCreatingWarehouse(false);
    }
  }

  async function handleCreateInventoryItem(index: number) {
    const line = lines[index];
    if (!line) {
      return;
    }

    const name = line.description.trim();

    if (!name || name.length < 2) {
      setSubmitError("Escribe la descripción del insumo antes de crearlo.");
      return;
    }

    setSubmitError(null);
    setCreatingItemIndex(index);

    try {
      const sku = buildQuickSku(name);
      const baseUnit =
        line.unit === "kg" ? "g" : line.unit === "l" ? "ml" : (line.unit as BaseUnit);
      const purchaseUnit = line.unit;
      const presentationQuantity =
        line.unit === "kg" || line.unit === "l" ? 1000 : 1;

      const result = await createInventoryItem({
        sku,
        name,
        type: "raw_material",
        baseUnit,
        purchaseUnit,
        presentationQuantity,
        presentationLabel: formatPresentationLabel({
          purchaseUnit,
          presentationQuantity,
          baseUnit,
        }),
      });

      updateLine(index, {
        inventoryItemId: result.itemId,
        description: name,
      });
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setCreatingItemIndex(null);
    }
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
    setSaveMessage(null);
    setSubmitting(true);

    try {
      if (!canSubmitPurchase) {
        throw new Error("Crea una bodega antes de registrar la compra.");
      }

      const payload = {
        supplierName,
        invoiceNumber,
        invoiceDate,
        warehouseId: selectedWarehouseId,
        lines: lines.filter((line) => line.description.trim()),
        attachmentDataUrl: attachmentDataUrl || undefined,
        attachmentName: attachmentName || undefined,
      };

      if (editingInvoiceId) {
        await updatePurchaseInvoice({ invoiceId: editingInvoiceId, ...payload });
        setSaveMessage("Factura actualizada. Puedes seguir agregando productos antes de confirmar.");
      } else {
        await createPurchaseInvoice(payload);
        setSaveMessage("Borrador guardado. Puedes editarlo para agregar más productos.");
        resetForm();
      }
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(invoice: PurchaseInvoice) {
    setSubmitError(null);
    setSaveMessage(null);
    setConfirmingId(invoice.id);

    try {
      const result = await confirmPurchaseInvoice({ invoiceId: invoice.id });
      if (!result.inventoryApplied) {
        setSaveMessage(
          `Factura del ${formatDate(invoice.invoiceDate)} registrada como histórico. No afecta bodega (solo fechas desde ${formatDate(operationalToday)}).`,
        );
      } else if (result.movements > 0) {
        setSaveMessage(`${result.movements} producto(s) entraron a bodega.`);
      } else {
        setSubmitError(
          "Factura confirmada sin movimientos. Vincula ítems de inventario en las líneas.",
        );
      }
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div className="ghost-page-stack pb-4">
      <PageHeader
        title="Compras"
        description={`Facturas de proveedor. Desde ${formatDate(operationalToday)} mueven bodega al confirmar.`}
        backHref="/inventory"
        backLabel="Inventario"
      />

      <OperationalHint context="purchases" />

      <Card title="Regla de bodega">
        <p className="text-sm text-[var(--ghost-text-muted)]">
          Puedes cargar facturas pasadas para tener el historial de compras. Al confirmarlas,{" "}
          <strong>no suman stock ni cambian costos</strong> en inventario. Desde{" "}
          {formatDate(operationalToday)} cada compra confirmada sí actualiza bodega y costos para{" "}
          <Link href="/costing" className="underline">
            costeo
          </Link>
          .
        </p>
      </Card>

      {warehouses.length === 0 ? (
        <Card title="Configura tu bodega">
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Necesitas al menos una bodega para registrar compras y actualizar costos de insumos.
          </p>
          <Button
            className="mt-4"
            onClick={handleCreateDefaultWarehouse}
            disabled={creatingWarehouse || !branchId}
            fullWidth
          >
            {creatingWarehouse ? "Creando..." : "Crear bodega principal"}
          </Button>
          <p className="mt-2 text-xs text-[var(--ghost-text-muted)]">
            También puedes gestionar bodegas en{" "}
            <Link href="/inventory/warehouses" className="underline">
              Inventario → Bodegas
            </Link>
            .
          </p>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card title={editingInvoiceId ? "Editar borrador" : "Nueva factura de compra"}>
          {editingInvoiceId ? (
            <p className="mb-3 text-sm text-[var(--ghost-brand-500)]">
              Editando borrador · agrega o quita productos y guarda de nuevo.
            </p>
          ) : null}
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
                {!formAffectsInventory ? (
                  <span className="text-xs text-[var(--ghost-brand-500)]">
                    Fecha anterior a hoy · al confirmar solo queda registrada (sin bodega)
                  </span>
                ) : (
                  <span className="text-xs text-[var(--ghost-text-muted)]">
                    Entrará a bodega al confirmar
                  </span>
                )}
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Bodega destino</span>
              <select
                required
                value={selectedWarehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
                className="ghost-input"
                disabled={warehouses.length === 0}
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
                <span className="text-sm font-medium">Productos de la factura</span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setLines((current) => [...current, emptyLine()])}
                >
                  + Agregar producto
                </Button>
              </div>
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-lg border border-[var(--ghost-border)] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase text-[var(--ghost-text-muted)]">
                      Producto {index + 1}
                    </span>
                    {lines.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-xs text-[var(--ghost-danger)] underline"
                      >
                        Quitar
                      </button>
                    ) : null}
                  </div>
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
                    placeholder="Descripción del insumo"
                  />
                  {!line.inventoryItemId ? (
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      disabled={creatingItemIndex === index}
                      onClick={() => handleCreateInventoryItem(index)}
                    >
                      {creatingItemIndex === index
                        ? "Creando insumo..."
                        : "Crear insumo en inventario"}
                    </Button>
                  ) : (
                    <p className="text-xs text-[var(--ghost-brand-500)]">
                      Vinculado a inventario · al confirmar actualiza el costo
                    </p>
                  )}
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
                  {line.inventoryItemId && line.quantity > 0 && line.unitPriceNet > 0 ? (
                    <PurchaseInventoryPreview
                      line={line}
                      item={inventoryItems.find((entry) => entry.id === line.inventoryItemId)}
                    />
                  ) : null}
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
            {saveMessage ? (
              <p className="text-sm text-[var(--ghost-brand-500)]">{saveMessage}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" fullWidth disabled={submitting || !canSubmitPurchase}>
                {submitting
                  ? "Guardando..."
                  : editingInvoiceId
                    ? "Guardar cambios"
                    : "Guardar borrador"}
              </Button>
              {editingInvoiceId ? (
                <Button type="button" variant="secondary" fullWidth onClick={resetForm}>
                  Cancelar edición
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card title="Facturas registradas (por fecha)">
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
                        {formatDate(invoice.invoiceDate)} · {invoice.lines.length} producto(s)
                      </p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {invoice.lines.map((line, lineIndex) => (
                          <li key={lineIndex} className="text-[var(--ghost-text-muted)]">
                            {line.description}
                            <span className="ml-1">
                              · {line.quantity} {BASE_UNIT_LABELS[line.unit]} ·{" "}
                              {formatMoney(line.lineTotal)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatMoney(invoice.total)}</p>
                      <p className="text-xs uppercase text-[var(--ghost-text-muted)]">
                        {invoice.status === "draft"
                          ? purchaseInvoiceAffectsInventory(invoice.invoiceDate, {
                              todayIso: operationalToday,
                            })
                            ? "Borrador · con bodega"
                            : "Borrador · solo registro"
                          : invoice.inventoryApplied
                            ? "Confirmada · en bodega"
                            : "Confirmada · histórico"}
                      </p>
                    </div>
                  </div>
                  {invoice.status === "draft" ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="secondary"
                        fullWidth
                        onClick={() => loadInvoiceForEdit(invoice)}
                      >
                        Editar productos
                      </Button>
                      <Button
                        fullWidth
                        disabled={confirmingId === invoice.id}
                        onClick={() => handleConfirm(invoice)}
                      >
                        {confirmingId === invoice.id
                          ? "Confirmando..."
                          : purchaseInvoiceAffectsInventory(invoice.invoiceDate, {
                                todayIso: operationalToday,
                              })
                            ? "Confirmar y entrar inventario"
                            : "Registrar histórico (sin bodega)"}
                      </Button>
                    </div>
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

function PurchaseInventoryPreview({
  line,
  item,
}: {
  line: PurchaseInvoiceLineInput;
  item?: InventoryItem;
}) {
  if (!item) {
    return null;
  }

  const [builtLine] = buildPurchaseInvoiceLines([line]);
  if (!builtLine) {
    return null;
  }

  const entry = resolvePurchaseInventoryEntry({
    line: builtLine,
    baseUnit: item.baseUnit,
    purchaseUnit: item.purchaseUnit,
    presentationQuantity: item.presentationQuantity,
  });

  return (
    <p className="text-xs text-[var(--ghost-text-muted)]">
      Entrada inventario: {entry.quantityInBase.toLocaleString("es-CO")} {item.baseUnit} · costo
      neto {formatMoney(entry.unitCostNetPerBase)}/{item.baseUnit}
      {item.presentationLabel || item.purchaseUnit
        ? ` · ${formatPresentationLabel({
            presentationLabel: item.presentationLabel,
            purchaseUnit: item.purchaseUnit,
            presentationQuantity: item.presentationQuantity,
            baseUnit: item.baseUnit,
          })}`
        : ""}
    </p>
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

function buildQuickSku(name: string): string {
  const prefix = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()
    .slice(0, 12);

  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix || "INS"}-${suffix}`;
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useMenuProducts } from "@/hooks/use-menu-products";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { formatMoney } from "@/lib/format";
import { createSale } from "@/lib/pos/pos";
import { useAuth } from "@/providers/auth-provider";
import {
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type MenuCategory,
  type PaymentMethod,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  station: string;
}

export default function PosPage() {
  const { organization } = useAuth();
  const { products, loading, error } = useMenuProducts();
  const [category, setCategory] = useState<MenuCategory | "all">("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSaleNumber, setLastSaleNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    if (category === "all") {
      return products;
    }

    return products.filter((product) => product.category === category);
  }, [category, products]);

  const subtotal = cart.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const taxRate = organization?.settings.taxRate ?? 0.19;
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;

  function addToCart(product: (typeof products)[number]) {
    setSuccess(null);
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: 1,
          station: product.station,
        },
      ];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((current) => current.filter((line) => line.productId !== productId));
      return;
    }

    setCart((current) =>
      current.map((line) =>
        line.productId === productId ? { ...line, quantity } : line,
      ),
    );
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      setSubmitError("Agrega productos al carrito.");
      return;
    }

    setSubmitError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const result = await createSale({
        lines: cart,
        paymentMethod,
        customerName: customerName.trim() || undefined,
      });
      setCart([]);
      setCustomerName("");
      setLastSaleNumber(result.saleNumber);
      setSuccess(
        `Registro ${result.saleNumber} guardado · ${formatMoney(result.total)}` +
          (result.kitchenOrderIds.length > 0
            ? ` · ${result.kitchenOrderIds.length} comanda(s) generadas`
            : ""),
      );
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 pb-24 md:pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--ghost-text-muted)]">Mostrador</p>
          <h1 className="text-2xl font-semibold">Registro de operaciones</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pos/menu">
            <Button variant="secondary" size="sm">
              Catálogo
            </Button>
          </Link>
          <Link href="/billing">
            <Button variant="secondary" size="sm">
              Registros
            </Button>
          </Link>
          <Link href="/kds">
            <Button variant="secondary" size="sm">
              Comandas
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando menú...</p>
      ) : error ? (
        <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
      ) : products.length === 0 ? (
        <Card title="Sin catálogo">
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Agrega ítems al catálogo antes de registrar operaciones en mostrador.
          </p>
          <Link href="/pos/menu" className="mt-4 inline-block">
            <Button>Ir al catálogo</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={[
                  "rounded-full px-3 py-1 text-sm",
                  category === "all"
                    ? "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)]"
                    : "bg-[var(--ghost-surface-2)]",
                ].join(" ")}
              >
                Todos
              </button>
              {MENU_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={[
                    "rounded-full px-3 py-1 text-sm",
                    category === item
                      ? "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)]"
                      : "bg-[var(--ghost-surface-2)]",
                  ].join(" ")}
                >
                  {MENU_CATEGORY_LABELS[item]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="rounded-xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] p-4 text-left transition hover:border-[var(--ghost-brand-500)]"
                >
                  <p className="font-medium">{product.name}</p>
                  <p className="mt-1 text-sm text-[var(--ghost-brand-500)]">
                    {formatMoney(product.price)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <Card title="Operación actual" description="Selecciona ítems y confirma el registro.">
            {cart.length === 0 ? (
              <p className="text-sm text-[var(--ghost-text-muted)]">
                Selecciona un ítem del catálogo.
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((line) => (
                  <div
                    key={line.productId}
                    className="flex items-center justify-between gap-2 border-b border-[var(--ghost-border)] pb-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{line.name}</p>
                      <p className="text-xs text-[var(--ghost-text-muted)]">
                        {formatMoney(line.unitPrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="ghost-input h-8 w-8 px-0"
                        onClick={() =>
                          updateQuantity(line.productId, line.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">{line.quantity}</span>
                      <button
                        type="button"
                        className="ghost-input h-8 w-8 px-0"
                        onClick={() =>
                          updateQuantity(line.productId, line.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--ghost-text-muted)]">
                    <span>IVA ({Math.round(taxRate * 100)}%)</span>
                    <span>{formatMoney(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                </div>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">Referencia (opcional)</span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="ghost-input"
                    placeholder="Nombre o nota interna"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">Medio de pago</span>
                  <select
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(event.target.value as PaymentMethod)
                    }
                    className="ghost-input"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </option>
                    ))}
                  </select>
                </label>

                {submitError ? (
                  <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
                ) : null}
                {success ? (
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--ghost-brand-500)]">{success}</p>
                    {lastSaleNumber ? (
                      <Link href="/billing">
                        <Button variant="secondary" fullWidth size="sm">
                          Ver en registros
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                <Button
                  fullWidth
                  size="lg"
                  disabled={submitting}
                  onClick={handleCheckout}
                >
                  {submitting ? "Guardando..." : "Confirmar registro"}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

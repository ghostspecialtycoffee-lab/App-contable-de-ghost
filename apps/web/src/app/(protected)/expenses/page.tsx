"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useFixedExpenses } from "@/hooks/use-fixed-expenses";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { formatMoney } from "@/lib/format";
import { createFixedExpense, updateFixedExpense } from "@/lib/expenses/expenses";
import {
  FIXED_EXPENSE_CATEGORIES,
  FIXED_EXPENSE_CATEGORY_LABELS,
  FIXED_EXPENSE_FREQUENCIES,
  FIXED_EXPENSE_FREQUENCY_LABELS,
  calculateMonthlyEquivalent,
  summarizeFixedExpenses,
  type FixedExpenseCategory,
  type FixedExpenseFrequency,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function FixedExpensesPage() {
  const { expenses, loading, error } = useFixedExpenses();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FixedExpenseCategory>("rent");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<FixedExpenseFrequency>("monthly");
  const [supplierName, setSupplierName] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const summary = useMemo(() => summarizeFixedExpenses(expenses), [expenses]);

  const previewMonthly = useMemo(() => {
    const value = Number(amount) || 0;
    return value > 0 ? calculateMonthlyEquivalent(value, frequency) : 0;
  }, [amount, frequency]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      await createFixedExpense({
        name,
        category,
        amount: Number(amount),
        frequency,
        supplierName: supplierName || undefined,
        dueDay: dueDay ? Number(dueDay) : undefined,
        notes: notes || undefined,
      });

      setName("");
      setAmount("");
      setSupplierName("");
      setDueDay("");
      setNotes("");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(expenseId: string, isActive: boolean) {
    setSubmitError(null);
    setWorkingId(expenseId);

    try {
      await updateFixedExpense({
        expenseId,
        patch: { isActive: !isActive },
      });
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/billing" className="underline">
            Registros
          </Link>{" "}
          ·{" "}
          <Link href="/costing" className="underline">
            Costeo
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Gastos fijos</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Arriendo, nómina, servicios y otros costos recurrentes para calcular el punto de equilibrio
          operativo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Total mensual activo">
          <p className="text-2xl font-bold">{formatMoney(summary.monthlyTotal)}</p>
          <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
            {summary.activeCount} gasto(s) activo(s)
          </p>
        </Card>
        <Card title="Proyección anual">
          <p className="text-2xl font-bold">{formatMoney(summary.annualProjection)}</p>
        </Card>
        <Card title="Mayor rubro">
          <p className="text-2xl font-bold">
            {formatMoney(Math.max(...Object.values(summary.byCategory), 0))}
          </p>
          <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
            Suma por categoría en el mes
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card title="Registrar gasto fijo">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Nombre</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="ghost-input"
                placeholder="Arriendo local, Nómina barra..."
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Categoría</span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as FixedExpenseCategory)
                }
                className="ghost-input"
              >
                {FIXED_EXPENSE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {FIXED_EXPENSE_CATEGORY_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Monto (COP)</span>
                <input
                  required
                  type="number"
                  min="1"
                  step="1000"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="ghost-input"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Frecuencia</span>
                <select
                  value={frequency}
                  onChange={(event) =>
                    setFrequency(event.target.value as FixedExpenseFrequency)
                  }
                  className="ghost-input"
                >
                  {FIXED_EXPENSE_FREQUENCIES.map((item) => (
                    <option key={item} value={item}>
                      {FIXED_EXPENSE_FREQUENCY_LABELS[item]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {previewMonthly > 0 ? (
              <p className="rounded-lg bg-[var(--ghost-surface-2)] p-2 text-sm">
                Equivalente mensual: {formatMoney(previewMonthly)}
              </p>
            ) : null}
            <label className="block space-y-1">
              <span className="text-sm font-medium">Proveedor / beneficiario</span>
              <input
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                className="ghost-input"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Día de pago (1-31)</span>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(event) => setDueDay(event.target.value)}
                className="ghost-input"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Notas</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="ghost-input min-h-[72px]"
              />
            </label>
            {submitError ? (
              <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
            ) : null}
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar gasto fijo"}
            </Button>
          </form>
        </Card>

        <Card title="Gastos registrados">
          {loading ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">Cargando...</p>
          ) : error ? (
            <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-[var(--ghost-text-muted)]">
              Registra arriendo, nómina, servicios públicos y otros gastos recurrentes.
            </p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className={[
                    "rounded-lg border border-[var(--ghost-border)] p-3",
                    expense.isActive ? "" : "opacity-60",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{expense.name}</p>
                      <p className="text-sm text-[var(--ghost-text-muted)]">
                        {FIXED_EXPENSE_CATEGORY_LABELS[expense.category]} ·{" "}
                        {FIXED_EXPENSE_FREQUENCY_LABELS[expense.frequency]}
                        {expense.dueDay ? ` · día ${expense.dueDay}` : ""}
                      </p>
                      {expense.supplierName ? (
                        <p className="text-xs text-[var(--ghost-text-muted)]">
                          {expense.supplierName}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatMoney(expense.amount)}</p>
                      <p className="text-xs text-[var(--ghost-text-muted)]">
                        {formatMoney(expense.monthlyEquivalent)}/mes
                      </p>
                    </div>
                  </div>
                  <Button
                    className="mt-3"
                    variant="secondary"
                    fullWidth
                    disabled={workingId === expense.id}
                    onClick={() => toggleActive(expense.id, expense.isActive)}
                  >
                    {workingId === expense.id
                      ? "Actualizando..."
                      : expense.isActive
                        ? "Desactivar"
                        : "Activar"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {summary.activeCount > 0 ? (
        <Card title="Desglose mensual por categoría">
          <ul className="space-y-2 text-sm">
            {FIXED_EXPENSE_CATEGORIES.map((item) =>
              summary.byCategory[item] > 0 ? (
                <li key={item} className="flex justify-between gap-2">
                  <span>{FIXED_EXPENSE_CATEGORY_LABELS[item]}</span>
                  <span className="font-medium">{formatMoney(summary.byCategory[item])}</span>
                </li>
              ) : null,
            )}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

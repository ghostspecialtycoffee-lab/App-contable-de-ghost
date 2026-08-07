"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { usePurchaseInvoices } from "@/hooks/use-purchase-invoices";
import { useSales } from "@/hooks/use-sales";
import { useActiveMembership } from "@/providers/auth-provider";
import {
  buildAnalyticsPeriodSummary,
  rollupDailyAnalyticsFromSources,
  type AnalyticsPeriodSummary,
  type DailyAnalyticsSnapshot,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

function lastNDates(days: number): { from: string; to: string } {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (days - 1));
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

function mapAnalyticsDoc(data: Record<string, unknown>): DailyAnalyticsSnapshot {
  return {
    date: String(data.date ?? ""),
    salesCount: Number(data.salesCount ?? 0),
    salesTotal: Number(data.salesTotal ?? 0),
    purchasesCount: Number(data.purchasesCount ?? 0),
    purchasesTotal: Number(data.purchasesTotal ?? 0),
    inventoryMovements: Number(data.inventoryMovements ?? 0),
  };
}

export function useDailyAnalytics(days = 7): {
  summary: AnalyticsPeriodSummary | null;
  loading: boolean;
  error: string | null;
  source: "warehouse" | "computed";
} {
  const membership = useActiveMembership();
  const { sales, loading: salesLoading } = useSales();
  const { invoices, loading: purchasesLoading } = usePurchaseInvoices();
  const [warehouseSnapshots, setWarehouseSnapshots] = useState<DailyAnalyticsSnapshot[]>([]);
  const [warehouseLoading, setWarehouseLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => lastNDates(days), [days]);

  useEffect(() => {
    const organizationId = membership?.organizationId;
    if (!organizationId) {
      setWarehouseSnapshots([]);
      setWarehouseLoading(false);
      return;
    }

    let cancelled = false;

    const orgId = organizationId;

    async function loadWarehouse() {
      setWarehouseLoading(true);
      try {
        const analyticsQuery = query(
          collection(
            getFirestoreDb(),
            firestorePaths.organizationAnalyticsDaily(orgId),
          ),
          where("date", ">=", range.from),
          where("date", "<=", range.to),
          limit(60),
        );
        const snapshot = await getDocs(analyticsQuery);
        if (cancelled) {
          return;
        }
        setWarehouseSnapshots(
          snapshot.docs.map((document) => mapAnalyticsDoc(document.data())),
        );
        setError(null);
      } catch (cause) {
        if (!cancelled) {
          setError(getFirestoreErrorMessage(cause));
          setWarehouseSnapshots([]);
        }
      } finally {
        if (!cancelled) {
          setWarehouseLoading(false);
        }
      }
    }

    void loadWarehouse();
    return () => {
      cancelled = true;
    };
  }, [membership?.organizationId, range.from, range.to]);

  const computedSnapshots = useMemo(
    () =>
      rollupDailyAnalyticsFromSources({
        sales: sales.map((sale) => ({
          soldOn: sale.soldOn ?? (sale.soldAt ?? sale.createdAt).slice(0, 10),
          status: sale.status,
          total: sale.total,
        })),
        purchases: invoices.map((invoice) => ({
          invoiceDate: invoice.invoiceDate,
          status: invoice.status,
          total: invoice.total,
        })),
      }).filter((snapshot) => snapshot.date >= range.from && snapshot.date <= range.to),
    [sales, invoices, range.from, range.to],
  );

  const loading = warehouseLoading || salesLoading || purchasesLoading;

  const summary = useMemo(() => {
    const warehouseByDate = new Map(warehouseSnapshots.map((snapshot) => [snapshot.date, snapshot]));
    const computedByDate = new Map(computedSnapshots.map((snapshot) => [snapshot.date, snapshot]));
    const allDates = new Set([...warehouseByDate.keys(), ...computedByDate.keys()]);
    const snapshots = [...allDates]
      .sort()
      .map((date) => warehouseByDate.get(date) ?? computedByDate.get(date))
      .filter((snapshot): snapshot is DailyAnalyticsSnapshot => Boolean(snapshot));

    if (snapshots.length === 0) {
      return null;
    }

    return buildAnalyticsPeriodSummary({
      snapshots,
      from: range.from,
      to: range.to,
    });
  }, [warehouseSnapshots, computedSnapshots, range.from, range.to]);

  return {
    summary,
    loading,
    error,
    source: warehouseSnapshots.length > 0 ? "warehouse" : "computed",
  };
}

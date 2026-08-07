"use client";

import { useEffect, useState } from "react";
import { collection, limit, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { parseFirestoreDate } from "@/lib/format";
import { getFirestoreDb } from "@/lib/firebase/client";
import { subscribeQueryWithPoll } from "@/lib/realtime/subscribe-query";
import { useActiveMembership } from "@/providers/auth-provider";
import type { Sale } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

function mapSale(documentId: string, data: Record<string, unknown>): Sale {
  const soldAt =
    (typeof data.soldAt === "string" && data.soldAt) ||
    parseFirestoreDate(data.createdAt);

  return {
    id: documentId,
    organizationId: String(data.organizationId ?? ""),
    branchId: String(data.branchId ?? ""),
    saleNumber: String(data.saleNumber ?? ""),
    status: (data.status as Sale["status"]) ?? "paid",
    lines: (data.lines as Sale["lines"]) ?? [],
    subtotal: Number(data.subtotal ?? 0),
    taxRate: Number(data.taxRate ?? 0),
    taxAmount: Number(data.taxAmount ?? 0),
    total: Number(data.total ?? 0),
    taxBreakdown: (data.taxBreakdown as Sale["taxBreakdown"]) ?? undefined,
    paymentMethod: (data.paymentMethod as Sale["paymentMethod"]) ?? "cash",
    cashierUserId: String(data.cashierUserId ?? ""),
    customerName: String(data.customerName ?? ""),
    notes: String(data.notes ?? ""),
    soldAt,
    soldOn:
      (typeof data.soldOn === "string" && data.soldOn) ||
      soldAt.slice(0, 10),
    tableId: typeof data.tableId === "string" ? data.tableId : undefined,
    tableNumber: typeof data.tableNumber === "number" ? data.tableNumber : undefined,
    tableLabel: typeof data.tableLabel === "string" ? data.tableLabel : undefined,
    tableSessionId: typeof data.tableSessionId === "string" ? data.tableSessionId : undefined,
    lotConsumptions: Array.isArray(data.lotConsumptions)
      ? (data.lotConsumptions as Sale["lotConsumptions"])
      : undefined,
    createdAt: soldAt,
    updatedAt: parseFirestoreDate(data.updatedAt) || soldAt,
    createdBy: String(data.createdBy ?? ""),
    updatedBy: String(data.updatedBy ?? ""),
  };
}

export function useSales() {
  const membership = useActiveMembership();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setSales([]);
      setLoading(false);
      return;
    }

    const salesQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationSales(membership.organizationId),
      ),
      limit(500),
    );

    return subscribeQueryWithPoll({
      query: salesQuery,
      mapSnapshot: (snapshot) =>
        snapshot.docs
          .map((document) => mapSale(document.id, document.data()))
          .filter((sale) => sale.status === "paid")
          .sort((left, right) => {
            const leftTime = new Date(left.soldAt ?? left.createdAt).getTime();
            const rightTime = new Date(right.soldAt ?? right.createdAt).getTime();
            return rightTime - leftTime;
          }),
      onData: (nextSales) => {
        setSales(nextSales);
        setLoading(false);
        setError(null);
      },
      onError: (message) => {
        setError(message);
        setLoading(false);
      },
    });
  }, [membership?.organizationId]);

  return { sales, loading, error };
}

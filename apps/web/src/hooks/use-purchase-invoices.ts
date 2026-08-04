"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, query } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { parseFirestoreDate } from "@/lib/format";
import { useActiveMembership } from "@/providers/auth-provider";
import type { PurchaseInvoice } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function usePurchaseInvoices() {
  const membership = useActiveMembership();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    const invoicesQuery = query(
      collection(
        getFirestoreDb(),
        firestorePaths.organizationPurchaseInvoices(membership.organizationId),
      ),
      limit(100),
    );

    const unsubscribe = onSnapshot(
      invoicesQuery,
      (snapshot) => {
        const nextInvoices = snapshot.docs
          .map((document) => {
            const data = document.data();
            return {
              id: document.id,
              organizationId: data.organizationId,
              branchId: data.branchId,
              supplierName: data.supplierName,
              invoiceNumber: data.invoiceNumber,
              invoiceDate: data.invoiceDate,
              status: data.status,
              lines: data.lines ?? [],
              subtotal: data.subtotal ?? 0,
              taxAmount: data.taxAmount ?? 0,
              total: data.total ?? 0,
              warehouseId: data.warehouseId,
              attachmentDataUrl: data.attachmentDataUrl,
              attachmentName: data.attachmentName,
              createdAt: parseFirestoreDate(data.createdAt),
              updatedAt: parseFirestoreDate(data.updatedAt),
              createdBy: data.createdBy ?? "",
              updatedBy: data.updatedBy ?? "",
            } satisfies PurchaseInvoice;
          })
          .sort((left, right) => right.invoiceDate.localeCompare(left.invoiceDate));

        setInvoices(nextInvoices);
        setLoading(false);
        setError(null);
      },
      (cause) => {
        setError(getFirestoreErrorMessage(cause));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [membership?.organizationId]);

  return { invoices, loading, error };
}

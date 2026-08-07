"use client";

import { useEffect, useState } from "react";

import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";
import { useAuth } from "@/providers/auth-provider";
import { firestorePaths } from "@ghost/infrastructure";

export interface WorkflowOutboxRow {
  id: string;
  workflowId: string;
  title: string;
  message: string;
  actionUrl: string;
  channel: string;
  status: string;
  createdAt?: string;
}

export function useWorkflowOutbox(limitCount = 8) {
  const { organization } = useAuth();
  const [entries, setEntries] = useState<WorkflowOutboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organization?.id) {
      setEntries([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getDocs(
      query(
        collection(getFirestoreDb(), firestorePaths.organizationWorkflowOutbox(organization.id)),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      ),
    )
      .then((snapshot) => {
        if (cancelled) {
          return;
        }
        setEntries(
          snapshot.docs.map((document) => {
            const data = document.data();
            return {
              id: document.id,
              workflowId: String(data.workflowId ?? ""),
              title: String(data.title ?? ""),
              message: String(data.message ?? ""),
              actionUrl: String(data.actionUrl ?? ""),
              channel: String(data.channel ?? ""),
              status: String(data.status ?? ""),
              createdAt:
                data.createdAt && typeof data.createdAt.toDate === "function"
                  ? data.createdAt.toDate().toISOString()
                  : undefined,
            };
          }),
        );
        setError(null);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar automatizaciones.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organization?.id, limitCount]);

  return { entries, loading, error };
}

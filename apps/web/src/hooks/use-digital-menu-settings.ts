"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { getFirestoreErrorMessage } from "@/lib/auth/errors";
import { getFirestoreDb } from "@/lib/firebase/client";
import { parseDigitalMenuSettings } from "@/lib/digital-menu/digital-menu-settings-client";
import {
  DEFAULT_DIGITAL_MENU_SETTINGS,
  type OrganizationDigitalMenuSettings,
  type PublicDigitalMenuConfig,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";

export function useDigitalMenuSettings(organizationId: string | null | undefined) {
  const [settings, setSettings] = useState<OrganizationDigitalMenuSettings>(
    DEFAULT_DIGITAL_MENU_SETTINGS,
  );
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setSettings(DEFAULT_DIGITAL_MENU_SETTINGS);
      setLoading(false);
      return;
    }

    const organizationRef = doc(getFirestoreDb(), firestorePaths.organization(organizationId));

    const unsubscribe = onSnapshot(
      organizationRef,
      (snapshot) => {
        const data = snapshot.data();
        setSettings(parseDigitalMenuSettings(data?.digitalMenuSettings));
        setLoading(false);
        setError(null);
      },
      (cause) => {
        setError(getFirestoreErrorMessage(cause));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [organizationId]);

  return { settings, loading, error };
}

export function usePublicDigitalMenu(organizationId: string | null) {
  const [config, setConfig] = useState<PublicDigitalMenuConfig | null>(null);
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setConfig(null);
      setLoading(false);
      return;
    }

    const configRef = doc(
      getFirestoreDb(),
      firestorePaths.organizationPublicDigitalMenuConfig(organizationId),
    );

    const unsubscribe = onSnapshot(
      configRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setConfig({
            organizationId,
            organizationName: "Menú",
            ...DEFAULT_DIGITAL_MENU_SETTINGS,
          });
          setLoading(false);
          setError(null);
          return;
        }

        const data = snapshot.data();
        const settings = parseDigitalMenuSettings(data);

        setConfig({
          organizationId,
          organizationName: (data.organizationName as string) || "Menú",
          slug: (data.slug as string | undefined) ?? undefined,
          logoDataUrl: data.logoDataUrl as string | undefined,
          logoMimeType: data.logoMimeType as string | undefined,
          ...settings,
        });
        setLoading(false);
        setError(null);
      },
      (cause) => {
        setError(getFirestoreErrorMessage(cause));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [organizationId]);

  return { config, loading, error };
}

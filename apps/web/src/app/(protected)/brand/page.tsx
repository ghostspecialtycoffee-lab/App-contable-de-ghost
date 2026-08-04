"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { useBrandAssets } from "@/hooks/use-brand-assets";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import {
  archiveBrandAsset,
  setPrimaryBrandAsset,
  uploadBrandAsset,
} from "@/lib/brand/brand";
import { compressImageFile } from "@/lib/image/compress-image";
import { useAuth } from "@/providers/auth-provider";
import {
  BRAND_ASSET_TYPES,
  BRAND_ASSET_TYPE_LABELS,
  type BrandAssetType,
} from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function BrandPage() {
  const { organization } = useAuth();
  const { assets, primaryLogo, loading, error } = useBrandAssets();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assetType, setAssetType] = useState<BrandAssetType>("logo");
  const [setAsPrimary, setSetAsPrimary] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const compressed = await compressImageFile(file);
      await uploadBrandAsset({
        name: compressed.name,
        type: assetType,
        dataUrl: compressed.dataUrl,
        mimeType: compressed.mimeType,
        isPrimary: setAsPrimary,
      });
    } catch (cause) {
      setUploadError(getCallableErrorMessage(cause));
    } finally {
      setUploading(false);
    }
  }

  async function handleSetPrimary(assetId: string) {
    setActionError(null);
    setWorkingId(assetId);
    try {
      await setPrimaryBrandAsset(assetId);
    } catch (cause) {
      setActionError(getCallableErrorMessage(cause));
    } finally {
      setWorkingId(null);
    }
  }

  async function handleArchive(assetId: string) {
    setActionError(null);
    setWorkingId(assetId);
    try {
      await archiveBrandAsset(assetId);
    } catch (cause) {
      setActionError(getCallableErrorMessage(cause));
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--ghost-text-muted)]">
            <Link href="/dashboard" className="underline">
              Panel
            </Link>
          </p>
          <h1 className="text-2xl font-semibold">Identidad visual</h1>
          <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
            Logos para facturas y operación interna.{" "}
            <Link href="/settings/fiscal" className="underline">
              Configurar datos de facturación
            </Link>
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card title="Logo principal">
          <div className="flex flex-col items-center gap-4 py-2">
            <BrandLogo
              asset={primaryLogo}
              organizationName={organization?.name}
              size="xl"
            />
            <p className="text-center text-sm text-[var(--ghost-text-muted)]">
              {primaryLogo?.name ?? "Sin logo principal asignado"}
            </p>
          </div>
        </Card>

        <Card title="Subir archivo">
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex min-h-[160px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] px-4 text-center transition hover:border-[var(--ghost-text-muted)]"
            >
              <p className="text-sm font-medium">Seleccionar imagen</p>
              <p className="mt-1 text-xs text-[var(--ghost-text-muted)]">
                PNG, JPG, WEBP o SVG · máx. ~450 KB
              </p>
              {uploading ? (
                <p className="mt-3 text-xs text-[var(--ghost-text-muted)]">Procesando...</p>
              ) : null}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Tipo</span>
                <select
                  value={assetType}
                  onChange={(event) =>
                    setAssetType(event.target.value as BrandAssetType)
                  }
                  className="ghost-input"
                >
                  {BRAND_ASSET_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {BRAND_ASSET_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-3 text-sm">
                <input
                  type="checkbox"
                  checked={setAsPrimary}
                  onChange={(event) => setSetAsPrimary(event.target.checked)}
                />
                Usar como logo principal
              </label>
            </div>

            {uploadError ? (
              <p className="text-sm text-[var(--ghost-danger)]">{uploadError}</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card title="Biblioteca visual">
        {loading ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">Cargando archivos...</p>
        ) : error ? (
          <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
        ) : assets.length === 0 ? (
          <p className="text-sm text-[var(--ghost-text-muted)]">
            Sube el primer logo o ícono para usarlo en el panel y comprobantes.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="overflow-hidden rounded-xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)]"
              >
                <div className="flex aspect-[4/3] items-center justify-center border-b border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.dataUrl}
                    alt={asset.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-xs text-[var(--ghost-text-muted)]">
                      {BRAND_ASSET_TYPE_LABELS[asset.type]}
                      {asset.isPrimary ? " · Principal" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!asset.isPrimary ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={workingId === asset.id}
                        onClick={() => handleSetPrimary(asset.id)}
                      >
                        Principal
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={workingId === asset.id}
                      onClick={() => handleArchive(asset.id)}
                    >
                      Archivar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {actionError ? (
        <p className="text-sm text-[var(--ghost-danger)]">{actionError}</p>
      ) : null}
    </div>
  );
}

# Blaze + Storage — configuración automática

Ghost Contable necesita **plan Blaze** (Cloud Functions) y **Firebase Storage** (adjuntos, facturas, fotos grandes).

## Lo que ya es automático

Cada push a `main` ejecuta:

1. `scripts/setup-firebase-infrastructure.mjs` — habilita APIs y crea bucket Storage si puede
2. Deploy de **hosting + reglas Firestore**
3. Intento de deploy **Functions + Storage** (solo funciona con Blaze activo)

Workflow manual adicional: **Actions → Setup Firebase Infrastructure → Run workflow**

---

## Paso único manual (si no tienes el secret de facturación)

### Opción A — Consola (5 minutos, más simple)

1. **Blaze:** [Activar facturación](https://console.firebase.google.com/project/ghost-contable/usage/details)
   - Plan Blaze (pay-as-you-go)
   - Puedes poner alertas de presupuesto en $5–10 USD/mes

2. **Storage:** [Comenzar Storage](https://console.firebase.google.com/project/ghost-contable/storage)
   - Ubicación recomendada: `us-central1`
   - Bucket: `ghost-contable.firebasestorage.app`

3. Re-ejecutar workflow **Setup Firebase Infrastructure** en GitHub Actions

### Opción B — 100% automático desde GitHub (recomendado)

1. En [Google Cloud Billing](https://console.cloud.google.com/billing) copia el **ID de cuenta de facturación**  
   Formato: `012345-678901-ABCDEF`

2. En GitHub → repo → **Settings → Secrets → Actions**, agrega:

   | Secret | Valor |
   |--------|--------|
   | `GCP_BILLING_ACCOUNT_ID` | `012345-678901-ABCDEF` |
   | `FIREBASE_SERVICE_ACCOUNT` | JSON cuenta de servicio (ya debería existir) |

3. La cuenta de servicio necesita en Google Cloud IAM:
   - **Firebase Admin** o **Editor del proyecto**
   - **Service Usage Admin** (habilitar APIs)
   - **Storage Admin** (crear bucket)
   - **Billing Account User** en la cuenta de facturación (para vincular Blaze)

4. Ejecuta workflow: **Setup Firebase Infrastructure**

---

## Verificar en local

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/service-account.json
export GCP_BILLING_ACCOUNT_ID=012345-678901-ABCDEF   # opcional

pnpm firebase:setup-infrastructure
pnpm firebase:deploy:backend
```

---

## Costos estimados (uso típico cafetería)

| Servicio | Spark (actual) | Blaze |
|----------|----------------|-------|
| Hosting | Gratis | Gratis |
| Firestore | Gratis (límites) | Gratis hasta cuota |
| Functions | ❌ No disponible | ~$0–5/mes uso bajo |
| Storage | ❌ No configurado | ~$0–2/mes fotos |

Activa **alertas de presupuesto** en Google Cloud para evitar sorpresas.

---

## Si algo falla

| Error | Solución |
|-------|----------|
| `Billing account is not open` | Opción A paso 1 o secret `GCP_BILLING_ACCOUNT_ID` |
| `Storage has not been set up` | Opción A paso 2 o re-ejecutar setup workflow |
| `Permission denied` billing | Dar **Billing Account User** a la service account |
| Functions deploy timeout | Normal la 1ª vez; esperar 3–5 min y reintentar |

---

## Rutas Storage en el proyecto

```
organizations/{orgId}/invoices/{fileId}
organizations/{orgId}/attachments/{fileId}
```

Reglas: `firebase/storage.rules` (lectura/escritura autenticada, máx. 10 MB).

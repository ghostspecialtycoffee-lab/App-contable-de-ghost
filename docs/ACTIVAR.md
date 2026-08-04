# Activar Ghost ERP — deploy Firebase

## IMPORTANTE: qué secret usar

| Lo que tienes | Nombre del secret en GitHub |
|---------------|----------------------------|
| Archivo `.json` de Firebase (service account) | **`FIREBASE_SERVICE_ACCOUNT`** |
| Token de `firebase login:ci` (texto largo) | **`FIREBASE_TOKEN`** |

**No mezcles:** el JSON **NO** va en `FIREBASE_TOKEN`.

---

## Opción A — Service Account JSON (la que usaste)

### Paso 1 — Descargar clave (si aún no la tienes)

https://console.firebase.google.com/project/ghost-contable/settings/serviceaccounts/adminsdk

→ **Generar nueva clave privada**

### Paso 2 — Crear secret en GitHub

1. https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost/settings/secrets/actions
2. **New repository secret**
3. **Name:** `FIREBASE_SERVICE_ACCOUNT`
4. **Secret:** pega **todo** el contenido del `.json` (desde `{` hasta `}`)
5. **Add secret**

Si creaste `FIREBASE_TOKEN` con el JSON por error, **elimínalo** o déjalo vacío.

### Paso 3 — Ejecutar deploy

https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost/actions/workflows/deploy-firebase.yml

→ **Run workflow** → branch **main** → **Run workflow**

Espera 5–15 min (barra verde).

### Paso 4 — Abrir app

https://ghost-contable.web.app

---

## Opción B — Token CI (alternativa)

```powershell
npx firebase login:ci
```

Copia el token → secret **`FIREBASE_TOKEN`** (solo el token, no JSON).

---

## Permisos IAM (si falla Storage)

En Google Cloud IAM, al service account  
`firebase-adminsdk-fbsvc@ghost-contable.iam.gserviceaccount.com`  
agrega estos roles:

https://console.cloud.google.com/iam-admin/iam?project=ghost-contable

| Rol | Para qué |
|-----|----------|
| **Firebase Admin** | Deploy general |
| **Cloud Functions Admin** | Functions |
| **Service Usage Consumer** | Activar APIs |

La app web puede publicarse aunque Storage falle; el deploy lo intenta al final.

---

Si compartiste la clave privada en chat o capturas:

1. Firebase Console → Service accounts → **Generate new private key**
2. Actualiza el secret `FIREBASE_SERVICE_ACCOUNT` en GitHub
3. Elimina la clave antigua en Google Cloud IAM

---

## Errores comunes

| Error | Solución |
|-------|----------|
| Secret mal nombrado (JSON en TOKEN) | Usar `FIREBASE_SERVICE_ACCOUNT` |
| Sitio no encontrado | Deploy aún no terminó o falló — revisa Actions |
| Functions billing | Activar plan Blaze |
| Permission denied | Regenerar service account con rol Firebase Admin |

---

## Firebase Console

| Qué | Link |
|-----|------|
| Email/Password | https://console.firebase.google.com/project/ghost-contable/authentication/providers |
| Plan Blaze | https://console.firebase.google.com/project/ghost-contable/usage/details |
| Dominios Auth | https://console.firebase.google.com/project/ghost-contable/authentication/settings |

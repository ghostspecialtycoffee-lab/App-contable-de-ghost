# Activar Ghost ERP en 2 pasos (sin terminal)

Solo necesitas **2 clics en el navegador**. Yo (el agente) ya preparé el código y el deploy automático.

---

## Paso 1 — Descargar clave de Firebase

1. Abre este link (inicia sesión con tu Google si pide):

   **https://console.firebase.google.com/project/ghost-contable/settings/serviceaccounts/adminsdk**

2. Pulsa el botón **「Generar nueva clave privada」** / **「Generate new private key」**

3. Se descarga un archivo `.json` (guárdalo, lo usarás en el Paso 2)

---

## Paso 2 — Pegar la clave en GitHub

1. Abre este link:

   **https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost/settings/secrets/actions**

2. Pulsa **「New repository secret」**

3. Completa:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Secret:** abre el archivo `.json` descargado, **copia TODO el contenido** y pégalo aquí

4. Pulsa **「Add secret」**

---

## Paso 3 — Lanzar el deploy (automático)

1. Abre:

   **https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost/actions/workflows/deploy-firebase.yml**

2. Pulsa **「Run workflow」** → **「Run workflow」**

3. Espera **5–15 minutos** (barra verde = listo)

---

## Paso 4 — Abrir la app

Cuando termine el deploy, abre:

| Nombre | Link |
|--------|------|
| **App Ghost ERP** | https://ghost-contable.web.app |
| **Registro** | https://ghost-contable.web.app/register |
| **Login** | https://ghost-contable.web.app/login |

---

## Si prefieres usar tu PC con terminal

```powershell
cd App-contable-de-ghost
git pull
git checkout cursor/mobile-web-firebase-setup-1740
.\scripts\deploy-windows.ps1
```

---

## Verificar Firebase Console (solo una vez)

| Qué | Link | Debe estar |
|-----|------|------------|
| Email/Password | https://console.firebase.google.com/project/ghost-contable/authentication/providers | **Enabled** |
| Plan Blaze | https://console.firebase.google.com/project/ghost-contable/usage/details | Activo |
| Dominios Auth | https://console.firebase.google.com/project/ghost-contable/authentication/settings | `localhost`, `ghost-contable.web.app` |

---

## Flujo de prueba

Registro → Onboarding → Inventario → Ítems → Bodega → Movimiento

# Deploy paso a paso — Ghost ERP (`ghost-contable`)

Guía para publicar la app en **https://ghost-contable.web.app** y probarla en PC y celular.

> **“Sitio no encontrado”** en `ghost-contable.web.app` = aún no se ha hecho el primer deploy de Hosting. Sigue esta guía.

---

## Requisitos (una sola vez)

| Requisito | Comando de verificación |
|-----------|-------------------------|
| Node.js 20+ | `node -v` |
| pnpm | `pnpm -v` (si falta: `npm install -g pnpm`) |
| Git | `git --version` |
| Cuenta Google del proyecto Firebase | — |
| Plan **Blaze** en Firebase | Console → ⚙️ → Usage and billing |

---

## Parte A — Preparar el proyecto (PC)

### Paso 1 — Clonar repo y rama

```bash
git clone https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost.git
cd App-contable-de-ghost
git checkout cursor/mobile-web-firebase-setup-1740
```

### Paso 2 — Crear credenciales locales

Crea el archivo **`apps/web/.env.local`** (no se sube a Git):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCftahIeLSWuCZUfwZPFLK5wD2xzSwNvGI
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ghost-contable.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ghost-contable
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ghost-contable.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=488938935406
NEXT_PUBLIC_FIREBASE_APP_ID=1:488938935406:web:219f55904876cf2c59427f
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

### Paso 3 — Instalar dependencias

```bash
pnpm install
```

### Paso 4 — Verificar que compila y pasa tests

```bash
pnpm test
pnpm build
```

Debe terminar sin errores (10 tests, 12 rutas).

### Paso 5 — Probar en PC (opcional, antes del deploy)

```bash
pnpm dev
```

Abre **http://localhost:3000** en Chrome.

---

## Parte B — Firebase Console (verificar antes del deploy)

Abre: https://console.firebase.google.com/project/ghost-contable

| # | Servicio | Acción |
|---|----------|--------|
| 1 | **Authentication** | Sign-in method → **Email/Password** = Enabled |
| 2 | **Firestore** | Base de datos creada (modo producción) |
| 3 | **Storage** | Iniciado |
| 4 | **Authentication → Settings → Authorized domains** | Debe incluir: `localhost`, `ghost-contable.web.app`, `ghost-contable.firebaseapp.com` |
| 5 | **Plan Blaze** | Activo (necesario para Cloud Functions) |

---

## Parte C — Deploy desde tu PC

Ejecuta **desde la raíz del repo** (`App-contable-de-ghost/`).

### Paso 6 — Iniciar sesión en Firebase CLI

```bash
npx firebase login
```

Se abre el navegador → elige la cuenta Google del proyecto → Allow.

Verifica:

```bash
npx firebase projects:list
```

Debe aparecer **`ghost-contable`**.

### Paso 7 — Seleccionar proyecto

```bash
npx firebase use ghost-contable
```

### Paso 8 — Desplegar backend (reglas + functions)

```bash
pnpm firebase:deploy:backend
```

Primera vez: **5–15 minutos**. Al final: `Deploy complete!`

Functions desplegadas:

- `onAuthUserCreate`
- `createOrganization`
- `createInventoryItem`
- `createWarehouse`
- `registerInventoryMovement`

### Paso 9 — Desplegar app web (Hosting)

```bash
pnpm firebase:deploy:hosting
```

Al final verás:

```
Hosting URL: https://ghost-contable.web.app
```

### Paso 10 — Probar producción

Abre en PC o celular:

- https://ghost-contable.web.app
- https://ghost-contable.firebaseapp.com

Ya **no** debe aparecer “Sitio no encontrado”.

---

## Parte D — Flujo de prueba funcional

1. **Registro** → email + contraseña  
2. **Onboarding** → nombre del negocio  
3. **Inventario → Ítems** → crear SKU  
4. **Bodegas** → crear bodega  
5. **Movimientos** → registrar entrada  

---

## Script automático (Windows / Mac / Linux)

Después de crear `apps/web/.env.local`:

**Windows (PowerShell):**

```powershell
.\scripts\deploy-windows.ps1
```

**Mac / Linux:**

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Solo preparar (install + test + build):**

```bash
pnpm run deploy:setup
```

Luego, si prefieres manual:

```bash
npx firebase login
pnpm firebase:deploy:backend
pnpm firebase:deploy:hosting
```

---

## Errores frecuentes

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Sitio no encontrado | Sin deploy de hosting | Paso 9 |
| `HTTP Error: 401` en firebase | No logueado | Paso 6 |
| Functions failed / billing | Plan Spark | Activar Blaze |
| Login falla en localhost | Dominio no autorizado | Agregar `localhost` en Auth |
| Registro/onboarding falla | Functions no desplegadas | Paso 8 |
| Build falla | Falta `.env.local` | Paso 2 |

---

## Comandos rápidos

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | App local http://localhost:3000 |
| `pnpm firebase:deploy` | Despliega **todo** |
| `pnpm firebase:deploy:backend` | Solo rules + storage + functions |
| `pnpm firebase:deploy:hosting` | Solo app web |

---

Ver también: [ACCESO.md](ACCESO.md), [FIREBASE_SETUP.md](../FIREBASE_SETUP.md)

---

## Ejecución automática (agente cloud — 4 ago 2026)

| Paso | Comando | Resultado |
|------|---------|-----------|
| 1 | `pnpm run deploy:setup` | ✅ install + 10 tests + build 12 rutas |
| 2 | `npx firebase projects:list` | ❌ Requiere `firebase login` en tu PC |
| 3 | `firebase deploy --only hosting` | ❌ Solo tú puedes autenticarte con tu cuenta Google |

**Conclusión:** el código está listo. El deploy a `ghost-contable.web.app` debes ejecutarlo en tu PC con `.\scripts\deploy-windows.ps1`.

# Acceso Ghost ERP — PC y celular

Proyecto Firebase: **`ghost-contable`**

La misma app funciona en **PC (Chrome, Edge, Firefox)** y **celular** (PWA). En PC usas el navegador a pantalla completa; en celular puedes agregar a inicio.

---

Última ejecución: **4 ago 2026**

| Prueba | Resultado |
|--------|-----------|
| `pnpm test` | ✅ 10/10 tests |
| `pnpm build` | ✅ 12 rutas compiladas |
| `pnpm typecheck` | ✅ sin errores |
| Servidor dev | ✅ http://localhost:3000 (HTTP 200) |

---

## Acceso en tu PC (desarrollo local)

### 1. Clonar y entrar al repo

```bash
git clone https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost.git
cd App-contable-de-ghost
git checkout cursor/mobile-web-firebase-setup-1740
```

### 2. Crear `apps/web/.env.local`

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCftahIeLSWuCZUfwZPFLK5wD2xzSwNvGI
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ghost-contable.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ghost-contable
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ghost-contable.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=488938935406
NEXT_PUBLIC_FIREBASE_APP_ID=1:488938935406:web:219f55904876cf2c59427f
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

### 3. Instalar y arrancar

```bash
pnpm install
pnpm dev
```

### 4. Abrir en el navegador del PC

| Página | URL |
|--------|-----|
| Inicio | http://localhost:3000 |
| Registro | http://localhost:3000/register |
| Login | http://localhost:3000/login |
| Dashboard | http://localhost:3000/dashboard |
| Inventario | http://localhost:3000/inventory |

---

## Acceso en PC y celular (producción)

Requiere deploy una sola vez:

```bash
npx firebase login
pnpm build
pnpm firebase:deploy
```

Luego usa en **cualquier dispositivo**:

| URL |
|-----|
| https://ghost-contable.web.app |
| https://ghost-contable.firebaseapp.com |

Agrega a pantalla de inicio en celular (PWA).

---

## Flujo de prueba completo

1. **Registro** → email + contraseña  
2. **Onboarding** → nombre del negocio  
3. **Inventario → Ítems** → crear SKU  
4. **Bodegas** → crear bodega  
5. **Movimientos** → registrar entrada  

---

## Si login falla en PC

Firebase Console → Authentication → Settings → Authorized domains → debe incluir **`localhost`**.

## Si registro/onboarding falla

Falta deploy de Functions:

```bash
pnpm firebase:deploy:backend
```

(Requiere plan Blaze activo.)

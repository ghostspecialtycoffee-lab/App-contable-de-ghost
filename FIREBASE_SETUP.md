# Ghost ERP — Configuración Firebase (Google Cloud)

## Importante: NO uses Code.gs (Google Apps Script)

Ghost ERP **no usa Google Apps Script** (`Code.gs`). La base de datos y backend es **Firebase** (Google Cloud):

| Servicio Google | Uso en Ghost ERP |
|-----------------|------------------|
| **Firebase Auth** | Login / registro |
| **Cloud Firestore** | Base de datos |
| **Cloud Storage** | Archivos (facturas, adjuntos) |
| **Cloud Functions** | Lógica servidor (equivalente a tu backend) |
| **Firebase Hosting** | App web en producción (ideal para probar en celular) |

Si buscabas pegar código en `Code.gs`, ese enfoque **no aplica** a este proyecto. Toda la lógica servidor está en `apps/functions/` y se despliega con Firebase CLI.

---

## Paso 1 — Crear proyecto Firebase

1. Entra a [Firebase Console](https://console.firebase.google.com/)
2. **Agregar proyecto** → nombre ej: `ghost-erp-prod`
3. Desactiva Google Analytics si quieres simplificar (opcional)
4. Copia el **Project ID** (ej: `ghost-erp-prod`)

---

## Paso 2 — Activar servicios

En el proyecto Firebase:

| Servicio | Dónde activarlo |
|----------|-----------------|
| Authentication | Build → Authentication → Sign-in method → **Email/Password** → Enable |
| Firestore | Build → Firestore Database → **Create database** → Production mode → región `us-central1` (o `southamerica-east1` si prefieres São Paulo) |
| Storage | Build → Storage → Get started |
| Functions | Build → Functions (se activa al primer deploy) |

---

## Paso 3 — Registrar app web y obtener credenciales

1. Project Overview → **Add app** → **Web** (`</>`)
2. Nickname: `Ghost ERP Web`
3. Firebase te muestra un bloque `firebaseConfig`. Copia estos valores:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "TU-PROJECT-ID.firebaseapp.com",
  projectId: "TU-PROJECT-ID",
  storageBucket: "TU-PROJECT-ID.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

## Paso 4 — Archivo `.env.local` (lo que debes pegar)

Crea el archivo **`apps/web/.env.local`** con estos valores (reemplaza con los tuyos):

```env
# === CREDENCIALES FIREBASE (desde Firebase Console) ===
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456

# === DESARROLLO LOCAL ===
# false = usa Firebase real en la nube (recomendado para celular)
# true = usa emuladores en tu PC (solo si corres firebase emulators:start)
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

> **No hay nada que pegar en Code.gs.** Solo este archivo `.env.local` en la app web.

---

## Paso 5 — Dominios autorizados (celular y producción)

Firebase Console → **Authentication** → **Settings** → **Authorized domains**

Agrega:

| Dominio | Para qué |
|---------|----------|
| `localhost` | Dev en PC |
| `tu-project-id.web.app` | Hosting Firebase (celular en producción) |
| `tu-project-id.firebaseapp.com` | Hosting alternativo |

Para probar en celular vía LAN (`http://192.168.x.x:3000`), Firebase Auth **no permite IPs** fácilmente. **Recomendado:** desplegar en Firebase Hosting (Paso 7).

---

## Paso 6 — Desplegar reglas, índices y Functions

En la raíz del repo (requiere [Firebase CLI](https://firebase.google.com/docs/cli)):

```bash
npm install -g firebase-tools
firebase login
firebase use --add    # selecciona tu project-id
```

Desplegar todo:

```bash
pnpm install
pnpm build
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

### Cloud Functions incluidas (tu “backend”)

Estas reemplazan cualquier script que hubieras puesto en `Code.gs`:

| Function | Tipo | Qué hace |
|----------|------|----------|
| `onAuthUserCreate` | Trigger Auth | Crea perfil en `users/{uid}` al registrarse |
| `createOrganization` | Callable | Onboarding: org + sucursal + owner |
| `createInventoryItem` | Callable | Alta de ítem inventario |
| `createWarehouse` | Callable | Alta de bodega |
| `registerInventoryMovement` | Callable | Entrada/salida + kardex + costo |
| `onAuditLogCreate` | Trigger Firestore | Log de auditoría |

**Región Functions:** `us-central1` (configurada en cliente web).

---

## Paso 7 — Desplegar app web (probar en celular)

```bash
firebase deploy --only hosting
```

URL resultante: `https://TU-PROJECT-ID.web.app`

En el celular:
1. Abre esa URL en Chrome/Safari
2. **Agregar a pantalla de inicio** (comportamiento PWA)
3. Registro → Onboarding → Dashboard → Inventario

---

## Paso 8 — Probar en celular (desarrollo local)

Opción A — **Hosting (recomendado):** Paso 7.

Opción B — **Misma red WiFi:**

```bash
pnpm dev    # escucha en 0.0.0.0:3000
```

En el PC: `hostname -I` → IP ej. `192.168.1.50`  
En el celular: `http://192.168.1.50:3000`

Limitación: Auth puede fallar sin dominio autorizado. Usa Hosting para pruebas reales.

Opción C — **Emuladores (solo PC):**

```bash
firebase emulators:start
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true pnpm dev
```

---

## Paso 9 — Archivo `.firebaserc`

En la raíz del repo:

```json
{
  "projects": {
    "default": "tu-project-id"
  }
}
```

---

## Checklist rápido

- [ ] Proyecto Firebase creado
- [ ] Email/Password activo en Auth
- [ ] Firestore + Storage creados
- [ ] `apps/web/.env.local` con 6 variables `NEXT_PUBLIC_FIREBASE_*`
- [ ] `firebase deploy` rules + functions
- [ ] `firebase deploy --only hosting`
- [ ] Probar registro desde celular en `*.web.app`

---

## ¿Dónde va cada cosa?

| Qué quieres configurar | Dónde va |
|------------------------|----------|
| API keys Firebase | `apps/web/.env.local` |
| Reglas base de datos | `firebase/firestore.rules` |
| Índices Firestore | `firebase/firestore.indexes.json` |
| Lógica servidor | `apps/functions/src/` |
| UI web | `apps/web/src/` |
| ~~Code.gs~~ | **No se usa** |

## Soporte

Ver también: [DATABASE.md](DATABASE.md), [SECURITY.md](SECURITY.md), [docs/AUTH.md](docs/AUTH.md)

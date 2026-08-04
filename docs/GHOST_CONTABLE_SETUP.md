# Ghost Contable — Configuración proyecto `ghost-contable`

Proyecto Firebase interno Ghost Specialty Coffee Lab.

## Credenciales

Configuradas en **`apps/web/.env.local`** (gitignored — no se sube al repo).

Variables requeridas:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=<tu apiKey>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ghost-contable.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ghost-contable
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ghost-contable.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=488938935406
NEXT_PUBLIC_FIREBASE_APP_ID=1:488938935406:web:219f55904876cf2c59427f
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

Archivo **`.firebaserc`**: `"default": "ghost-contable"`

## Checklist Firebase Console

Antes del deploy, verifica en [console.firebase.google.com/project/ghost-contable](https://console.firebase.google.com/project/ghost-contable):

- [ ] **Authentication** → Sign-in method → **Email/Password** = Enabled
- [ ] **Firestore Database** → creada (modo producción)
- [ ] **Storage** → iniciado
- [ ] **Authentication** → Settings → Authorized domains:
  - `localhost`
  - `ghost-contable.web.app`
  - `ghost-contable.firebaseapp.com`

### Plan Blaze

Cloud Functions requiere plan **Blaze** (pay-as-you-go). Spark no despliega Functions.

## Deploy desde tu PC

```bash
pnpm install && pnpm build
npx firebase login
pnpm firebase:deploy
```

Scripts disponibles:

| Comando | Qué despliega |
|---------|----------------|
| `pnpm firebase:deploy` | Todo |
| `pnpm firebase:deploy:backend` | Rules + índices + storage + functions |
| `pnpm firebase:deploy:hosting` | App web |

## Probar

| Dónde | URL |
|-------|-----|
| PC | http://localhost:3000 → `pnpm dev` |
| Celular | https://ghost-contable.web.app |

Flujo: **Registro → Onboarding → Ítems → Bodega → Movimiento**

## Seguridad API Key

Restringe la key en [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials?project=ghost-contable):

HTTP referrers: `ghost-contable.web.app/*`, `ghost-contable.firebaseapp.com/*`, `localhost:3000/*`

## measurementId

`G-9V86YT77PV` (Analytics) — opcional; la app no lo usa aún.

# Autenticación y multi-tenant

> Esquema completo: [DATABASE.md](../DATABASE.md) · Seguridad: [SECURITY.md](../SECURITY.md)

## Flujo

1. **Registro** (`/register`) — Firebase Auth crea la cuenta.
2. **Perfil** — Cloud Function `onAuthUserCreate` crea el documento en `users/{uid}`.
3. **Onboarding** (`/onboarding`) — Callable `createOrganization` crea:
   - `organizations/{orgId}`
   - `organizations/{orgId}/branches/{branchId}` (sucursal principal)
   - `organizations/{orgId}/members/{uid}` (rol `owner`)
   - Actualiza `users/{uid}.memberships`
4. **Dashboard** (`/dashboard`) — Requiere sesión activa y membresía.

## Rutas protegidas

Las rutas bajo `(protected)/` usan `AuthGuard`:

- Sin sesión → redirige a `/login?next=...`
- Con sesión sin organización → redirige a `/onboarding`
- Con organización en `/onboarding` → redirige a `/dashboard`

## Seguridad Firestore

Todas las escrituras sensibles ocurren en **Cloud Functions** (Admin SDK). Las reglas del cliente son solo lectura.

## Desarrollo local

```bash
# Terminal 1 — emuladores
firebase emulators:start

# Terminal 2 — app
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true pnpm dev
```

Variables en `apps/web/.env.local`:

- `NEXT_PUBLIC_FIREBASE_*` — credenciales del proyecto
- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` — conectar a emuladores locales

## Decisiones

| Decisión | Motivo |
|----------|--------|
| Callable `createOrganization` | Transacción atómica, validación servidor, menor costo que múltiples writes cliente |
| Subcolección `members` | Reglas Firestore eficientes sin escanear arrays |
| Membresías denormalizadas en `users` | Una lectura para resolver tenant activo en el cliente |

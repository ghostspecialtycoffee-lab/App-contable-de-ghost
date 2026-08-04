# Ghost ERP — Firebase

Patrones fijos. Consultar DATABASE.md para esquema.

## Stack

Auth · Firestore · Storage · Functions v2 (callables) + v1 (auth triggers)

## Reglas Firestore

**Patrón único:**

```javascript
function isOrgMember(orgId) {
  return isSignedIn()
    && exists(.../organizations/$(orgId)/members/$(request.auth.uid));
}
allow read: if isOrgMember(orgId);
allow write: if false;
```

Nunca `allow create/update` en cliente para datos de negocio.

## Callable template

```typescript
export const myAction = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "...");
  const orgId = await getActiveOrganizationId(request.auth.uid);
  await assertOrgPermission(orgId, request.auth.uid, { module: "X", action: "create" });
  // validate → transaction → writeAuditLog → return
});
```

## Auth trigger

Usar `firebase-functions/v1` → `auth.user().onCreate` (no `onUserCreated` v2 identity).

## Cliente web

- Config: `apps/web/src/lib/firebase/client.ts`
- Callables: `apps/web/src/lib/firebase/functions.ts`
- Emuladores: `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`
  - Auth :9099, Firestore :8080, Functions :5001

## Índices

Agregar a `firebase/firestore.indexes.json` **antes** de deploy. Toda query compuesta necesita índice.

## Costos

1. Desnormalizar lecturas frecuentes (balances inventario)
2. Transacciones > múltiples round-trips cliente
3. Un listener por pantalla — cleanup en useEffect
4. Paginar > 50 documentos

## Deploy local test

```bash
firebase emulators:start
pnpm --filter @ghost/functions build
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true pnpm dev
```

## Referencias

- DATABASE.md, SECURITY.md
- firebase/firestore.rules
- packages/infrastructure/src/paths.ts

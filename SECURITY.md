# Seguridad — Ghost ERP

## Modelo de amenazas

| Amenaza | Mitigación |
|---------|------------|
| Escritura no autorizada Firestore | Rules: `allow write: if false` en cliente |
| Elevación de privilegios | `assertOrgPermission()` en cada Function |
| Acceso cross-tenant | Datos bajo `organizations/{orgId}`, member check |
| Validación solo cliente | Validación duplicada en dominio + Functions |
| Datos sensibles en logs | No loguear passwords, tokens, PII completa |

## Autenticación

- Firebase Auth (email/password — extensible a OAuth)
- Perfil en `users/{uid}` creado por trigger `onAuthUserCreate`
- Sesión gestionada por `AuthProvider` + `onAuthStateChanged`
- Rutas protegidas: `AuthGuard` en `(protected)/layout.tsx`

## Autorización

Matriz de roles: `packages/domain/src/roles.ts`

```
hasPermission(roles, { module, action }) → boolean
```

Functions **siempre** consultan `organizations/{orgId}/members/{uid}` — nunca confiar en `memberships[]` del cliente para autorizar.

## Firestore Rules

Patrón estándar:

```javascript
function isOrgMember(orgId) {
  return isSignedIn()
    && exists(.../organizations/$(orgId)/members/$(request.auth.uid));
}
// allow read: if isOrgMember(orgId);
// allow write: if false;
```

Excepciones: ninguna escritura cliente en producción.

## Auditoría

Toda mutación crítica → `writeAuditLog()`:

- create/update/delete organización, ítems, movimientos, etc.
- Campos: actorUserId, entityType, entityId, summary, occurredAt

## Storage

- Máximo 10 MB por upload
- Path bajo `organizations/{orgId}/`
- Solo usuarios autenticados (refinar por member en v2)

## Secretos

- `.env.local` nunca en git (`.gitignore`)
- Service account solo en Functions runtime / CI
- `NEXT_PUBLIC_*` solo valores públicos Firebase

## Checklist pre-PR (seguridad)

- [ ] Sin writes cliente en rules nuevas
- [ ] Callable verifica auth + permission
- [ ] Input validado (tipos, rangos, SQL injection N/A)
- [ ] Errores sin filtrar stack al cliente
- [ ] Audit log en mutaciones
- [ ] Índices no exponen datos extra

## Incidentes

1. Revocar token usuario afectado (Firebase Console)
2. Revisar auditLogs del periodo
3. Patch rules/functions
4. Entrada en CHANGELOG con `[SECURITY]`

## Referencias

- [DATABASE.md](DATABASE.md)
- [docs/AUTH.md](docs/AUTH.md)
- Skill: `.cursor/skills/ghost-erp-security/SKILL.md`

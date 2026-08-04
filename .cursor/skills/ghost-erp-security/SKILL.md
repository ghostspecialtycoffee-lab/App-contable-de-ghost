# Ghost ERP — Seguridad Pre-PR

Checklist rápido. Ejecutar **antes de commit** en todo PR con lógica de negocio.

## AuthN / AuthZ

- [ ] Callable verifica `request.auth?.uid`
- [ ] Permiso vía `assertOrgPermission` (no roles del body)
- [ ] Branch access validado contra `member.branchIds`

## Firestore

- [ ] Sin `allow write: true` cliente en colecciones negocio
- [ ] Datos bajo `organizations/{orgId}`
- [ ] Member check usa subcolección `members/{uid}`

## Input

- [ ] Validación dominio antes de persistir
- [ ] Cantidades numéricas finitas, rangos sensatos
- [ ] Strings trim + length limits
- [ ] SKU/slug normalizados server-side

## Datos sensibles

- [ ] No secrets en código ni NEXT_PUBLIC_*
- [ ] No loguear passwords/tokens
- [ ] `.env*` en gitignore

## Auditoría

- [ ] `writeAuditLog` en create/update/delete
- [ ] Movimientos inventario append-only

## Errores

- [ ] `HttpsError` con código correcto
- [ ] Mensajes usuario en español, sin stack traces

## Tests mínimos

- [ ] Validaciones dominio testeadas
- [ ] `pnpm test` verde

## Si falla algún item

Corregir antes de push. No crear PR.

## Referencias

- SECURITY.md (detalle completo)
- firebase/firestore.rules

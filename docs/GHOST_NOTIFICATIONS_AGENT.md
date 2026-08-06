# Notificaciones y agente Ghost

## Correos (Resend)

Configura en Firebase Functions (Secret Manager o variables de entorno):

- `RESEND_API_KEY` — API key de [Resend](https://resend.com)
- `GHOST_NOTIFICATION_FROM_EMAIL` — remitente verificado (ej. `Ghost <alertas@tudominio.com>`)

Sin `RESEND_API_KEY`, las notificaciones se encolan en Firestore y quedan registradas en logs (modo desarrollo).

## Búsqueda web del agente

- `TAVILY_API_KEY` (opcional) — búsqueda web ampliada
- Sin Tavily: DuckDuckGo Instant Answer API (limitada)

## Eventos con correo automático

| Evento | Disparador |
|--------|------------|
| Apertura de caja | Firestore `cashSessions` → `open` |
| Cierre de caja | `cashSessions` → `closed` |
| Horario apertura/cierre | Scheduler cada 30 min |
| Cambio de turno | `workShifts` create/update |
| Insumo bajo mínimo | `inventoryBalances` cruza `minStock` |
| Sin movimiento | Scheduler + `staleInventoryDays` |

## Preferencias

`/settings/notifications` — correo y eventos por usuario.

## Horarios y turnos

`/settings/operations` — horarios semanales, recordatorios y turnos del equipo.

## Agente evolutivo

- Chat `/chat` → **Pregunta libre (búsqueda web)**
- Conocimiento guardado en `organizations/{orgId}/agentKnowledge`
- Callable Cloud Function: `ghostAgent`

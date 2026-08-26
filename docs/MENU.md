# Menú digital

Vista pública para que los clientes exploren la carta (sin pedir desde el QR de menú).

## Rutas

| Rol | Ruta |
|-----|------|
| Admin | `/digital-menu` |
| Cliente | `/menu?s={slug}` (recomendado) o `/menu?o={organizationId}` |
| Muestra editorial | `/menu` |

La ruta sin parámetros presenta una carta de muestra de Ghost Specialty Coffee con cafés,
acompañantes, bebidas summer, desayunos y almuerzos. Sirve como referencia visual y no consulta
datos de una organización. Los enlaces con `s` u `o` conservan el catálogo público dinámico.

## Flujo admin

1. Crear productos con nombre, descripción, precio y foto
2. Asignar categoría y tipo de bebida (opcional)
3. **Activar** los que deben verse en el menú público
4. Configurar título, subtítulo y estilo → **Publicar cambios**
5. Imprimir o compartir el QR

La primera visita a `/digital-menu` publica la configuración por defecto si aún no existe `publicDigitalMenu/config`.

## Datos Firestore

| Colección / doc | Lectura | Contenido |
|-----------------|---------|-----------|
| `menuProducts` | Pública si `status == active` | Productos del menú |
| `publicDigitalMenu/config` | Pública | Branding, textos, slug |
| `organizationSlugs/{slug}` | Pública | Resolución slug → orgId |
| `digitalMenuSettings` (en org) | Solo staff | Borrador de apariencia |

## Fotos

Las imágenes se guardan como `imageDataUrl` en el documento del producto (máx. ~500 KB, comprimidas en cliente).

## Relacionado

- Catálogo operativo y recetas: `/pos/menu`
- Logo: `/brand` (se sincroniza al menú público al marcar primario)
- Pedidos en mesa: `/mesa?o=...&t=...` (flujo distinto al menú solo visual)

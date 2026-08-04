# Activar Ghost ERP — solución al error de deploy

El error **「credentials_json must specify exactly one...」** significa que **falta el secret en GitHub**.

Elige **UNA** de estas dos opciones (la A es más fácil):

---

## Opción A — Token Firebase (recomendada, más fácil)

### Paso 1 — Obtener token en tu PC

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
cd App-contable-de-ghost
npx firebase login:ci
```

- Se abre Chrome → elige tu cuenta Google del proyecto **ghost-contable**
- La terminal muestra un **token largo** (empieza con algo como `1//0e...`)
- **Copia todo el token**

### Paso 2 — Pegar token en GitHub

1. Abre: **https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost/settings/secrets/actions**
2. **New repository secret**
3. **Name:** `FIREBASE_TOKEN`
4. **Secret:** pega el token copiado
5. **Add secret**

### Paso 3 — Ejecutar deploy

1. Abre: **https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost/actions/workflows/deploy-firebase.yml**
2. **Run workflow** → **Run workflow**
3. Espera barra verde (5–15 min)

### Paso 4 — Abrir app

https://ghost-contable.web.app

---

## Opción B — Service Account JSON

### Paso 1 — Descargar clave

1. Abre: **https://console.firebase.google.com/project/ghost-contable/settings/serviceaccounts/adminsdk**
2. **Generar nueva clave privada** → descarga `.json`

### Paso 2 — Pegar en GitHub

1. Abre: **https://github.com/ghostspecialtycoffee-lab/App-contable-de-ghost/settings/secrets/actions**
2. **New repository secret**
3. **Name:** `FIREBASE_SERVICE_ACCOUNT` (exacto, mayúsculas incluidas)
4. **Secret:** abre el `.json`, selecciona **TODO** (Ctrl+A) y pega
5. **Add secret**

### Paso 3 — Ejecutar deploy

Igual que Opción A, paso 3.

---

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `credentials_json must specify...` | No hay secret en GitHub | Opción A o B arriba |
| Secret faltante | Nombre mal escrito | Debe ser `FIREBASE_TOKEN` o `FIREBASE_SERVICE_ACCOUNT` |
| Functions billing | Plan Spark | Activar **Blaze**: https://console.firebase.google.com/project/ghost-contable/usage/details |
| Auth login falla | Dominio no autorizado | Agregar `ghost-contable.web.app` en Auth settings |

---

## Verificar Firebase Console

| Qué | Link |
|-----|------|
| Email/Password activo | https://console.firebase.google.com/project/ghost-contable/authentication/providers |
| Plan Blaze | https://console.firebase.google.com/project/ghost-contable/usage/details |
| Dominios Auth | https://console.firebase.google.com/project/ghost-contable/authentication/settings |

---

## Flujo de prueba

Registro → Onboarding → Inventario → Ítems → Bodega → Movimiento

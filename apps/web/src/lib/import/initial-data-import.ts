/** Repositorio y workflow de carga inicial (facturas → bodega + catálogo). */
export const GITHUB_REPO = "ghostspecialtycoffee-lab/App-contable-de-ghost";

export const INITIAL_DATA_WORKFLOW_FILE = "import-initial-data.yml";

export function getInitialDataWorkflowUrl(): string {
  return `https://github.com/${GITHUB_REPO}/actions/workflows/${INITIAL_DATA_WORKFLOW_FILE}`;
}

export function getInitialDataWorkflowActionsUrl(): string {
  return `https://github.com/${GITHUB_REPO}/actions?query=workflow%3AImport+initial+data`;
}

export const INITIAL_DATA_IMPORT_STEPS = [
  "En GitHub, abre el repositorio y confirma FIREBASE_SERVICE_ACCOUNT en Secrets.",
  "Cada deploy a main importa compras si la base está vacía y carga la carta Ghost (25 bebidas).",
  "Opción rápida en Compras: botón «Cargar facturas ahora» + carta automática.",
  "Recarga la app: Compras, Inventario, Catálogo, Costeo y Caja listos para operar.",
] as const;

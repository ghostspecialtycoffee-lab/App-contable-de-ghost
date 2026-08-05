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
  "En GitHub, abre el repositorio y ve a Settings → Secrets → Actions.",
  "Confirma que existe el secret FIREBASE_SERVICE_ACCOUNT (JSON del service account de Firebase Admin).",
  "Ve a Actions → Import initial data → Run workflow.",
  "Deja reset_first y bootstrap en true y ejecuta.",
  "Recarga la app: verás facturas en Compras, insumos en Inventario y productos en Catálogo.",
] as const;

/** Repositorio y workflow de carga inicial (facturas + carta Ghost). */
export const GITHUB_REPO = "ghostspecialtycoffee-lab/App-contable-de-ghost";

export const INITIAL_DATA_WORKFLOW_FILE = "import-initial-data.yml";

export function getInitialDataWorkflowUrl(): string {
  return `https://github.com/${GITHUB_REPO}/actions/workflows/${INITIAL_DATA_WORKFLOW_FILE}`;
}

export function getInitialDataWorkflowActionsUrl(): string {
  return `https://github.com/${GITHUB_REPO}/actions?query=workflow%3AImport+initial+data`;
}

export const INITIAL_DATA_IMPORT_STEPS = [
  "Inventario → Insumos: crea cada producto con unidad de compra y g/ml por presentación.",
  "Opcional: importa facturas (Compras) vinculando cada línea a un insumo existente.",
  "Costeo: carga la carta Ghost cuando tengas café y leche en bodega.",
  "Recarga la app: compras, bodega, catálogo y fichas listos para operar.",
] as const;

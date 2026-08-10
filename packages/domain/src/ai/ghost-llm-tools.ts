/**
 * Herramientas (function calling) para el agente Ghost con LLM.
 * Mapean intenciones libres a acciones ejecutables en el cliente.
 */

export type GhostLlmToolName =
  | "update_product_price"
  | "register_sale"
  | "checkout_table"
  | "open_cash_register"
  | "add_table_order"
  | "open_table";

export interface GhostAgentPlannedAction {
  tool: GhostLlmToolName;
  args: Record<string, unknown>;
  rationale?: string;
}

export interface GhostLlmFunctionDeclaration {
  name: GhostLlmToolName;
  description: string;
  parameters: {
    type: "OBJECT";
    properties: Record<
      string,
      { type: "STRING" | "NUMBER" | "INTEGER"; description: string }
    >;
    required: string[];
  };
}

export const GHOST_LLM_FUNCTION_DECLARATIONS: GhostLlmFunctionDeclaration[] = [
  {
    name: "update_product_price",
    description:
      "Actualiza el precio de venta de un producto del menú. Usar cuando pidan subir, bajar o ajustar precios.",
    parameters: {
      type: "OBJECT",
      properties: {
        productName: { type: "STRING", description: "Nombre del producto en la carta" },
        price: { type: "NUMBER", description: "Nuevo precio en COP (entero)" },
        rationale: { type: "STRING", description: "Breve motivo del cambio" },
      },
      required: ["productName", "price"],
    },
  },
  {
    name: "register_sale",
    description: "Registra una venta en mostrador (no mesa).",
    parameters: {
      type: "OBJECT",
      properties: {
        productName: { type: "STRING", description: "Producto vendido" },
        quantity: { type: "INTEGER", description: "Cantidad (default 1)" },
        paymentMethod: {
          type: "STRING",
          description: "cash, card, transfer u other",
        },
      },
      required: ["productName"],
    },
  },
  {
    name: "checkout_table",
    description: "Cobra y cierra la cuenta de una mesa.",
    parameters: {
      type: "OBJECT",
      properties: {
        tableNumber: { type: "INTEGER", description: "Número de mesa" },
        paymentMethod: { type: "STRING", description: "cash, card, transfer u other" },
        documentType: {
          type: "STRING",
          description: "factura o cuenta_cobro (default factura)",
        },
      },
      required: ["tableNumber"],
    },
  },
  {
    name: "open_cash_register",
    description: "Abre la caja del día con fondo inicial.",
    parameters: {
      type: "OBJECT",
      properties: {
        openingAmount: { type: "NUMBER", description: "Fondo inicial en COP" },
      },
      required: ["openingAmount"],
    },
  },
  {
    name: "add_table_order",
    description: "Anota un pedido en una mesa abierta y envía comanda.",
    parameters: {
      type: "OBJECT",
      properties: {
        tableNumber: { type: "INTEGER", description: "Número de mesa" },
        productName: { type: "STRING", description: "Producto pedido" },
        quantity: { type: "INTEGER", description: "Cantidad (default 1)" },
      },
      required: ["tableNumber", "productName"],
    },
  },
  {
    name: "open_table",
    description: "Abre una mesa para tomar pedidos.",
    parameters: {
      type: "OBJECT",
      properties: {
        tableNumber: { type: "INTEGER", description: "Número de mesa" },
      },
      required: ["tableNumber"],
    },
  },
];

const KNOWN_TOOLS = new Set<string>(GHOST_LLM_FUNCTION_DECLARATIONS.map((tool) => tool.name));

export function buildGhostLlmSystemInstruction(contextSummary: string): string {
  return [
    "Eres Ghost, asistente operativo de una cafetería en Ghost ERP.",
    "Respondes en español, directo y útil, como un compañero de turno.",
    "Tienes acceso al contexto operativo actual y herramientas para ejecutar acciones.",
    "Cuando el usuario pida análisis (márgenes, ventas, inventario), responde con texto usando el contexto.",
    "Cuando pida ejecutar algo (vender, cobrar, subir precio, abrir caja), llama la herramienta correcta.",
    "Puedes llamar varias herramientas en secuencia si la orden lo requiere (ej. analizar y luego subir precio).",
    "No inventes productos ni mesas que no estén en el contexto.",
    "Precios siempre en COP enteros.",
    "",
    "Contexto operativo:",
    contextSummary || "(sin contexto adicional)",
  ].join("\n");
}

function asString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(asString(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePaymentMethod(value: unknown): string {
  const normalized = asString(value).toLowerCase();
  if (/(tarjeta|card|debito|credito)/.test(normalized)) {
    return "card";
  }
  if (/(transfer|nequi|daviplata|pse)/.test(normalized)) {
    return "transfer";
  }
  if (normalized) {
    return normalized;
  }
  return "cash";
}

function normalizeDocumentType(value: unknown): string {
  const normalized = asString(value).toLowerCase();
  if (/cuenta/.test(normalized)) {
    return "cuenta_cobro";
  }
  return "factura";
}

/**
 * Convierte una llamada de herramienta del LLM a intent + draft del motor conversacional.
 */
export function mapGhostLlmToolCall(
  name: string,
  args: Record<string, unknown>,
): GhostAgentPlannedAction | null {
  if (!KNOWN_TOOLS.has(name)) {
    return null;
  }

  const tool = name as GhostLlmToolName;
  const rationale = asString(args.rationale) || undefined;

  switch (tool) {
    case "update_product_price": {
      const price = asNumber(args.price);
      const productName = asString(args.productName);
      if (!productName || price === null || price <= 0) {
        return null;
      }
      return {
        tool,
        rationale,
        args: { productName, price: String(Math.round(price)) },
      };
    }
    case "register_sale": {
      const productName = asString(args.productName);
      if (!productName) {
        return null;
      }
      const quantity = asNumber(args.quantity);
      return {
        tool,
        rationale,
        args: {
          productName,
          quantity: String(quantity && quantity > 0 ? Math.round(quantity) : 1),
          paymentMethod: normalizePaymentMethod(args.paymentMethod),
        },
      };
    }
    case "checkout_table": {
      const tableNumber = asNumber(args.tableNumber);
      if (tableNumber === null || tableNumber <= 0) {
        return null;
      }
      return {
        tool,
        rationale,
        args: {
          tableNumber: String(Math.round(tableNumber)),
          paymentMethod: normalizePaymentMethod(args.paymentMethod),
          documentType: normalizeDocumentType(args.documentType),
          customerEmail: "skip",
        },
      };
    }
    case "open_cash_register": {
      const openingAmount = asNumber(args.openingAmount);
      if (openingAmount === null || openingAmount < 0) {
        return null;
      }
      return {
        tool,
        rationale,
        args: { openingAmount: String(Math.round(openingAmount)) },
      };
    }
    case "add_table_order": {
      const tableNumber = asNumber(args.tableNumber);
      const productName = asString(args.productName);
      if (tableNumber === null || tableNumber <= 0 || !productName) {
        return null;
      }
      const quantity = asNumber(args.quantity);
      return {
        tool,
        rationale,
        args: {
          tableNumber: String(Math.round(tableNumber)),
          productName,
          quantity: String(quantity && quantity > 0 ? Math.round(quantity) : 1),
        },
      };
    }
    case "open_table": {
      const tableNumber = asNumber(args.tableNumber);
      if (tableNumber === null || tableNumber <= 0) {
        return null;
      }
      return {
        tool,
        rationale,
        args: { tableNumber: String(Math.round(tableNumber)) },
      };
    }
    default:
      return null;
  }
}

export function summarizePlannedActions(actions: GhostAgentPlannedAction[]): string {
  if (actions.length === 0) {
    return "";
  }

  const lines = actions.map((action) => {
    switch (action.tool) {
      case "update_product_price":
        return `· Actualizar **${action.args.productName}** → **$${Number(action.args.price).toLocaleString("es-CO")}**`;
      case "register_sale":
        return `· Vender **${action.args.quantity} × ${action.args.productName}**`;
      case "checkout_table":
        return `· Cobrar **mesa ${action.args.tableNumber}**`;
      case "open_cash_register":
        return `· Abrir caja con **$${Number(action.args.openingAmount).toLocaleString("es-CO")}**`;
      case "add_table_order":
        return `· Pedido **${action.args.quantity} × ${action.args.productName}** en mesa **${action.args.tableNumber}**`;
      case "open_table":
        return `· Abrir **mesa ${action.args.tableNumber}**`;
      default:
        return `· ${action.tool}`;
    }
  });

  return `Voy a ejecutar:\n${lines.join("\n")}`;
}

/**
 * Herramientas (function calling) para el agente Ghost con LLM.
 * Cubren la mayoría de operaciones ejecutables del chat.
 */

export type GhostLlmToolName =
  | "update_product_price"
  | "update_product_status"
  | "delete_menu_product"
  | "create_menu_product"
  | "register_sale"
  | "checkout_table"
  | "open_cash_register"
  | "close_cash_register"
  | "cash_movement"
  | "add_table_order"
  | "open_table"
  | "cancel_table"
  | "send_kitchen_order"
  | "update_kitchen_status"
  | "inventory_movement"
  | "create_inventory_item"
  | "register_purchase"
  | "create_fixed_expense"
  | "load_ghost_menu"
  | "build_recipe_cost";

export interface GhostAgentPlannedAction {
  tool: GhostLlmToolName;
  args: Record<string, unknown>;
  rationale?: string;
}

type ToolParam = { type: "STRING" | "NUMBER" | "INTEGER"; description: string };

export interface GhostLlmFunctionDeclaration {
  name: GhostLlmToolName;
  description: string;
  parameters: {
    type: "OBJECT";
    properties: Record<string, ToolParam>;
    required: string[];
  };
}

function tool(
  name: GhostLlmToolName,
  description: string,
  properties: Record<string, ToolParam>,
  required: string[],
): GhostLlmFunctionDeclaration {
  return { name, description, parameters: { type: "OBJECT", properties, required } };
}

export const GHOST_LLM_FUNCTION_DECLARATIONS: GhostLlmFunctionDeclaration[] = [
  tool(
    "update_product_price",
    "Cambia el precio de venta de un producto del menú.",
    {
      productName: { type: "STRING", description: "Nombre del producto" },
      price: { type: "NUMBER", description: "Nuevo precio en COP" },
      rationale: { type: "STRING", description: "Motivo breve" },
    },
    ["productName", "price"],
  ),
  tool(
    "update_product_status",
    "Activa o desactiva un producto en la carta.",
    {
      productName: { type: "STRING", description: "Producto" },
      status: { type: "STRING", description: "active o inactive" },
    },
    ["productName", "status"],
  ),
  tool(
    "delete_menu_product",
    "Elimina un producto del menú y su ficha de costos.",
    { productName: { type: "STRING", description: "Producto a eliminar" } },
    ["productName"],
  ),
  tool(
    "create_menu_product",
    "Crea un producto nuevo en la carta.",
    {
      name: { type: "STRING", description: "Nombre del producto" },
      price: { type: "NUMBER", description: "Precio en COP" },
      category: { type: "STRING", description: "beverage, food, pastry u other" },
    },
    ["name", "price"],
  ),
  tool(
    "register_sale",
    "Venta en mostrador (no mesa).",
    {
      productName: { type: "STRING", description: "Producto" },
      quantity: { type: "INTEGER", description: "Cantidad" },
      paymentMethod: { type: "STRING", description: "cash, card, transfer u other" },
    },
    ["productName"],
  ),
  tool(
    "checkout_table",
    "Cobra y cierra la cuenta de una mesa.",
    {
      tableNumber: { type: "INTEGER", description: "Número de mesa" },
      paymentMethod: { type: "STRING", description: "cash, card, transfer" },
      documentType: { type: "STRING", description: "factura o cuenta_cobro" },
    },
    ["tableNumber"],
  ),
  tool(
    "open_cash_register",
    "Abre caja con fondo inicial.",
    { openingAmount: { type: "NUMBER", description: "Fondo en COP" } },
    ["openingAmount"],
  ),
  tool(
    "close_cash_register",
    "Cierra caja con efectivo contado.",
    { countedAmount: { type: "NUMBER", description: "Efectivo contado en COP" } },
    ["countedAmount"],
  ),
  tool(
    "cash_movement",
    "Entrada o salida de dinero en caja abierta.",
    {
      direction: { type: "STRING", description: "inflow o outflow" },
      amount: { type: "NUMBER", description: "Monto en COP" },
      reason: { type: "STRING", description: "Motivo" },
    },
    ["direction", "amount", "reason"],
  ),
  tool(
    "add_table_order",
    "Anota pedido en mesa y envía comanda.",
    {
      tableNumber: { type: "INTEGER", description: "Mesa" },
      productName: { type: "STRING", description: "Producto" },
      quantity: { type: "INTEGER", description: "Cantidad" },
    },
    ["tableNumber", "productName"],
  ),
  tool(
    "open_table",
    "Abre mesa para servicio.",
    { tableNumber: { type: "INTEGER", description: "Número de mesa" } },
    ["tableNumber"],
  ),
  tool(
    "cancel_table",
    "Cancela mesa abierta sin cobrar.",
    { tableNumber: { type: "INTEGER", description: "Mesa" } },
    ["tableNumber"],
  ),
  tool(
    "send_kitchen_order",
    "Envía comanda pendiente de una mesa a barra/cocina.",
    { tableNumber: { type: "INTEGER", description: "Mesa" } },
    ["tableNumber"],
  ),
  tool(
    "update_kitchen_status",
    "Actualiza estado de una comanda.",
    {
      tableNumber: { type: "INTEGER", description: "Mesa (si aplica)" },
      status: { type: "STRING", description: "preparing, ready o delivered" },
    },
    ["status"],
  ),
  tool(
    "inventory_movement",
    "Entrada, salida, merma o ajuste de inventario.",
    {
      itemName: { type: "STRING", description: "Insumo" },
      quantity: { type: "NUMBER", description: "Cantidad" },
      movementType: { type: "STRING", description: "entry, exit, waste o adjustment" },
    },
    ["itemName", "quantity", "movementType"],
  ),
  tool(
    "create_inventory_item",
    "Crea insumo nuevo en inventario.",
    {
      name: { type: "STRING", description: "Nombre del insumo" },
      baseUnit: { type: "STRING", description: "g, ml, unit o kg" },
    },
    ["name"],
  ),
  tool(
    "register_purchase",
    "Registra factura de compra a proveedor.",
    {
      supplierName: { type: "STRING", description: "Proveedor" },
      itemName: { type: "STRING", description: "Insumo comprado" },
      quantity: { type: "NUMBER", description: "Cantidad" },
      unitCost: { type: "NUMBER", description: "Costo unitario neto COP" },
    },
    ["supplierName", "itemName", "quantity", "unitCost"],
  ),
  tool(
    "create_fixed_expense",
    "Crea gasto fijo recurrente.",
    {
      name: { type: "STRING", description: "Nombre del gasto" },
      amount: { type: "NUMBER", description: "Monto en COP" },
      category: { type: "STRING", description: "rent, payroll, utilities, other" },
    },
    ["name", "amount"],
  ),
  tool(
    "load_ghost_menu",
    "Carga carta Ghost y fichas SCA base.",
    {},
    [],
  ),
  tool(
    "build_recipe_cost",
    "Genera ficha de costos de un producto desde inventario.",
    { productName: { type: "STRING", description: "Producto de la carta" } },
    ["productName"],
  ),
];

const KNOWN_TOOLS = new Set<string>(GHOST_LLM_FUNCTION_DECLARATIONS.map((entry) => entry.name));

export function buildGhostLlmSystemInstruction(contextSummary: string): string {
  return [
    "Eres Ghost, asistente operativo de una cafetería en Ghost ERP.",
    "Interpretas lenguaje natural coloquial y ejecutas operaciones con las herramientas disponibles.",
    "Responde en español, directo y útil, como un compañero de turno.",
    "",
    "REGLAS:",
    "- Para análisis (ventas, márgenes, stock): responde en texto usando el contexto. No inventes cifras.",
    "- Para acciones (vender, cobrar, comprar, ajustar): llama la herramienta correcta.",
    "- Puedes encadenar varias herramientas si la orden lo pide.",
    "- Usa solo productos, insumos y mesas que aparezcan en el contexto.",
    "- Precios y montos en COP enteros.",
    "- Si falta un dato crítico, pregunta una sola cosa concreta antes de actuar.",
    "- Sinónimos: cobrar=cerrar cuenta, vender=facturar mostrador, egreso=salida de caja.",
    "",
    "Contexto operativo:",
    contextSummary || "(sin contexto)",
  ].join("\n");
}

export function isInterpretiveNaturalLanguage(message: string): boolean {
  const normalized = message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.length < 15) {
    return false;
  }

  if (
    /(quiero que|necesito que|podrias|puedes |me ayudas a|ayudame a|hazme |haz que|interpreta|analiza y|sube todos|baja todos|ajusta todos)/.test(
      normalized,
    )
  ) {
    return true;
  }

  if (
    normalized.length > 45 &&
    /( y | ademas | tambien | despues | luego )/.test(normalized)
  ) {
    return true;
  }

  return false;
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

function normalizeMovementType(value: unknown): string {
  const normalized = asString(value).toLowerCase();
  if (/(salida|egreso|exit)/.test(normalized)) {
    return "exit";
  }
  if (/(merma|waste)/.test(normalized)) {
    return "waste";
  }
  if (/(ajuste|adjust)/.test(normalized)) {
    return "adjustment";
  }
  return "entry";
}

function normalizeKitchenStatus(value: unknown): string {
  const normalized = asString(value).toLowerCase();
  if (/(list|ready)/.test(normalized)) {
    return "ready";
  }
  if (/(entreg|deliver)/.test(normalized)) {
    return "delivered";
  }
  return "preparing";
}

function normalizeProductStatus(value: unknown): string {
  const normalized = asString(value).toLowerCase();
  if (/(inactiv|desactiv|off)/.test(normalized)) {
    return "inactive";
  }
  return "active";
}

function normalizeCashDirection(value: unknown): string {
  const normalized = asString(value).toLowerCase();
  if (/(salida|egreso|out)/.test(normalized)) {
    return "outflow";
  }
  return "inflow";
}

export function mapGhostLlmToolCall(
  name: string,
  args: Record<string, unknown>,
): GhostAgentPlannedAction | null {
  if (!KNOWN_TOOLS.has(name)) {
    return null;
  }

  const toolName = name as GhostLlmToolName;
  const rationale = asString(args.rationale) || undefined;

  switch (toolName) {
    case "update_product_price": {
      const price = asNumber(args.price);
      const productName = asString(args.productName);
      if (!productName || price === null || price <= 0) {
        return null;
      }
      return { tool: toolName, rationale, args: { productName, price: String(Math.round(price)) } };
    }
    case "update_product_status": {
      const productName = asString(args.productName);
      if (!productName) {
        return null;
      }
      return {
        tool: toolName,
        rationale,
        args: { productName, status: normalizeProductStatus(args.status) },
      };
    }
    case "delete_menu_product": {
      const productName = asString(args.productName);
      return productName ? { tool: toolName, rationale, args: { productName } } : null;
    }
    case "create_menu_product": {
      const productName = asString(args.name);
      const price = asNumber(args.price);
      if (!productName || price === null || price <= 0) {
        return null;
      }
      return {
        tool: toolName,
        rationale,
        args: {
          name: productName,
          price: String(Math.round(price)),
          category: asString(args.category) || "beverage",
          station: "bar",
        },
      };
    }
    case "register_sale": {
      const productName = asString(args.productName);
      if (!productName) {
        return null;
      }
      const quantity = asNumber(args.quantity);
      return {
        tool: toolName,
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
        tool: toolName,
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
      return { tool: toolName, rationale, args: { openingAmount: String(Math.round(openingAmount)) } };
    }
    case "close_cash_register": {
      const countedAmount = asNumber(args.countedAmount);
      if (countedAmount === null || countedAmount < 0) {
        return null;
      }
      return { tool: toolName, rationale, args: { countedAmount: String(Math.round(countedAmount)) } };
    }
    case "cash_movement": {
      const amount = asNumber(args.amount);
      const reason = asString(args.reason);
      if (amount === null || amount <= 0 || !reason) {
        return null;
      }
      return {
        tool: toolName,
        rationale,
        args: {
          direction: normalizeCashDirection(args.direction),
          amount: String(Math.round(amount)),
          reason,
        },
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
        tool: toolName,
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
      return { tool: toolName, rationale, args: { tableNumber: String(Math.round(tableNumber)) } };
    }
    case "cancel_table": {
      const tableNumber = asNumber(args.tableNumber);
      if (tableNumber === null || tableNumber <= 0) {
        return null;
      }
      return { tool: toolName, rationale, args: { tableNumber: String(Math.round(tableNumber)) } };
    }
    case "send_kitchen_order": {
      const tableNumber = asNumber(args.tableNumber);
      if (tableNumber === null || tableNumber <= 0) {
        return null;
      }
      return { tool: toolName, rationale, args: { tableNumber: String(Math.round(tableNumber)) } };
    }
    case "update_kitchen_status": {
      const status = normalizeKitchenStatus(args.status);
      const tableNumber = asNumber(args.tableNumber);
      return {
        tool: toolName,
        rationale,
        args: {
          status,
          ...(tableNumber !== null && tableNumber > 0
            ? { tableNumber: String(Math.round(tableNumber)) }
            : {}),
        },
      };
    }
    case "inventory_movement": {
      const itemName = asString(args.itemName);
      const quantity = asNumber(args.quantity);
      if (!itemName || quantity === null || quantity <= 0) {
        return null;
      }
      return {
        tool: toolName,
        rationale,
        args: {
          itemName,
          quantity: String(quantity),
          movementType: normalizeMovementType(args.movementType),
        },
      };
    }
    case "create_inventory_item": {
      const itemName = asString(args.name);
      if (!itemName) {
        return null;
      }
      const baseUnit = asString(args.baseUnit) || "unit";
      return { tool: toolName, rationale, args: { name: itemName, baseUnit } };
    }
    case "register_purchase": {
      const supplierName = asString(args.supplierName);
      const itemName = asString(args.itemName);
      const quantity = asNumber(args.quantity);
      const unitCost = asNumber(args.unitCost);
      if (!supplierName || !itemName || quantity === null || unitCost === null) {
        return null;
      }
      return {
        tool: toolName,
        rationale,
        args: {
          supplierName,
          itemName,
          quantity: String(quantity),
          unitCost: String(Math.round(unitCost)),
        },
      };
    }
    case "create_fixed_expense": {
      const expenseName = asString(args.name);
      const amount = asNumber(args.amount);
      if (!expenseName || amount === null || amount <= 0) {
        return null;
      }
      return {
        tool: toolName,
        rationale,
        args: {
          name: expenseName,
          amount: String(Math.round(amount)),
          category: asString(args.category) || "other",
        },
      };
    }
    case "load_ghost_menu":
      return { tool: toolName, rationale, args: {} };
    case "build_recipe_cost": {
      const productName = asString(args.productName);
      return productName ? { tool: toolName, rationale, args: { productName } } : null;
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
    const a = action.args;
    switch (action.tool) {
      case "update_product_price":
        return `· Precio **${a.productName}** → **$${Number(a.price).toLocaleString("es-CO")}**`;
      case "update_product_status":
        return `· ${a.status === "inactive" ? "Desactivar" : "Activar"} **${a.productName}**`;
      case "delete_menu_product":
        return `· Eliminar **${a.productName}** del menú`;
      case "create_menu_product":
        return `· Crear **${a.name}** a **$${Number(a.price).toLocaleString("es-CO")}**`;
      case "register_sale":
        return `· Vender **${a.quantity} × ${a.productName}**`;
      case "checkout_table":
        return `· Cobrar **mesa ${a.tableNumber}**`;
      case "open_cash_register":
        return `· Abrir caja con **$${Number(a.openingAmount).toLocaleString("es-CO")}**`;
      case "close_cash_register":
        return `· Cerrar caja con **$${Number(a.countedAmount).toLocaleString("es-CO")}** contados`;
      case "cash_movement":
        return `· ${a.direction === "outflow" ? "Salida" : "Entrada"} caja **$${Number(a.amount).toLocaleString("es-CO")}** — ${a.reason}`;
      case "add_table_order":
        return `· **${a.quantity} × ${a.productName}** en mesa **${a.tableNumber}**`;
      case "open_table":
        return `· Abrir **mesa ${a.tableNumber}**`;
      case "cancel_table":
        return `· Cancelar **mesa ${a.tableNumber}**`;
      case "send_kitchen_order":
        return `· Enviar comanda mesa **${a.tableNumber}**`;
      case "update_kitchen_status":
        return `· Comanda → **${a.status}**${a.tableNumber ? ` (mesa ${a.tableNumber})` : ""}`;
      case "inventory_movement":
        return `· Inventario **${a.movementType}** ${a.quantity} de **${a.itemName}**`;
      case "create_inventory_item":
        return `· Crear insumo **${a.name}** (${a.baseUnit})`;
      case "register_purchase":
        return `· Compra **${a.itemName}** a **${a.supplierName}**`;
      case "create_fixed_expense":
        return `· Gasto fijo **${a.name}** **$${Number(a.amount).toLocaleString("es-CO")}**`;
      case "load_ghost_menu":
        return "· Cargar carta Ghost";
      case "build_recipe_cost":
        return `· Ficha de costos de **${a.productName}**`;
      default:
        return `· ${action.tool}`;
    }
  });

  return `Voy a ejecutar:\n${lines.join("\n")}`;
}

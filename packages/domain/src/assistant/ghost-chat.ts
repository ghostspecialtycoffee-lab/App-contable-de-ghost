/** Asistente conversacional Ghost — flujos estandarizados por rol. */

export type GhostChatRole = "admin" | "waiter" | "cashier";

export type GhostChatSpeaker = "ghost" | "user";

export interface GhostChatMessage {
  id: string;
  speaker: GhostChatSpeaker;
  text: string;
  createdAt: string;
}

export interface GhostChatSession {
  /** Ruta del flujo activo, ej. ["admin", "purchase-invoice"] */
  flowPath: string[];
  /** Índice del paso dentro del flujo */
  stepIndex: number;
  /** Respuestas acumuladas del flujo actual */
  draft: Record<string, string>;
  role: GhostChatRole | null;
  /** Acción operativa en curso (modo conversacional) */
  pendingIntent?: string | null;
  /** Sesión del agente para continuidad */
  agentSessionId?: string;
}

export interface GhostChatMenuOption {
  id: string;
  label: string;
  description?: string;
}

export const GHOST_ASSISTANT_NAME = "Ghost";

export const GHOST_CHAT_GLOBAL_COMMANDS = ["menu", "inicio", "ayuda", "cancelar"] as const;

export function createEmptyGhostChatSession(): GhostChatSession {
  return {
    flowPath: ["conversation"],
    stepIndex: 0,
    draft: {},
    role: null,
    pendingIntent: null,
  };
}

export function isGhostChatGlobalCommand(input: string): boolean {
  const normalized = input.trim().toLowerCase();
  return (GHOST_CHAT_GLOBAL_COMMANDS as readonly string[]).includes(normalized);
}

export const GHOST_ROLE_MENUS: Record<GhostChatRole, GhostChatMenuOption[]> = {
  admin: [
    {
      id: "add-inventory-item",
      label: "Agregar insumo",
      description: "Materia prima en inventario",
    },
    {
      id: "purchase-invoice",
      label: "Registrar factura de compra",
      description: "Proveedor, líneas y confirmación",
    },
    {
      id: "add-menu-product",
      label: "Agregar producto al catálogo",
      description: "Nombre, precio y estación",
    },
    {
      id: "confirm-beverage-setup",
      label: "Confirmar bebida de barra",
      description: "Preguntas SCA avanzadas (Mocaccino, Colbrew…)",
    },
    {
      id: "seed-ghost-menu",
      label: "Cargar carta Ghost + fichas SCA",
      description: "25 bebidas y recetas base",
    },
    {
      id: "org-status",
      label: "Ver estado de la operación",
      description: "Compras, inventario, carta y caja",
    },
  ],
  waiter: [
    {
      id: "open-table",
      label: "Abrir mesa",
      description: "Iniciar cuenta en una mesa",
    },
    {
      id: "add-table-order",
      label: "Agregar pedido a mesa",
      description: "Productos a una mesa abierta",
    },
    {
      id: "send-kitchen",
      label: "Enviar comanda",
      description: "Pendientes de mesa a barra/cocina",
    },
  ],
  cashier: [
    {
      id: "open-cash",
      label: "Abrir caja",
      description: "Fondo inicial del día",
    },
    {
      id: "counter-sale",
      label: "Venta en mostrador",
      description: "Cobro directo con comanda",
    },
    {
      id: "update-kitchen-order",
      label: "Actualizar comanda",
      description: "Pendiente → preparando → lista",
    },
  ],
};

export const GHOST_ROOT_MENU: GhostChatMenuOption[] = [
  {
    id: "free-question",
    label: "Pregunta libre (búsqueda web)",
    description: "Agente Ghost con conocimiento evolutivo",
  },
  {
    id: "admin",
    label: "Financiero / administrador",
    description: "Compras, inventario, costos y catálogo",
  },
  {
    id: "waiter",
    label: "Mesero",
    description: "Mesas, pedidos y comandas",
  },
  {
    id: "cashier",
    label: "Cajero",
    description: "Caja, cobros y estado de comandas",
  },
];

export function ghostChatGreeting(orgName?: string): string {
  const place = orgName?.trim() ? ` en ${orgName.trim()}` : "";
  return (
    `Hola, soy ${GHOST_ASSISTANT_NAME}${place}. ` +
    "Háblame con naturalidad: registro compras, reviso inventario, abro mesas, cobro en mostrador, " +
    "costos de café o lo que necesites. Leo el contexto y ejecuto en la plataforma.\n\n" +
    "Ejemplos: «¿cómo va la operación?», «registra factura de Distritcafé por 2 kg de café», " +
    "«abre caja con 200000», «vende un latte en efectivo»."
  );
}

export function formatGhostChatMenu(options: GhostChatMenuOption[]): string {
  return options
    .map((option, index) => {
      const detail = option.description ? ` — ${option.description}` : "";
      return `${index + 1}. **${option.label}**${detail}`;
    })
    .join("\n");
}

export function resolveMenuSelection(
  input: string,
  options: GhostChatMenuOption[],
): GhostChatMenuOption | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const asNumber = Number(trimmed);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= options.length) {
    return options[asNumber - 1] ?? null;
  }

  const normalized = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return (
    options.find((option) => {
      const id = option.id.toLowerCase();
      const label = option.label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return (
        normalized === id ||
        normalized === label ||
        label.includes(normalized) ||
        normalized.includes(id)
      );
    }) ?? null
  );
}

export function parsePaymentMethod(input: string): "cash" | "card" | "transfer" | "other" | null {
  const normalized = input.trim().toLowerCase();
  if (/^1|efectivo|cash$/.test(normalized)) {
    return "cash";
  }
  if (/^2|tarjeta|card|datáfono|datafono$/.test(normalized)) {
    return "card";
  }
  if (/^3|transfer|transferencia|nequi|daviplata$/.test(normalized)) {
    return "transfer";
  }
  if (/^4|otro|other$/.test(normalized)) {
    return "other";
  }
  return null;
}

export function parseKitchenOrderStatus(
  input: string,
): "preparing" | "ready" | "delivered" | null {
  const normalized = input.trim().toLowerCase();
  if (/^1|preparando|preparing$/.test(normalized)) {
    return "preparing";
  }
  if (/^2|lista|ready|listo$/.test(normalized)) {
    return "ready";
  }
  if (/^3|entregad|delivered$/.test(normalized)) {
    return "delivered";
  }
  return null;
}

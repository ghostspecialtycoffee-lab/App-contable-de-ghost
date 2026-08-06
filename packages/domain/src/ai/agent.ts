/** Agente Ghost — conocimiento evolutivo y búsqueda web. */

export interface AgentKnowledgeEntry {
  id: string;
  organizationId: string;
  question: string;
  answer: string;
  sources: AgentKnowledgeSource[];
  confidence: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentKnowledgeSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface GhostAgentHistoryMessage {
  role: "user" | "ghost";
  text: string;
}

export interface GhostAgentRequest {
  message: string;
  sessionId?: string;
  allowWebSearch?: boolean;
  contextSummary?: string;
  history?: GhostAgentHistoryMessage[];
}

export interface GhostAgentResponse {
  answer: string;
  usedWebSearch: boolean;
  sources: AgentKnowledgeSource[];
  knowledgeEntryId?: string;
  suggestedFollowUp?: string;
}

export function normalizeAgentQuestion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function scoreKnowledgeMatch(question: string, candidate: string): number {
  const normalizedQuestion = normalizeAgentQuestion(question);
  const normalizedCandidate = normalizeAgentQuestion(candidate);

  if (normalizedQuestion === normalizedCandidate) {
    return 1;
  }
  if (
    normalizedCandidate.includes(normalizedQuestion) ||
    normalizedQuestion.includes(normalizedCandidate)
  ) {
    return 0.85;
  }

  const questionTokens = new Set(normalizedQuestion.split(" ").filter(Boolean));
  const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);
  if (candidateTokens.length === 0) {
    return 0;
  }

  const overlap = candidateTokens.filter((token) => questionTokens.has(token)).length;
  return overlap / Math.max(questionTokens.size, candidateTokens.length);
}

export function buildGhostAgentFallbackAnswer(
  message: string,
  contextSummary?: string,
  history: GhostAgentHistoryMessage[] = [],
): string {
  const normalized = normalizeAgentQuestion(message);

  if (contextSummary && /(como va|estado|resumen|operacion)/.test(normalized)) {
    return (
      `Según lo que veo ahora:\n${contextSummary}\n\n` +
      "¿Quieres que anote un pedido en mesa, registre una compra o cierre una cuenta?"
    );
  }

  if (/^(hola|buenas|buenos|hey|gracias)/.test(normalized)) {
    return contextSummary
      ? `¡Hola! Estoy contigo. ${contextSummary.split("\n")[0]}. ¿Qué hacemos?`
      : "¡Hola! Cuéntame qué necesitas en la operación y lo resolvemos.";
  }

  if (/(ayuda|que puedes|que sabes|como funciona|ejemplos|menu)/.test(normalized)) {
    return (
      "Puedo ayudarte en conversación natural, por ejemplo:\n" +
      "· **«para la mesa 1 dame 2 dirty chai»** — anota y manda comanda\n" +
      "· **«dame la cuenta de la mesa 1»** — cobra y emite factura o cuenta de cobro\n" +
      "· **«abre caja con 200000»** — apertura de caja\n" +
      "· **«registra compra de café del proveedor X»** — compras\n\n" +
      "Escríbeme como le hablarías a un compañero de barra."
    );
  }

  const hasHistory = history.length > 0;

  return (
    "Puedo ayudarte con **mesas**, **comandas**, **caja**, **compras** e **inventario**. " +
    "Dime qué quieres en una frase, por ejemplo: «para la mesa 2 dame un latte» " +
    "o «dame la cuenta de la mesa 1»." +
    (hasHistory ? "\n\n_Sigo contigo en la conversación._" : "")
  );
}

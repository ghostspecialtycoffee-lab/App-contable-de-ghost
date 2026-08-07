import {
  normalizeAgentQuestion,
  scoreKnowledgeMatch,
  type AgentKnowledgeSource,
  type GhostAgentResponse,
} from "@ghost/domain";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

import { searchWeb } from "./webSearch.js";
import { getDb } from "../shared/db.js";
import { assertOrgPermission, getActiveOrganizationId } from "../shared/permissions.js";

const GHOST_AGENT_SYSTEM_CONTEXT = [
  "Eres Ghost, asistente operativo de Ghost Specialty Coffee.",
  "Respondes en español de forma conversacional y directa, como un colega de barra que conoce la operación.",
  "Usa el contexto operativo y el historial para entender la intención sin pedir menús ni números de opción.",
  "Si usas información web, cita las fuentes y marca incertidumbre cuando aplique.",
].join(" ");

export const ghostAgent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const message = String(request.data?.message ?? "").trim();
  if (message.length < 2) {
    throw new HttpsError("invalid-argument", "Escribe un mensaje un poco más específico.");
  }

  const organizationId = await getActiveOrganizationId(request.auth.uid);
  await assertOrgPermission(organizationId, request.auth.uid, {
    module: "chat",
    action: "read",
  });

  const allowWebSearch = request.data?.allowWebSearch !== false;
  const sessionId = String(request.data?.sessionId ?? `session-${Date.now()}`);
  const contextSummary = String(request.data?.contextSummary ?? "").trim();
  const history = Array.isArray(request.data?.history)
    ? (request.data.history as Array<{ role?: string; text?: string }>)
        .filter((entry) => entry?.text?.trim())
        .slice(-6)
        .map((entry) => ({
          role: entry.role === "ghost" ? "ghost" : "user",
          text: String(entry.text).trim(),
        }))
    : [];

  const db = getDb();

  const knowledgeSnap = await db
    .collection("organizations")
    .doc(organizationId)
    .collection("agentKnowledge")
    .orderBy("updatedAt", "desc")
    .limit(40)
    .get();

  let bestMatch: { id: string; answer: string; sources: AgentKnowledgeSource[]; score: number } | null =
    null;

  for (const document of knowledgeSnap.docs) {
    const data = document.data();
    const score = scoreKnowledgeMatch(message, String(data.question ?? ""));
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        id: document.id,
        answer: String(data.answer ?? ""),
        sources: (data.sources as AgentKnowledgeSource[]) ?? [],
        score,
      };
    }
  }

  if (bestMatch && bestMatch.score >= 0.82 && bestMatch.answer) {
    await db
      .collection("organizations")
      .doc(organizationId)
      .collection("agentKnowledge")
      .doc(bestMatch.id)
      .update({ usageCount: FieldValue.increment(1), updatedAt: new Date().toISOString() });

    const response: GhostAgentResponse = {
      answer: formatConversationalAnswer(bestMatch.answer, contextSummary, history),
      usedWebSearch: false,
      sources: bestMatch.sources,
      knowledgeEntryId: bestMatch.id,
      suggestedFollowUp: undefined,
    };

    await persistAgentSession(db, organizationId, sessionId, request.auth.uid, message, response);
    return response;
  }

  let answer = "";
  let sources: AgentKnowledgeSource[] = [];
  let usedWebSearch = false;

  if (allowWebSearch) {
    const enrichedQuery = [message, contextSummary ? `Contexto: ${contextSummary}` : ""]
      .filter(Boolean)
      .join(" · ");
    const web = await searchWeb(`${enrichedQuery} café especialidad Colombia`);
    if (web) {
      answer = formatConversationalAnswer(
        `${GHOST_AGENT_SYSTEM_CONTEXT}\n\n${web.answer}`,
        contextSummary,
        history,
      );
      sources = web.sources;
      usedWebSearch = true;
    }
  }

  if (!answer) {
    answer = buildFallbackAnswer(message, contextSummary, history);
  }

  const knowledgeRef = db
    .collection("organizations")
    .doc(organizationId)
    .collection("agentKnowledge")
    .doc();

  const now = new Date().toISOString();
  await knowledgeRef.set({
    organizationId,
    question: message,
    answer,
    sources,
    confidence: usedWebSearch ? 0.7 : 0.5,
    usageCount: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: request.auth.uid,
  });

  const response: GhostAgentResponse = {
    answer,
    usedWebSearch,
    sources,
    knowledgeEntryId: knowledgeRef.id,
    suggestedFollowUp: undefined,
  };

  await persistAgentSession(db, organizationId, sessionId, request.auth.uid, message, response);
  return response;
});

function formatHistory(history: Array<{ role: string; text: string }>): string {
  if (history.length === 0) {
    return "";
  }

  return history
    .map((entry) => `${entry.role === "ghost" ? "Ghost" : "Usuario"}: ${entry.text}`)
    .join("\n");
}

function formatConversationalAnswer(
  base: string,
  contextSummary: string,
  history: Array<{ role: string; text: string }>,
): string {
  const historyBlock = formatHistory(history);
  const parts = [base.trim()];

  if (contextSummary && /operacion|inventario|caja|mesa|compra|costo/i.test(base)) {
    parts.push(`\n\n_Contexto actual:_\n${contextSummary}`);
  }

  if (historyBlock && base.length < 400) {
    parts.push(`\n\n_Sigo contigo en la conversación._`);
  }

  return parts.join("");
}

function buildFallbackAnswer(
  message: string,
  contextSummary: string,
  history: Array<{ role: string; text: string }>,
): string {
  const normalized = normalizeAgentQuestion(message);

  if (contextSummary && /(como va|estado|resumen|operacion)/.test(normalized)) {
    return `Según lo que veo ahora:\n${contextSummary}\n\n¿Quieres que registre una compra, abra caja o revise algo específico?`;
  }

  if (/^(hola|buenas|buenos|hey|gracias)/.test(normalized)) {
    return contextSummary
      ? `¡Hola! Estoy contigo. ${contextSummary.split("\n")[0]}. ¿Qué hacemos?`
      : "¡Hola! Cuéntame qué necesitas en la operación y lo resolvemos.";
  }

  const historyHint = formatHistory(history);
  const hint = historyHint ? `\n\nRecuerdo lo último que hablamos.` : "";

  return (
    "Puedo ayudarte con compras, inventario, costos, ventas y comandas. " +
    "Dime qué quieres hacer en una frase, por ejemplo: «registra factura de proveedor por café» " +
    "o «vende un cappuccino en efectivo»." +
    hint
  );
}

async function persistAgentSession(
  db: Firestore,
  organizationId: string,
  sessionId: string,
  userId: string,
  question: string,
  response: GhostAgentResponse,
): Promise<void> {
  const sessionRef = db
    .collection("organizations")
    .doc(organizationId)
    .collection("agentSessions")
    .doc(sessionId);

  await sessionRef.set(
    {
      organizationId,
      userId,
      messages: FieldValue.arrayUnion(
        {
          role: "user",
          text: question,
          at: new Date().toISOString(),
        },
        {
          role: "ghost",
          text: response.answer,
          sources: response.sources,
          usedWebSearch: response.usedWebSearch,
          at: new Date().toISOString(),
        },
      ),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  void normalizeAgentQuestion(question);
}

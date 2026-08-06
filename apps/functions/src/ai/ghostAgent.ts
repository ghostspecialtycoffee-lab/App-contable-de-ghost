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
  "Respondes en español, con datos concretos para café de especialidad, costos, inventario y operación en Colombia.",
  "Si usas información web, cita las fuentes y marca incertidumbre cuando aplique.",
].join(" ");

export const ghostAgent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const message = String(request.data?.message ?? "").trim();
  if (message.length < 3) {
    throw new HttpsError("invalid-argument", "Escribe una pregunta más específica.");
  }

  const organizationId = await getActiveOrganizationId(request.auth.uid);
  await assertOrgPermission(organizationId, request.auth.uid, {
    module: "chat",
    action: "read",
  });

  const allowWebSearch = request.data?.allowWebSearch !== false;
  const sessionId = String(request.data?.sessionId ?? `session-${Date.now()}`);
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
      answer: bestMatch.answer,
      usedWebSearch: false,
      sources: bestMatch.sources,
      knowledgeEntryId: bestMatch.id,
      suggestedFollowUp: "¿Quieres que actualice esta respuesta con una búsqueda web?",
    };

    await persistAgentSession(db, organizationId, sessionId, request.auth.uid, message, response);
    return response;
  }

  let answer = "";
  let sources: AgentKnowledgeSource[] = [];
  let usedWebSearch = false;

  if (allowWebSearch) {
    const web = await searchWeb(`${message} café especialidad Colombia`);
    if (web) {
      answer = `${GHOST_AGENT_SYSTEM_CONTEXT}\n\n${web.answer}`;
      sources = web.sources;
      usedWebSearch = true;
    }
  }

  if (!answer) {
    answer =
      "No encontré una respuesta confiable todavía. " +
      "Configura TAVILY_API_KEY en Functions para búsqueda web ampliada, " +
      "o reformula la pregunta con más contexto de Ghost (insumo, bebida, proveedor).";
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
    suggestedFollowUp: usedWebSearch
      ? "Guardé esta respuesta para evolucionar el agente interno."
      : undefined,
  };

  await persistAgentSession(db, organizationId, sessionId, request.auth.uid, message, response);
  return response;
});

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

import {
  buildGhostAgentFallbackAnswer,
  scoreKnowledgeMatch,
  type AgentKnowledgeSource,
  type GhostAgentHistoryMessage,
  type GhostAgentResponse,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";
import { callGhostAgent } from "@/lib/firebase/functions";

function isCallableUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return true;
  }

  const code = String(error.code).replace("functions/", "");
  return (
    code === "internal" ||
    code === "not-found" ||
    code === "unavailable" ||
    code === "deadline-exceeded"
  );
}

async function loadKnowledgeAnswer(
  organizationId: string,
  message: string,
): Promise<{ answer: string; sources: AgentKnowledgeSource[] } | null> {
  const snapshot = await getDocs(
    query(
      collection(getFirestoreDb(), firestorePaths.organizationAgentKnowledge(organizationId)),
      orderBy("updatedAt", "desc"),
      limit(40),
    ),
  );

  let best: { answer: string; sources: AgentKnowledgeSource[]; score: number } | null = null;

  for (const document of snapshot.docs) {
    const data = document.data();
    const score = scoreKnowledgeMatch(message, String(data.question ?? ""));
    if (!best || score > best.score) {
      best = {
        answer: String(data.answer ?? ""),
        sources: (data.sources as AgentKnowledgeSource[]) ?? [],
        score,
      };
    }
  }

  if (best && best.score >= 0.82 && best.answer.trim()) {
    return { answer: best.answer, sources: best.sources };
  }

  return null;
}

export async function resolveGhostAgentQuery(input: {
  organizationId: string;
  message: string;
  sessionId: string;
  contextSummary?: string;
  history?: GhostAgentHistoryMessage[];
}): Promise<GhostAgentResponse> {
  const history = input.history ?? [];

  try {
    const knowledge = await loadKnowledgeAnswer(input.organizationId, input.message);
    if (knowledge) {
      return {
        answer: knowledge.answer,
        usedWebSearch: false,
        sources: knowledge.sources,
      };
    }
  } catch {
    // Sin acceso a conocimiento guardado — seguimos con fallback.
  }

  try {
    return await callGhostAgent({
      message: input.message,
      sessionId: input.sessionId,
      allowWebSearch: true,
      contextSummary: input.contextSummary,
      history,
    });
  } catch (error) {
    if (!isCallableUnavailable(error)) {
      throw error;
    }
  }

  return {
    answer: buildGhostAgentFallbackAnswer(input.message, input.contextSummary, history),
    usedWebSearch: false,
    sources: [],
  };
}

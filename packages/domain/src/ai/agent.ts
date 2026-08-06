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

export interface GhostAgentRequest {
  message: string;
  sessionId?: string;
  allowWebSearch?: boolean;
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

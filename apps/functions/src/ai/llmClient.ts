import {
  GHOST_LLM_FUNCTION_DECLARATIONS,
  buildGhostLlmSystemInstruction,
  mapGhostLlmToolCall,
  summarizePlannedActions,
  type GhostAgentPlannedAction,
} from "@ghost/domain";

const GEMINI_MODEL = "gemini-2.0-flash";

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
}

export interface GhostLlmPlanResult {
  answer: string;
  plannedActions: GhostAgentPlannedAction[];
}

function toGeminiRole(role: "user" | "ghost"): string {
  return role === "ghost" ? "model" : "user";
}

export async function planGhostAgentWithLlm(input: {
  message: string;
  contextSummary: string;
  history: Array<{ role: "user" | "ghost"; text: string }>;
  apiKey: string;
}): Promise<GhostLlmPlanResult | null> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    return null;
  }

  const contents: GeminiContent[] = input.history.slice(-6).map((entry) => ({
    role: toGeminiRole(entry.role),
    parts: [{ text: entry.text }],
  }));

  contents.push({
    role: "user",
    parts: [{ text: input.message }],
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildGhostLlmSystemInstruction(input.contextSummary) }],
        },
        contents,
        tools: [
          {
            functionDeclarations: GHOST_LLM_FUNCTION_DECLARATIONS.map((tool: (typeof GHOST_LLM_FUNCTION_DECLARATIONS)[number]) => ({
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            })),
          },
        ],
        toolConfig: {
          functionCallingConfig: { mode: "AUTO" },
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    console.warn("Gemini planner failed:", response.status, detail.slice(0, 300));
    return null;
  }

  const payload = (await response.json()) as GeminiResponse;
  const parts = payload.candidates?.[0]?.content?.parts ?? [];

  const textParts: string[] = [];
  const plannedActions: GhostAgentPlannedAction[] = [];

  for (const part of parts) {
    if (part.text?.trim()) {
      textParts.push(part.text.trim());
    }
    if (part.functionCall?.name) {
      const mapped = mapGhostLlmToolCall(
        part.functionCall.name,
        part.functionCall.args ?? {},
      );
      if (mapped) {
        plannedActions.push(mapped);
      }
    }
  }

  if (textParts.length === 0 && plannedActions.length === 0) {
    return null;
  }

  const answer =
    textParts.join("\n\n").trim() ||
    summarizePlannedActions(plannedActions) ||
    "Listo, ejecuto eso.";

  return { answer, plannedActions };
}

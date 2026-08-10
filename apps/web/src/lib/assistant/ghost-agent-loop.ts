import {
  MAX_GHOST_AGENT_LOOP_ITERATIONS,
  appendAgentLoopExecutionResult,
  buildAgentLoopContinuationMessage,
  composeAgentLoopFinalMessage,
  shouldContinueAgentLoop,
  type GhostAgentHistoryMessage,
  type GhostAgentLoopState,
} from "@ghost/domain";

import { resolveGhostAgentQuery } from "@/lib/assistant/ghost-agent-client";
import {
  formatGhostActionError,
  formatGhostActionSuccess,
  type GhostChatAction,
  type GhostChatContext,
} from "@/lib/assistant/ghost-chat-engine";
import {
  formatPlannedActionSkips,
  resolvePlannedActions,
} from "@/lib/assistant/ghost-planned-actions";
import { getCallableErrorMessage } from "@/lib/auth/errors";

import type { GhostChatActionResult } from "./ghost-chat-actions";

export interface GhostAgentLoopExecutionContext {
  organizationId: string;
  branchId: string;
  userId: string;
  recipes: Array<{
    menuProductId: string;
    lines: Array<{
      inventoryItemId: string;
      itemName: string;
      quantity: number;
      unit: string;
    }>;
    yieldQuantity: number;
  }>;
  inventoryItems: Array<{ id: string; baseUnit: string }>;
  defaultWarehouseId?: string;
  chatContext: GhostChatContext;
}

async function executePlannedChatActions(
  actions: GhostChatAction[],
  executeAction: (action: GhostChatAction) => Promise<GhostChatActionResult | undefined>,
): Promise<string[]> {
  const results: string[] = [];

  for (const plannedAction of actions) {
    try {
      const result = await executeAction(plannedAction);
      results.push(
        result?.message ?? formatGhostActionSuccess(plannedAction, result?.message),
      );
    } catch (cause) {
      results.push(formatGhostActionError(plannedAction, getCallableErrorMessage(cause)));
    }
  }

  return results;
}

function summarizeStepResults(actionResults: string[], skippedSummary: string): string {
  const parts = [...actionResults];
  if (skippedSummary.trim()) {
    parts.push(skippedSummary);
  }
  return parts.join(" · ");
}

export async function runAutonomousAgentLoop(input: {
  organizationId: string;
  sessionId: string;
  message: string;
  contextSummary: string;
  history?: GhostAgentHistoryMessage[];
  executionContext: GhostAgentLoopExecutionContext;
  executeAction: (action: GhostChatAction) => Promise<GhostChatActionResult | undefined>;
}): Promise<GhostChatActionResult> {
  const originalGoal = input.message.trim();
  let loopState: GhostAgentLoopState = {
    originalGoal,
    executionResults: [],
    iteration: 0,
  };
  let loopHistory = input.history ?? [];
  let lastAnswer = "";
  let sources: Array<{ title: string; url: string }> = [];

  while (loopState.iteration < MAX_GHOST_AGENT_LOOP_ITERATIONS) {
    const isContinuation = loopState.iteration > 0;
    const agentMessage = isContinuation
      ? buildAgentLoopContinuationMessage(loopState)
      : originalGoal;

    const response = await resolveGhostAgentQuery({
      organizationId: input.organizationId,
      message: agentMessage,
      sessionId: input.sessionId,
      contextSummary: input.contextSummary,
      history: loopHistory,
      agentLoop: isContinuation ? loopState : undefined,
      skipKnowledge: isContinuation,
    });

    lastAnswer = response.answer;
    sources = response.sources;

    const plannedActions = response.plannedActions ?? [];
    if (plannedActions.length === 0) {
      break;
    }

    const resolution = resolvePlannedActions(plannedActions, input.executionContext.chatContext);
    const skippedSummary = formatPlannedActionSkips(resolution.skipped);

    if (resolution.actions.length === 0) {
      loopState = appendAgentLoopExecutionResult(
        loopState,
        skippedSummary || "No se pudo ejecutar ninguna acción planificada.",
      );
      break;
    }

    const actionResults = await executePlannedChatActions(
      resolution.actions,
      input.executeAction,
    );
    const stepSummary = summarizeStepResults(actionResults, skippedSummary);

    loopHistory = [
      ...loopHistory,
      { role: "ghost", text: response.answer },
      { role: "user", text: `[Resultados paso ${loopState.iteration + 1}] ${stepSummary}` },
    ];

    loopState = appendAgentLoopExecutionResult(loopState, stepSummary);

    const shouldContinue = shouldContinueAgentLoop({
      iteration: loopState.iteration,
      hadPlannedActions: true,
      executedActions: resolution.actions.length,
    });

    if (!shouldContinue) {
      break;
    }
  }

  const sourcesBlock =
    sources.length > 0
      ? `\n\nFuentes:\n${sources.map((source) => `· ${source.title}: ${source.url}`).join("\n")}`
      : "";

  return {
    message: `${composeAgentLoopFinalMessage(lastAnswer, loopState.executionResults)}${sourcesBlock}`,
  };
}

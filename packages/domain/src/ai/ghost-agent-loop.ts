export const MAX_GHOST_AGENT_LOOP_ITERATIONS = 5;

export interface GhostAgentLoopState {
  originalGoal: string;
  executionResults: string[];
  iteration: number;
}

export function buildAgentLoopContinuationMessage(state: GhostAgentLoopState): string {
  const steps =
    state.executionResults.length > 0
      ? state.executionResults.map((entry, index) => `${index + 1}. ${entry}`).join("\n")
      : "Sin resultados aún.";

  return [
    `Orden original: «${state.originalGoal}»`,
    "",
    "Resultados ejecutados hasta ahora:",
    steps,
    "",
    "Continúa con los pasos que falten para completar la orden original.",
    "Si ya terminó, responde solo con un resumen breve y NO llames más herramientas.",
  ].join("\n");
}

export function appendAgentLoopExecutionResult(
  state: GhostAgentLoopState,
  stepSummary: string,
): GhostAgentLoopState {
  return {
    ...state,
    executionResults: [...state.executionResults, stepSummary],
    iteration: state.iteration + 1,
  };
}

export function shouldContinueAgentLoop(input: {
  iteration: number;
  hadPlannedActions: boolean;
  executedActions: number;
}): boolean {
  if (input.iteration >= MAX_GHOST_AGENT_LOOP_ITERATIONS) {
    return false;
  }

  if (!input.hadPlannedActions) {
    return false;
  }

  return input.executedActions > 0;
}

export function composeAgentLoopFinalMessage(answer: string, executionResults: string[]): string {
  if (executionResults.length === 0) {
    return answer;
  }

  const steps = executionResults.map((entry, index) => `${index + 1}. ${entry}`).join("\n");
  return `${answer.trim()}\n\n**Ejecutado:**\n${steps}`;
}

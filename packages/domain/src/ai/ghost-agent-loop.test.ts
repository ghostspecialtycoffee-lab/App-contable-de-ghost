import { describe, expect, it } from "vitest";

import {
  MAX_GHOST_AGENT_LOOP_ITERATIONS,
  appendAgentLoopExecutionResult,
  buildAgentLoopContinuationMessage,
  composeAgentLoopFinalMessage,
  shouldContinueAgentLoop,
} from "./ghost-agent-loop.js";

describe("ghost-agent-loop", () => {
  it("construye mensaje de continuación con resultados previos", () => {
    const message = buildAgentLoopContinuationMessage({
      originalGoal: "sube precios de bebidas con margen bajo",
      executionResults: ["Latte actualizado a $14000"],
      iteration: 1,
    });

    expect(message).toContain("sube precios de bebidas");
    expect(message).toContain("Latte actualizado");
    expect(message).toContain("NO llames más herramientas");
  });

  it("acumula resultados de ejecución", () => {
    const next = appendAgentLoopExecutionResult(
      { originalGoal: "test", executionResults: [], iteration: 0 },
      "Venta registrada",
    );

    expect(next.executionResults).toEqual(["Venta registrada"]);
    expect(next.iteration).toBe(1);
  });

  it("detiene el loop al llegar al máximo o sin acciones", () => {
    expect(
      shouldContinueAgentLoop({
        iteration: MAX_GHOST_AGENT_LOOP_ITERATIONS,
        hadPlannedActions: true,
        executedActions: 1,
      }),
    ).toBe(false);

    expect(
      shouldContinueAgentLoop({
        iteration: 1,
        hadPlannedActions: false,
        executedActions: 0,
      }),
    ).toBe(false);

    expect(
      shouldContinueAgentLoop({
        iteration: 1,
        hadPlannedActions: true,
        executedActions: 2,
      }),
    ).toBe(true);
  });

  it("compone mensaje final con pasos ejecutados", () => {
    const message = composeAgentLoopFinalMessage("Listo.", ["Paso A", "Paso B"]);
    expect(message).toContain("Listo.");
    expect(message).toContain("Paso A");
    expect(message).toContain("Paso B");
  });
});

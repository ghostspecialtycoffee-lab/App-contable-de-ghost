import { describe, expect, it } from "vitest";

import { buildGhostAgentFallbackAnswer } from "./agent.js";

describe("ghost agent fallback", () => {
  it("sugiere ejemplos operativos de mesas", () => {
    const answer = buildGhostAgentFallbackAnswer("no entiendo", "Organización: Ghost Lab");
    expect(answer).toMatch(/mesa/i);
    expect(answer).toMatch(/dirty chai|latte|cuenta/i);
  });

  it("responde ayuda sin servidor", () => {
    const answer = buildGhostAgentFallbackAnswer("ayuda");
    expect(answer).toMatch(/mesa 1/i);
    expect(answer).toMatch(/factura|cuenta de cobro/i);
  });
});

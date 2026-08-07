import { describe, expect, it } from "vitest";

import { minutesUntilTime, weekdayFromDate } from "./business-hours.js";
import { scoreKnowledgeMatch } from "../ai/agent.js";

describe("business-hours", () => {
  it("resolves weekday in Bogota timezone", () => {
    const date = new Date("2026-08-06T15:00:00.000Z");
    const weekday = weekdayFromDate(date, "America/Bogota");
    expect(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]).toContain(
      weekday,
    );
  });

  it("computes minutes until target time", () => {
    const now = new Date("2026-08-06T14:00:00.000Z");
    const delta = minutesUntilTime(now, "10:00", "America/Bogota");
    expect(delta).not.toBeNull();
  });
});

describe("ghost agent knowledge", () => {
  it("scores similar questions highly", () => {
    expect(scoreKnowledgeMatch("ratio colbrew ghost", "ratio colbrew en ghost")).toBeGreaterThan(0.7);
  });
});

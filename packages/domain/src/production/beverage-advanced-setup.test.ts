import { describe, expect, it } from "vitest";

import {
  getBeverageAdvancedSetupProgress,
  getBeverageAdvancedSetupSpec,
  needsBeverageAdvancedSetup,
  sanitizeBeverageAdvancedSetupAnswers,
} from "./beverage-advanced-setup.js";

describe("beverage-advanced-setup", () => {
  it("detects advanced beverages by name and aliases", () => {
    expect(needsBeverageAdvancedSetup("Mocaccino")).toBe(true);
    expect(needsBeverageAdvancedSetup("OVNI")).toBe(true);
    expect(needsBeverageAdvancedSetup("Irlandés")).toBe(true);
    expect(needsBeverageAdvancedSetup("Latte")).toBe(false);
  });

  it("returns mocaccino questions", () => {
    const spec = getBeverageAdvancedSetupSpec("Mocaccino");
    expect(spec?.productKey).toBe("mocaccino");
    expect(spec?.questions.map((question) => question.id)).toEqual([
      "chocolateProduct",
      "chocolateGrams",
    ]);
  });

  it("tracks completion with conditional fields", () => {
    const incomplete = getBeverageAdvancedSetupProgress("Dirty Chai", {
      chaiConcentrateMl: "60",
      includesMilk: "yes",
    });
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.answered).toBe(2);
    expect(incomplete.total).toBe(3);

    const complete = getBeverageAdvancedSetupProgress("Dirty Chai", {
      chaiConcentrateMl: "60",
      includesMilk: "no",
    });
    expect(complete.isComplete).toBe(true);
  });

  it("sanitizes answers and drops irrelevant conditional fields", () => {
    const sanitized = sanitizeBeverageAdvancedSetupAnswers("Espresso Tonic", {
      mixerProduct: "soda-izots",
      mixerOther: "should be removed",
      mixerMl: "150",
    });

    expect(sanitized).toEqual({
      mixerProduct: "soda-izots",
      mixerMl: "150",
    });
  });
});

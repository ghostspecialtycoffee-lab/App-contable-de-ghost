import { describe, expect, it } from "vitest";

import { findBestNameMatch, findTableByReference, scoreNameMatch } from "./fuzzy-match.js";

describe("scoreNameMatch", () => {
  it("prioriza coincidencias exactas y parciales", () => {
    expect(scoreNameMatch("latte", "Latte Vainilla")).toBeGreaterThan(0.8);
    expect(scoreNameMatch("xyz", "Latte")).toBe(0);
  });
});

describe("findBestNameMatch", () => {
  it("encuentra producto por nombre parcial", () => {
    const match = findBestNameMatch("capuccino", [
      { name: "Espresso" },
      { name: "Cappuccino" },
    ]);
    expect(match?.name).toBe("Cappuccino");
  });
});

describe("findTableByReference", () => {
  it("resuelve mesa por etiqueta", () => {
    const table = findTableByReference("rincón", [
      { number: 1, label: "Terraza" },
      { number: 2, label: "Rincón" },
    ]);
    expect(table?.number).toBe(2);
  });
});

import { describe, expect, it } from "vitest";

import { validateSupplierInput } from "./supplier.js";

describe("validateSupplierInput", () => {
  it("acepta proveedor válido", () => {
    const result = validateSupplierInput({ name: "  Distritcafé  " });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Distritcafé");
    }
  });

  it("rechaza nombre corto", () => {
    const result = validateSupplierInput({ name: "A" });
    expect(result.ok).toBe(false);
  });
});

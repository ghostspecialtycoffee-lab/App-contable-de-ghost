import { describe, expect, it } from "vitest";

import {
  resolveOrganizationSlug,
  slugifyOrganizationName,
  validateOrganizationSlug,
} from "./organization.js";

describe("slugifyOrganizationName", () => {
  it("normaliza acentos y espacios", () => {
    expect(slugifyOrganizationName("Ghost Café Lab")).toBe("ghost-cafe-lab");
  });

  it("elimina caracteres inválidos", () => {
    expect(slugifyOrganizationName("  Ghost @ Coffee!!  ")).toBe("ghost-coffee");
  });
});

describe("validateOrganizationSlug", () => {
  it("rechaza slugs cortos", () => {
    const result = validateOrganizationSlug("ab");
    expect(result.ok).toBe(false);
  });

  it("acepta slugs válidos", () => {
    const result = validateOrganizationSlug("ghost-coffee");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("ghost-coffee");
    }
  });
});

describe("resolveOrganizationSlug", () => {
  it("genera slug desde el nombre cuando no se envía uno", () => {
    const result = resolveOrganizationSlug("Ghost Specialty Coffee");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("ghost-specialty-coffee");
    }
  });
});

import { describe, expect, it } from "vitest";

import {
  DEFAULT_DIGITAL_MENU_SETTINGS,
  validateDigitalMenuSettings,
} from "./organization-digital-menu-settings.js";

describe("organization digital menu settings", () => {
  it("usa valores por defecto cuando el input está vacío", () => {
    const result = validateDigitalMenuSettings({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(DEFAULT_DIGITAL_MENU_SETTINGS);
    }
  });

  it("rechaza título demasiado corto", () => {
    const result = validateDigitalMenuSettings({ heroTitle: "A" });
    expect(result.ok).toBe(false);
  });

  it("recorta textos largos", () => {
    const result = validateDigitalMenuSettings({
      heroTitle: "Menú ".repeat(30),
      heroSubtitle: "Sub ".repeat(200),
      footerNote: "Pie ".repeat(100),
      accentStyle: "minimal",
      showSearch: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.heroTitle.length).toBeLessThanOrEqual(80);
      expect(result.value.heroSubtitle.length).toBeLessThanOrEqual(240);
      expect(result.value.footerNote.length).toBeLessThanOrEqual(160);
      expect(result.value.accentStyle).toBe("minimal");
      expect(result.value.showSearch).toBe(false);
    }
  });
});

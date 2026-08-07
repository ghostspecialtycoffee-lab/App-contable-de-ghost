import { describe, expect, it } from "vitest";

import {
  findBestPlatformKnowledge,
  listPlatformKnowledgeByTag,
  PLATFORM_KNOWLEDGE_ENTRIES,
} from "./platform-knowledge.js";

describe("platform knowledge — memoria activa Ghost", () => {
  it("tiene entradas canónicas para cada subsistema", () => {
    const ids = PLATFORM_KNOWLEDGE_ENTRIES.map((entry) => entry.id);
    expect(ids).toContain("register-sale");
    expect(ids).toContain("cost-methods");
    expect(ids).toContain("workflows-whatsapp");
    expect(ids).toContain("web-search-agent");
    expect(ids.length).toBeGreaterThanOrEqual(10);
  });

  it("ejemplo: cómo registrar una venta", () => {
    const match = findBestPlatformKnowledge("¿Cómo registro una venta en mostrador?");
    expect(match).not.toBeNull();
    expect(match!.entry.id).toBe("register-sale");
    expect(match!.entry.answer).toMatch(/createSaleClient|\/pos/);
  });

  it("ejemplo: métodos de costeo FIFO", () => {
    const match = findBestPlatformKnowledge("explica fifo y costo estándar");
    expect(match?.entry.id).toBe("cost-methods");
    expect(match!.entry.answer).toMatch(/FIFO|estándar/i);
  });

  it("ejemplo: automatizaciones WhatsApp", () => {
    const match = findBestPlatformKnowledge("enviar comprobante por whatsapp automatico");
    expect(match?.entry.id).toBe("workflows-whatsapp");
    expect(match!.entry.answer).toMatch(/workflowOutbox|wa\.me/);
  });

  it("ejemplo: cuándo usar búsqueda web", () => {
    const match = findBestPlatformKnowledge("puedes buscar en internet con tavily");
    expect(match?.entry.id).toBe("web-search-agent");
    expect(match!.entry.answer).toMatch(/TAVILY|DuckDuckGo/);
  });

  it("filtra por tag inventario", () => {
    const entries = listPlatformKnowledgeByTag("inventario");
    expect(entries.some((entry) => entry.id === "lot-traceability")).toBe(true);
  });
});

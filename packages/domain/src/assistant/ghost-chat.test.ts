import { describe, expect, it } from "vitest";

import {
  createEmptyGhostChatSession,
  formatGhostChatMenu,
  ghostChatGreeting,
  GHOST_ROOT_MENU,
  isGhostChatGlobalCommand,
  resolveMenuSelection,
} from "./ghost-chat.js";

describe("ghost-chat", () => {
  it("greets with assistant name", () => {
    expect(ghostChatGreeting("Ghost Lab")).toContain("Ghost");
    expect(ghostChatGreeting("Ghost Lab")).toContain("Ghost Lab");
    expect(ghostChatGreeting("Ghost Lab")).toContain("naturalidad");
  });

  it("detects global commands", () => {
    expect(isGhostChatGlobalCommand("menu")).toBe(true);
    expect(isGhostChatGlobalCommand("AYUDA")).toBe(true);
    expect(isGhostChatGlobalCommand("latte")).toBe(false);
  });

  it("resolves menu by number or label", () => {
    const selected = resolveMenuSelection("2", GHOST_ROOT_MENU);
    expect(selected?.id).toBe("admin");

    const byLabel = resolveMenuSelection("cajero", GHOST_ROOT_MENU);
    expect(byLabel?.id).toBe("cashier");
  });

  it("creates empty session at root", () => {
    const session = createEmptyGhostChatSession();
    expect(session.flowPath).toEqual(["conversation"]);
    expect(session.role).toBeNull();
  });

  it("formats menu options", () => {
    const text = formatGhostChatMenu(GHOST_ROOT_MENU.slice(1, 2));
    expect(text).toContain("1.");
    expect(text).toContain("Financiero");
  });
});

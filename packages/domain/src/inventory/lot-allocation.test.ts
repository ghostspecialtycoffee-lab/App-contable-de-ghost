import { describe, expect, it } from "vitest";

import {
  allocateLotsFifo,
  buildInventoryLotDocId,
  generatePurchaseLotCode,
  mergeLotConsumptions,
} from "./lot-allocation.js";
import { LEGACY_LOT_CODE } from "./lot.js";

describe("lot-allocation", () => {
  it("genera código de lote desde factura de compra", () => {
    const code = generatePurchaseLotCode({
      invoiceNumber: "FC-00123",
      itemId: "item-cafe-caturra",
      lineIndex: 0,
    });

    expect(code).toMatch(/^LOT-FC00123-/);
    expect(code).toContain("-1");
  });

  it("asigna FIFO el stock más antiguo primero", () => {
    const result = allocateLotsFifo(
      [
        {
          id: "lot-b",
          lotCode: "LOT-B",
          quantityRemaining: 500,
          unitCost: 100,
          receivedAt: "2026-08-05T10:00:00.000Z",
        },
        {
          id: "lot-a",
          lotCode: "LOT-A",
          quantityRemaining: 1000,
          unitCost: 90,
          receivedAt: "2026-08-01T10:00:00.000Z",
        },
      ],
      1200,
    );

    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0]?.lotCode).toBe("LOT-A");
    expect(result.allocations[0]?.quantity).toBe(1000);
    expect(result.allocations[1]?.lotCode).toBe("LOT-B");
    expect(result.allocations[1]?.quantity).toBe(200);
    expect(result.remainingUnallocated).toBe(0);
  });

  it("usa SIN-LOTE cuando no hay lotes abiertos", () => {
    const result = allocateLotsFifo([], 300);

    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]?.lotCode).toBe(LEGACY_LOT_CODE);
    expect(result.allocations[0]?.quantity).toBe(300);
  });

  it("fusiona consumos del mismo insumo y lote", () => {
    const merged = mergeLotConsumptions([
      {
        inventoryItemId: "milk",
        itemName: "Leche",
        lotCode: "LOT-1",
        quantity: 100,
        unitCost: 10,
      },
      {
        inventoryItemId: "milk",
        itemName: "Leche",
        lotCode: "LOT-1",
        quantity: 50,
        unitCost: 20,
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.quantity).toBe(150);
    expect(merged[0]?.unitCost).toBe(13);
  });

  it("construye id estable de documento de lote", () => {
    expect(buildInventoryLotDocId("wh-1", "item-1", "LOT-ABC")).toBe(
      "wh-1_item-1_LOT-ABC",
    );
  });
});

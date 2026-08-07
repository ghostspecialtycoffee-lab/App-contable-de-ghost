import { describe, expect, it } from "vitest";

import {
  resolveEmailDeliveryConfig,
  validateEmailDeliveryConfig,
} from "./organization-email-delivery.js";

describe("validateEmailDeliveryConfig", () => {
  it("rechaza configuración incompleta", () => {
    const result = validateEmailDeliveryConfig({ publicKey: "abc" });
    expect(result.ok).toBe(false);
  });

  it("acepta configuración válida", () => {
    const result = validateEmailDeliveryConfig({
      publicKey: "pk",
      serviceId: "service_x",
      templateId: "template_y",
      replyToEmail: "hola@ghost.coffee",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.provider).toBe("emailjs");
    }
  });
});

describe("resolveEmailDeliveryConfig", () => {
  it("prioriza configuración de organización", () => {
    const orgConfig = {
      provider: "emailjs" as const,
      publicKey: "org",
      serviceId: "service_org",
      templateId: "template_org",
    };

    const envConfig = {
      provider: "emailjs" as const,
      publicKey: "env",
      serviceId: "service_env",
      templateId: "template_env",
    };

    expect(resolveEmailDeliveryConfig(orgConfig, envConfig)?.publicKey).toBe("org");
  });

  it("usa configuración de entorno si no hay org", () => {
    const envConfig = {
      provider: "emailjs" as const,
      publicKey: "env",
      serviceId: "service_env",
      templateId: "template_env",
    };

    expect(resolveEmailDeliveryConfig(undefined, envConfig)?.publicKey).toBe("env");
  });
});

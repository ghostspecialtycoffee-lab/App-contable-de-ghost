export interface OrganizationEmailDeliveryConfig {
  provider: "emailjs";
  publicKey: string;
  serviceId: string;
  templateId: string;
  replyToEmail?: string;
}

export function validateEmailDeliveryConfig(
  input: Partial<OrganizationEmailDeliveryConfig> | undefined,
): { ok: true; value: OrganizationEmailDeliveryConfig } | { ok: false; error: string } {
  const publicKey = input?.publicKey?.trim() ?? "";
  const serviceId = input?.serviceId?.trim() ?? "";
  const templateId = input?.templateId?.trim() ?? "";
  const replyToEmail = input?.replyToEmail?.trim() ?? "";

  if (!publicKey) {
    return { ok: false, error: "Falta la Public Key de EmailJS." };
  }
  if (!serviceId) {
    return { ok: false, error: "Falta el Service ID de EmailJS." };
  }
  if (!templateId) {
    return { ok: false, error: "Falta el Template ID de EmailJS." };
  }
  if (replyToEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail)) {
    return { ok: false, error: "El correo de respuesta no es válido." };
  }

  return {
    ok: true,
    value: {
      provider: "emailjs",
      publicKey,
      serviceId,
      templateId,
      replyToEmail: replyToEmail || undefined,
    },
  };
}

export function resolveEmailDeliveryConfig(
  organizationConfig: OrganizationEmailDeliveryConfig | undefined,
  envConfig?: OrganizationEmailDeliveryConfig | null,
): OrganizationEmailDeliveryConfig | null {
  if (
    organizationConfig?.publicKey &&
    organizationConfig.serviceId &&
    organizationConfig.templateId
  ) {
    return organizationConfig;
  }

  if (envConfig?.publicKey && envConfig.serviceId && envConfig.templateId) {
    return envConfig;
  }

  return null;
}

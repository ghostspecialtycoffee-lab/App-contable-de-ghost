import type { OrganizationEmailDeliveryConfig } from "@ghost/domain";

export function getEmailDeliveryConfigFromEnv(): OrganizationEmailDeliveryConfig | null {
  const publicKey = readEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY");
  const serviceId = readEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID");
  const templateId = readEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID");

  if (!publicKey || !serviceId || !templateId) {
    return null;
  }

  return {
    provider: "emailjs",
    publicKey,
    serviceId,
    templateId,
    replyToEmail: readEnv("NEXT_PUBLIC_EMAILJS_REPLY_TO") || undefined,
  };
}

function readEnv(key: string): string {
  return String(process.env[key] ?? "").trim();
}

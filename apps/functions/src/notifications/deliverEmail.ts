import * as logger from "firebase-functions/logger";

export interface EmailDeliveryResult {
  ok: boolean;
  provider: "resend" | "log_only";
  errorMessage?: string;
}

export async function deliverEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.GHOST_NOTIFICATION_FROM_EMAIL?.trim() || "Ghost Contable <onboarding@resend.dev>";

  if (!apiKey) {
    logger.warn("RESEND_API_KEY no configurada — correo solo en bitácora", {
      to: input.to,
      subject: input.subject,
      preview: input.text.slice(0, 240),
    });
    return { ok: true, provider: "log_only" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html ?? undefined,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        ok: false,
        provider: "resend",
        errorMessage: `Resend ${response.status}: ${body.slice(0, 200)}`,
      };
    }

    return { ok: true, provider: "resend" };
  } catch (cause) {
    return {
      ok: false,
      provider: "resend",
      errorMessage: cause instanceof Error ? cause.message : "Error enviando correo",
    };
  }
}

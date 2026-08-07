import {
  buildSaleDocumentHtml,
  buildSaleDocumentPlainText,
  buildSaleDocumentSubject,
  type OrganizationEmailDeliveryConfig,
  type SaleDocumentInput,
} from "@ghost/domain";

const EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send";

export interface SendEmailJsResult {
  ok: boolean;
  errorMessage?: string;
}

export async function sendEmailViaEmailJs(input: {
  config: OrganizationEmailDeliveryConfig;
  to: string;
  document: SaleDocumentInput;
  replyToEmail?: string;
}): Promise<SendEmailJsResult> {
  const subject = buildSaleDocumentSubject(input.document);
  const message = buildSaleDocumentPlainText(input.document);
  const messageHtml = buildSaleDocumentHtml(input.document);
  const replyTo = input.replyToEmail ?? input.config.replyToEmail ?? "";

  try {
    const response = await fetch(EMAILJS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lib_version: "4.0.0",
        user_id: input.config.publicKey,
        service_id: input.config.serviceId,
        template_id: input.config.templateId,
        template_params: {
          to_email: input.to,
          subject,
          message,
          message_html: messageHtml,
          from_name: input.document.organizationName,
          reply_to: replyTo,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        ok: false,
        errorMessage: `EmailJS ${response.status}: ${body.slice(0, 200)}`,
      };
    }

    return { ok: true };
  } catch (cause) {
    return {
      ok: false,
      errorMessage: cause instanceof Error ? cause.message : "Error enviando correo",
    };
  }
}

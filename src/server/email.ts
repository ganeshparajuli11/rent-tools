import "server-only";

import { Resend } from "resend";

import { getServerEnv } from "./env";

/**
 * Sending email through Resend. Server only: it reads RESEND_API_KEY.
 *
 * With no RESEND_API_KEY or no EMAIL_FROM, nothing is sent and
 * `sendEmail` says so ("not-configured"). It never throws for a failed
 * send; the caller decides what to do. Logs never include addresses or
 * email content.
 */

export type EmailMessage = {
  to: string[];
  subject: string;
  text: string;
  html: string;
  /**
   * Resend refuses a second email with the same key within 24 hours, so a
   * job that runs twice by mistake still sends once.
   */
  idempotencyKey: string;
};

export type SendResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "not-configured" | "failed" };

let client: Resend | undefined;

/** True when both the API key and the sender address are set. */
export function isEmailConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const { RESEND_API_KEY, EMAIL_FROM } = getServerEnv();
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    return { sent: false, reason: "not-configured" };
  }

  client ??= new Resend(RESEND_API_KEY);
  try {
    const { data, error } = await client.emails.send(
      {
        from: EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      },
      { idempotencyKey: message.idempotencyKey },
    );
    if (error) {
      console.error("[email] send failed", { name: error.name });
      return { sent: false, reason: "failed" };
    }
    return { sent: true, id: data?.id ?? null };
  } catch {
    console.error("[email] send failed", { name: "exception" });
    return { sent: false, reason: "failed" };
  }
}

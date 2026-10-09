import { env } from "../env";
import { logger } from "../logger";
import { createTransport, type MailMessage, type MailTransport } from "./transports";

export type { MailMessage } from "./transports";
export * from "./templates";

let transport: MailTransport | undefined;

function getTransport(): MailTransport {
  if (transport) return transport;
  const e = env();
  const from = e.MAIL_FROM ?? "DevOps Tutor <no-reply@localhost>";
  transport =
    e.MAIL_TRANSPORT === "ses"
      ? createTransport({ kind: "ses", from, region: e.AWS_REGION! })
      : e.MAIL_TRANSPORT === "file"
        ? createTransport({ kind: "file", from, dir: e.MAIL_FILE_DIR })
        : createTransport({ kind: "log", from, log: logger.info });
  return transport;
}

/** Sends one email through the configured transport (MAIL_TRANSPORT). */
export async function sendMail(message: MailMessage): Promise<void> {
  await getTransport().send(message);
  logger.info("email sent", { to: message.to, subject: message.subject, transport: env().MAIL_TRANSPORT });
}

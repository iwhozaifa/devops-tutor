import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

type SesLike = Pick<SESv2Client, "send"> | { send: (command: SendEmailCommand) => Promise<unknown> };

export type TransportConfig =
  // Production: Amazon SES (credentials from the EC2 instance role)
  | { kind: "ses"; from: string; region: string; sesClient?: SesLike }
  // E2E tests: one JSON file per message, read back by the test
  | { kind: "file"; from: string; dir: string }
  // Development: log instead of sending
  | { kind: "log"; from: string; log: (msg: string, fields: Record<string, unknown>) => void };

export function createTransport(config: TransportConfig): MailTransport {
  switch (config.kind) {
    case "ses": {
      const client = config.sesClient ?? new SESv2Client({ region: config.region });
      return {
        async send(m) {
          await client.send(
            new SendEmailCommand({
              FromEmailAddress: config.from,
              Destination: { ToAddresses: [m.to] },
              Content: {
                Simple: {
                  Subject: { Data: m.subject, Charset: "UTF-8" },
                  Body: {
                    Text: { Data: m.text, Charset: "UTF-8" },
                    Html: { Data: m.html, Charset: "UTF-8" },
                  },
                },
              },
            })
          );
        },
      };
    }
    case "file":
      return {
        async send(m) {
          mkdirSync(config.dir, { recursive: true });
          const name = `${Date.now()}-${randomUUID()}.json`;
          writeFileSync(
            path.join(config.dir, name),
            JSON.stringify({ from: config.from, ...m, sentAt: new Date().toISOString() }, null, 2)
          );
        },
      };
    case "log":
      return {
        async send(m) {
          config.log("email (log transport)", { from: config.from, to: m.to, subject: m.subject, text: m.text });
        },
      };
  }
}

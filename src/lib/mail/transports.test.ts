import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { createTransport } from "./transports";

const message = {
  to: "learner@example.test",
  subject: "Subject",
  text: "Plain body",
  html: "<p>HTML body</p>",
};

describe("mail transports", () => {
  it("ses: sends one SendEmailCommand with sender, recipient and both bodies", async () => {
    const send = vi.fn().mockResolvedValue({ MessageId: "1" });
    const transport = createTransport({ kind: "ses", from: "DevOps Tutor <no-reply@example.test>", region: "eu-west-1", sesClient: { send } });

    await transport.send(message);

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command.input).toEqual({
      FromEmailAddress: "DevOps Tutor <no-reply@example.test>",
      Destination: { ToAddresses: ["learner@example.test"] },
      Content: {
        Simple: {
          Subject: { Data: "Subject", Charset: "UTF-8" },
          Body: {
            Text: { Data: "Plain body", Charset: "UTF-8" },
            Html: { Data: "<p>HTML body</p>", Charset: "UTF-8" },
          },
        },
      },
    });
  });

  it("ses: surfaces delivery failures to the caller", async () => {
    const send = vi.fn().mockRejectedValue(new Error("MessageRejected"));
    const transport = createTransport({ kind: "ses", from: "a@example.test", region: "eu-west-1", sesClient: { send } });
    await expect(transport.send(message)).rejects.toThrow("MessageRejected");
  });

  it("file: writes each message as JSON into the outbox directory", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "outbox-"));
    const transport = createTransport({ kind: "file", from: "a@example.test", dir });

    await transport.send(message);
    await transport.send({ ...message, to: "other@example.test" });

    const files = readdirSync(dir).sort();
    expect(files).toHaveLength(2);
    const first = JSON.parse(readFileSync(path.join(dir, files[0]), "utf8"));
    expect(first).toMatchObject({ from: "a@example.test", ...message });
  });

  it("log: logs recipient and subject without throwing", async () => {
    const log = vi.fn();
    const transport = createTransport({ kind: "log", from: "a@example.test", log });
    await transport.send(message);
    expect(log).toHaveBeenCalledWith(
      "email (log transport)",
      expect.objectContaining({ to: "learner@example.test", subject: "Subject" })
    );
  });
});

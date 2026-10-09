export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function layout(heading: string, paragraphs: string[], action: { label: string; url: string }) {
  const url = escapeHtml(action.url);
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:system-ui,-apple-system,sans-serif;color:#111">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h1>
    ${paragraphs.map((p) => `<p style="line-height:1.5;margin:0 0 16px">${escapeHtml(p)}</p>`).join("\n    ")}
    <p style="margin:24px 0"><a href="${url}" style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${escapeHtml(action.label)}</a></p>
    <p style="font-size:12px;color:#666;line-height:1.5">If the button does not work, open this link:<br>${url}</p>
  </div>
</body></html>`;
}

const greeting = (name: string | null | undefined) => `Hi ${name?.trim() || "there"},`;

export function verificationEmail({ name, url }: { name?: string | null; url: string }): RenderedEmail {
  const lines = [
    greeting(name),
    "Confirm your email address to finish setting up your DevOps Tutor account. The link is valid for 24 hours.",
    "If you did not create an account, you can ignore this email.",
  ];
  return {
    subject: "Confirm your email for DevOps Tutor",
    text: `${lines[0]}\n\n${lines[1]}\n\n${url}\n\n${lines[2]}\n`,
    html: layout("Confirm your email", lines, { label: "Confirm email", url }),
  };
}

export function passwordResetEmail({ name, url }: { name?: string | null; url: string }): RenderedEmail {
  const lines = [
    greeting(name),
    "Someone asked to reset the password for your DevOps Tutor account. The link is valid for 1 hour and works once.",
    "If this was not you, ignore this email; your password stays the same.",
  ];
  return {
    subject: "Reset your DevOps Tutor password",
    text: `${lines[0]}\n\n${lines[1]}\n\n${url}\n\n${lines[2]}\n`,
    html: layout("Reset your password", lines, { label: "Choose a new password", url }),
  };
}

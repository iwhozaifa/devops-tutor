import { describe, expect, it } from "vitest";
import { passwordResetEmail, verificationEmail } from "./templates";

describe("email templates", () => {
  it("renders the verification email with the link in text and HTML", () => {
    const mail = verificationEmail({ name: "Ada", url: "https://app.example/verify-email?token=abc" });
    expect(mail.subject).toBe("Confirm your email for DevOps Tutor");
    expect(mail.text).toContain("https://app.example/verify-email?token=abc");
    expect(mail.html).toContain('href="https://app.example/verify-email?token=abc"');
    expect(mail.text).toContain("Hi Ada");
  });

  it("renders the password reset email with its expiry", () => {
    const mail = passwordResetEmail({ name: null, url: "https://app.example/reset-password?token=xyz" });
    expect(mail.subject).toBe("Reset your DevOps Tutor password");
    expect(mail.text).toContain("https://app.example/reset-password?token=xyz");
    expect(mail.text).toContain("1 hour");
    expect(mail.text).toContain("Hi there");
  });

  it("escapes user-controlled values in HTML", () => {
    const mail = verificationEmail({
      name: '<script>alert("x")</script>',
      url: 'https://app.example/verify-email?token=a&b="c"',
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).toContain("token=a&amp;b=&quot;c&quot;");
  });
});

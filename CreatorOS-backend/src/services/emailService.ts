import nodemailer from "nodemailer";

export type OtpEmailSender = (input: {
  to: string;
  code: string;
}) => Promise<void>;

export type EmailProvider = "smtp" | "brevo" | "resend";

const SUBJECT = "Your CreatorOS verification code";

const otpEmailHtml = (code: string) => `
  <div style="margin:0;padding:32px 16px;background:#0b1020;color:#ffffff;font-family:Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;padding:32px;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(255,255,255,.05)">
      <p style="margin:0 0 20px;color:#c4b5fd;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">CreatorOS</p>
      <h1 style="margin:0 0 12px;font-size:28px">Your verification code</h1>
      <p style="margin:0;color:#cbd5e1;line-height:1.6">Use this code to securely sign in to CreatorOS.</p>
      <div style="margin:28px 0;padding:18px;border-radius:14px;background:#7c3aed;color:#fff;font-size:32px;font-weight:700;letter-spacing:.28em;text-align:center">${code}</div>
      <p style="margin:0;color:#cbd5e1;line-height:1.6">This code expires in 5 minutes. Do not share it with anyone.</p>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;line-height:1.5">If you did not request this code, you can safely ignore this email.</p>
    </div>
  </div>`;

const otpEmailText = (code: string) =>
  `CreatorOS verification code: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone. If you did not request this code, you can safely ignore this email.`;

/* ---------------------------- provider config ---------------------------- */

const smtpConfig = () => {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  if (!user || !rawPass) return null;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;

  return {
    host,
    port,
    secure,
    user,
    // Google shows app passwords as "abcd efgh ijkl mnop"; the spaces are not part of it.
    pass: rawPass.replace(/\s+/g, ""),
    from: process.env.SMTP_FROM || `CreatorOS <${user}>`
  };
};

const brevoConfigured = () => Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
const resendConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);

/** Which provider will be used, or null when no email delivery is configured. */
export const getEmailProvider = (): EmailProvider | null => {
  const forced = process.env.EMAIL_PROVIDER?.toLowerCase();

  if (forced === "smtp") return smtpConfig() ? "smtp" : null;
  if (forced === "brevo") return brevoConfigured() ? "brevo" : null;
  if (forced === "resend") return resendConfigured() ? "resend" : null;

  if (brevoConfigured()) return "brevo";
  if (resendConfigured()) return "resend";
  if (smtpConfig()) return "smtp";
  return null;
};

/** OTP login is available only when a provider is configured and it has not been switched off. */
export const isOtpEnabled = () => process.env.OTP_ENABLED !== "false" && getEmailProvider() !== null;

/* ------------------------------- senders -------------------------------- */

const sendViaSmtp: OtpEmailSender = async ({ to, code }) => {
  const config = smtpConfig();
  if (!config) throw new Error("SMTP is not configured");

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    // Fail fast: some hosts (e.g. Render free tier) silently block SMTP ports.
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject: SUBJECT,
    html: otpEmailHtml(code),
    text: otpEmailText(code)
  });
};

const sendViaBrevo: OtpEmailSender = async ({ to, code }) => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY as string,
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || "CreatorOS",
        email: process.env.BREVO_SENDER_EMAIL
      },
      to: [{ email: to }],
      subject: SUBJECT,
      htmlContent: otpEmailHtml(code),
      textContent: otpEmailText(code)
    }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(`Brevo rejected the request (${response.status}): ${await response.text()}`);
  }
};

const sendViaResend: OtpEmailSender = async ({ to, code }) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject: SUBJECT,
      html: otpEmailHtml(code),
      text: otpEmailText(code)
    }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(`Resend rejected the request (${response.status}): ${await response.text()}`);
  }
};

export const sendOtpEmail: OtpEmailSender = async (input) => {
  const provider = getEmailProvider();

  try {
    if (provider === "brevo") return await sendViaBrevo(input);
    if (provider === "resend") return await sendViaResend(input);
    if (provider === "smtp") return await sendViaSmtp(input);
    throw new Error("No email provider is configured");
  } catch (error) {
    // The real reason goes to the server log only; the API returns a generic message.
    console.error(`[otp] email send failed via ${provider ?? "none"}:`, error);
    throw error;
  }
};

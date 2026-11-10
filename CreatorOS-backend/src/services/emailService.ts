import { Resend } from "resend";

export type OtpEmailSender = (input: {
  to: string;
  code: string;
}) => Promise<void>;

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

export const sendOtpEmail: OtpEmailSender = async ({ to, code }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Email delivery is not configured");
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to,
    subject: "Your CreatorOS verification code",
    html: otpEmailHtml(code),
    text: `CreatorOS verification code: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone. If you did not request this code, you can safely ignore this email.`
  });

  if (result.error) {
    throw new Error("Email delivery provider rejected the request");
  }
};

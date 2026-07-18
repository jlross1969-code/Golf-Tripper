import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface InviteEmailParams {
  toName: string;
  toEmail: string;
  tripName: string;
  tripDates: string;
  startingHandicap: number;
  inviteUrl: string;
  adminName?: string;
}

/**
 * Send a personalised invite email to a player using Resend.
 * Falls back gracefully if RESEND_API_KEY is not set.
 */
export async function sendInviteEmail(params: InviteEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email send");
    return { success: false, error: "Email service not configured" };
  }

  const { toName, toEmail, tripName, tripDates, startingHandicap, inviteUrl, adminName } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to ${tripName}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a1a0a;font-family:'Segoe UI',Arial,sans-serif;color:#e8f5e9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a1a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#0d2b0d;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;border-bottom:2px solid #1a4d1a;">
              <div style="font-size:40px;margin-bottom:8px;">⛳</div>
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#4ade80;">Golf Trip App</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#86efac;">Competitive Golf Trip Management</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#0f1f0f;padding:40px;border-radius:0 0 12px 12px;">
              <h2 style="margin:0 0 8px;font-size:22px;color:#f0fdf4;">
                Hey ${toName} 👋
              </h2>
              <p style="margin:0 0 24px;font-size:16px;color:#bbf7d0;line-height:1.6;">
                ${adminName ? `<strong>${adminName}</strong> has` : "You've been"} invited you to join <strong style="color:#4ade80;">${tripName}</strong> on Golf Trip App.
              </p>

              <!-- Trip Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d2b0d;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#86efac;width:140px;">📅 Trip Dates</td>
                        <td style="padding:6px 0;font-size:14px;color:#f0fdf4;font-weight:600;">${tripDates}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#86efac;">🏌️ Your Handicap</td>
                        <td style="padding:6px 0;font-size:14px;color:#f0fdf4;font-weight:600;">${startingHandicap}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}"
                       style="display:inline-block;background-color:#16a34a;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:8px;letter-spacing:0.5px;">
                      Join the Trip →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-align:center;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 28px;font-size:12px;color:#4ade80;text-align:center;word-break:break-all;">
                ${inviteUrl}
              </p>

              <hr style="border:none;border-top:1px solid #1a4d1a;margin:0 0 24px;" />

              <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;line-height:1.6;">
                This invite link is personal to you. If you didn't expect this email, you can safely ignore it.<br/>
                The link will expire after it is used.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#374151;">
                Golf Trip App &mdash; Competitive Golf Trip Management
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Hey ${toName},

${adminName ? `${adminName} has` : "You've been"} invited you to join ${tripName} on Golf Trip App.

Trip Dates: ${tripDates}
Your Starting Handicap: ${startingHandicap}

Join the trip here:
${inviteUrl}

This invite link is personal to you. If you didn't expect this email, you can safely ignore it.

— Golf Trip App
`;

  try {
    const result = await resend.emails.send({
      from: "Golf Trip App <onboarding@resend.dev>",
      to: toEmail,
      subject: `You're invited to ${tripName} ⛳`,
      html,
      text,
    });

    if (result.error) {
      console.error("[Email] Resend error:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[Email] Invite sent to", toEmail, "id:", result.data?.id);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Email] Failed to send invite:", message);
    return { success: false, error: message };
  }
}

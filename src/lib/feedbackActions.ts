"use server";

import { Resend } from "resend";

export type FeedbackFormState = { error: string | null; success?: boolean };

const FEEDBACK_RECIPIENT = "michelleepak@gmail.com";

export async function submitFeedback(
  _prevState: FeedbackFormState | null,
  formData: FormData,
): Promise<FeedbackFormState> {
  const type = String(formData.get("type") ?? "bug") === "feature" ? "feature" : "bug";
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const page = String(formData.get("page") ?? "");
  const userAgent = String(formData.get("userAgent") ?? "");
  const screenSize = String(formData.get("screenSize") ?? "");
  const screenshot = formData.get("screenshot");

  if (!description) {
    return { error: "Please describe what happened." };
  }
  if (type === "bug" && !category) {
    return { error: "Please pick a category." };
  }

  if (!process.env.RESEND_API_KEY) {
    return {
      error:
        "Feedback can't be sent yet -- RESEND_API_KEY isn't set up in the deployment.",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const attachments: { filename: string; content: Buffer }[] = [];
  if (screenshot instanceof File && screenshot.size > 0) {
    const buffer = Buffer.from(await screenshot.arrayBuffer());
    attachments.push({ filename: screenshot.name || "screenshot.png", content: buffer });
  }

  const subject =
    type === "bug"
      ? `DojoPrizes bug report: ${category || "Uncategorized"}`
      : "DojoPrizes feature request";

  const html = `
    <p><strong>${type === "bug" ? "Bug report" : "Feature request"}</strong></p>
    ${name ? `<p><strong>From:</strong> ${escapeHtml(name)}</p>` : ""}
    ${category ? `<p><strong>Category:</strong> ${escapeHtml(category)}</p>` : ""}
    <p><strong>Description:</strong><br/>${escapeHtml(description).replace(/\n/g, "<br/>")}</p>
    <hr/>
    <p style="color:#888;font-size:12px;">
      Page: ${escapeHtml(page)}<br/>
      Browser: ${escapeHtml(userAgent)}<br/>
      Screen: ${escapeHtml(screenSize)}
    </p>
  `;

  try {
    await resend.emails.send({
      from: "DojoPrizes <onboarding@resend.dev>",
      to: FEEDBACK_RECIPIENT,
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    return { error: null, success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Something went wrong sending this.",
    };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const DEFAULT_MAILGUN_BASE_URL = "https://api.mailgun.net";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export type OrderEmailItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export async function sendOrderConfirmation(input: {
  to: string;
  orderId: string;
  total: number;
  currency: string;
  shippingName: string;
  items: OrderEmailItem[];
}) {
  const apiKey = requiredEnv("MAILGUN_API_KEY");
  const domain = requiredEnv("MAILGUN_DOMAIN");
  const from = requiredEnv("MAILGUN_FROM");
  const baseUrl = (process.env.MAILGUN_API_BASE_URL || DEFAULT_MAILGUN_BASE_URL).replace(/\/$/, "");

  const itemText = input.items
    .map(
      (item) =>
        `- ${item.name} x${item.quantity}: ${input.currency} ${item.lineTotal.toFixed(2)}`,
    )
    .join("\n");

  const itemHtml = input.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(item.name)} × ${item.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(input.currency)} ${item.lineTotal.toFixed(2)}</td></tr>`,
    )
    .join("");

  const text = [
    `Hi ${input.shippingName},`,
    "",
    "Thanks for your order from Nova Store.",
    `Order #${input.orderId.slice(0, 8)}`,
    "",
    itemText,
    "",
    `Total: ${input.currency} ${input.total.toFixed(2)}`,
    "",
    "We'll keep you updated as your order moves forward.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:32px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#171717;">
    <div style="max-width:600px;margin:0 auto;background:#fff;padding:32px;">
      <p style="font-size:11px;font-weight:700;letter-spacing:.16em;color:#6b6b66;">NOVA STORE</p>
      <h1 style="font-size:32px;line-height:1.05;margin:0 0 16px;">Order confirmed.</h1>
      <p>Hi ${escapeHtml(input.shippingName)},</p>
      <p>Thanks for your order. Here is your order summary.</p>
      <p><strong>Order #${escapeHtml(input.orderId.slice(0, 8))}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        <tbody>${itemHtml}</tbody>
      </table>
      <p style="font-size:18px;"><strong>Total: ${escapeHtml(input.currency)} ${input.total.toFixed(2)}</strong></p>
      <p style="color:#6b6b66;">We'll keep you updated as your order moves forward.</p>
    </div>
  </body>
</html>`;

  const form = new FormData();
  form.set("from", from);
  form.set("to", input.to);
  form.set("subject", `Nova Store order #${input.orderId.slice(0, 8)} confirmed`);
  form.set("text", text);
  form.set("html", html);

  const response = await fetch(
    `${baseUrl}/v3/${encodeURIComponent(domain)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      },
      body: form,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Mailgun request failed (${response.status}): ${detail.slice(0, 500)}`);
  }

  return (await response.json()) as { id?: string; message?: string };
}

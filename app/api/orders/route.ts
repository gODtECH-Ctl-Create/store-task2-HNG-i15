import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/mailgun";

type CheckoutBody = { name?: string; address?: string; city?: string; state?: string; postalCode?: string; country?: string };

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return Response.json({ error: "Authentication required" }, { status: 401 });

  let body: CheckoutBody;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const name = body.name?.trim();
  const address = body.address?.trim();
  const city = body.city?.trim();
  const state = body.state?.trim() || null;
  const postalCode = body.postalCode?.trim() || null;
  const country = body.country?.trim();

  if (!name || name.length > 120 || !address || address.length > 300 || !city || city.length > 120 || !country || country.length > 120) {
    return Response.json({ error: "Please provide valid shipping details." }, { status: 400 });
  }

  const rows = await sql`
    WITH cart AS (
      SELECT id AS cart_id, user_id
      FROM carts
      WHERE user_id = ${session.user.id} AND status = 'open'
      ORDER BY created_at DESC
      LIMIT 1
    ),
    lines AS (
      SELECT c.cart_id, ci.product_id, ci.quantity, p.name, p.price, p.stock, p.active
      FROM cart c
      JOIN cart_items ci ON ci.cart_id = c.cart_id
      JOIN products p ON p.id = ci.product_id
      WHERE p.active = true
      FOR UPDATE OF p
    ),
    valid AS (
      SELECT c.cart_id, c.user_id, SUM(l.price * l.quantity) AS subtotal
      FROM cart c
      JOIN lines l ON l.cart_id = c.cart_id
      WHERE l.active = true AND l.stock >= l.quantity
      GROUP BY c.cart_id, c.user_id
      HAVING COUNT(*) = (SELECT COUNT(*) FROM cart_items ci WHERE ci.cart_id = c.cart_id)
    ),
    new_order AS (
      INSERT INTO orders (user_id, status, subtotal, shipping, total, currency, customer_email, shipping_name, shipping_address, shipping_city, shipping_state, shipping_postal_code, shipping_country)
      SELECT user_id, 'confirmed', subtotal, 0, subtotal, 'USD', ${session.user.email}, ${name}, ${address}, ${city}, ${state}, ${postalCode}, ${country}
      FROM valid
      RETURNING id, total, currency, user_id, (SELECT cart_id FROM valid LIMIT 1) AS cart_id
    ),
    inserted_items AS (
      INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
      SELECT o.id, l.product_id, l.name, l.price, l.quantity, l.price * l.quantity
      FROM new_order o
      JOIN lines l ON l.cart_id = o.cart_id
      RETURNING order_id
    ),
    decremented_stock AS (
      UPDATE products p
      SET stock = p.stock - l.quantity, updated_at = NOW()
      FROM new_order o
      JOIN lines l ON l.cart_id = o.cart_id
      WHERE p.id = l.product_id
      RETURNING p.id
    ),
    converted_cart AS (
      UPDATE carts c
      SET status = 'converted', updated_at = NOW()
      FROM new_order o
      WHERE c.id = o.cart_id
      RETURNING c.id
    )
    SELECT id, total::text, currency FROM new_order
  `;

  if (rows.length === 0) return Response.json({ error: "Your cart is empty or an item is no longer available." }, { status: 409 });

  const order = rows[0] as { id: string; total: string; currency: string };
  const emailItems = await sql`
    SELECT product_name AS name, quantity, unit_price::text, line_total::text
    FROM order_items
    WHERE order_id = ${order.id}
    ORDER BY created_at ASC
  `;

  let emailSent = false;

  try {
    const result = await sendOrderConfirmation({
      to: session.user.email,
      orderId: order.id,
      total: Number(order.total),
      currency: order.currency,
      shippingName: name,
      items: emailItems.map((item) => ({
        name: String(item.name),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
      })),
    });

    await sql`UPDATE orders SET mailgun_sent_at = NOW(), updated_at = NOW() WHERE id = ${order.id} AND user_id = ${session.user.id}`;
    emailSent = true;
    return Response.json({ id: order.id, total: Number(order.total), currency: order.currency, emailSent, messageId: result.id ?? null }, { status: 201 });
  } catch (error) {
    console.error("Order confirmation email failed", error);
    return Response.json({ id: order.id, total: Number(order.total), currency: order.currency, emailSent: false }, { status: 201 });
  }
}

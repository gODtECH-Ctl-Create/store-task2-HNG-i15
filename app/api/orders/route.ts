import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

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

  const rows = await sql`INSERT INTO orders (user_id, status, subtotal, shipping, total, currency, customer_email, shipping_name, shipping_address, shipping_city, shipping_state, shipping_postal_code, shipping_country) SELECT c.user_id, 'confirmed', SUM(p.price * ci.quantity), 0, SUM(p.price * ci.quantity), 'USD', ${session.user.email}, ${name}, ${address}, ${city}, ${state}, ${postalCode}, ${country} FROM carts c JOIN cart_items ci ON ci.cart_id = c.id JOIN products p ON p.id = ci.product_id WHERE c.user_id = ${session.user.id} AND c.status = 'open' AND p.active = true AND p.stock >= ci.quantity GROUP BY c.id, c.user_id HAVING COUNT(*) = (SELECT COUNT(*) FROM cart_items all_items WHERE all_items.cart_id = c.id) RETURNING id, total::text, currency`;

  if (rows.length === 0) return Response.json({ error: "Your cart is empty or an item is unavailable." }, { status: 409 });
  const order = rows[0] as { id: string; total: string; currency: string };
  return Response.json({ id: order.id, total: Number(order.total), currency: order.currency }, { status: 201 });
}

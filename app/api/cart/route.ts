import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

type CartBody = { productId?: string; quantity?: number };

async function getUserId() {
  const { data: session } = await auth.getSession();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Authentication required" }, { status: 401 });

  const items = await sql`SELECT ci.product_id, ci.quantity, p.name, p.description, p.price::text, p.currency, p.image_url, p.stock FROM carts c JOIN cart_items ci ON ci.cart_id = c.id JOIN products p ON p.id = ci.product_id WHERE c.user_id = ${userId} AND c.status = 'open' ORDER BY ci.created_at ASC`;
  return Response.json(items);
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Authentication required" }, { status: 401 });

  let body: CartBody;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { productId, quantity = 1 } = body;
  if (typeof productId !== "string" || !/^[0-9a-fA-F-]{36}$/.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return Response.json({ error: "Invalid product or quantity" }, { status: 400 });
  }

  const rows = await sql`WITH cart AS (
    INSERT INTO carts (user_id, status) VALUES (${userId}, 'open')
    ON CONFLICT (user_id) WHERE status = 'open' DO UPDATE SET updated_at = NOW() RETURNING id
  ), product AS (
    SELECT id, stock FROM products WHERE id = ${productId} AND active = true AND stock > 0
  ), item AS (
    INSERT INTO cart_items (cart_id, product_id, quantity)
    SELECT cart.id, product.id, LEAST(${quantity}, product.stock) FROM cart CROSS JOIN product
    ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, (SELECT stock FROM products p WHERE p.id = EXCLUDED.product_id)), updated_at = NOW()
    RETURNING product_id, quantity
  )
  SELECT item.product_id, item.quantity, p.name, p.description, p.price::text, p.currency, p.image_url, p.stock
  FROM item JOIN products p ON p.id = item.product_id`;

  if (rows.length === 0) return Response.json({ error: "Product not found or out of stock" }, { status: 404 });
  return Response.json(rows[0], { status: 201 });
}

export async function PATCH(request: Request) {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Authentication required" }, { status: 401 });

  let body: CartBody;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const { productId, quantity } = body;

  if (typeof productId !== "string" || !/^[0-9a-fA-F-]{36}$/.test(productId) || !Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
    return Response.json({ error: "Invalid product or quantity" }, { status: 400 });
  }

  if (quantity === 0) {
    await sql`DELETE FROM cart_items ci USING carts c WHERE ci.cart_id = c.id AND ci.product_id = ${productId} AND c.user_id = ${userId} AND c.status = 'open'`;
    return new Response(null, { status: 204 });
  }

  const rows = await sql`UPDATE cart_items ci SET quantity = LEAST(${quantity}, p.stock), updated_at = NOW() FROM carts c JOIN products p ON p.id = ci.product_id WHERE ci.cart_id = c.id AND ci.product_id = ${productId} AND c.user_id = ${userId} AND c.status = 'open' AND p.active = true AND p.stock > 0 RETURNING ci.product_id, ci.quantity, p.name, p.price::text, p.currency, p.image_url, p.stock`;
  if (rows.length === 0) return Response.json({ error: "Cart item not found" }, { status: 404 });
  return Response.json(rows[0]);
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Authentication required" }, { status: 401 });
  let body: CartBody;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const { productId } = body;
  if (typeof productId !== "string" || !/^[0-9a-fA-F-]{36}$/.test(productId)) return Response.json({ error: "Invalid product" }, { status: 400 });
  await sql`DELETE FROM cart_items ci USING carts c WHERE ci.cart_id = c.id AND ci.product_id = ${productId} AND c.user_id = ${userId} AND c.status = 'open'`;
  return new Response(null, { status: 204 });
}

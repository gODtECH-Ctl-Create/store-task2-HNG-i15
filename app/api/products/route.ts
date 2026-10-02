import { sql } from "@/lib/db";

export async function GET() {
  const products = await sql`
    SELECT
      id,
      slug,
      name,
      description,
      price,
      currency,
      image_url,
      stock
    FROM products
    WHERE active = true
      AND stock > 0
    ORDER BY created_at DESC
  `;

  return Response.json(products);
}

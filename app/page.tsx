import Storefront from "@/components/storefront";
import { sql } from "@/lib/db";

type Product = {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  image_url: string | null;
  stock: number;
};

export default async function Home() {
  const products = (await sql`
    SELECT
      id,
      name,
      description,
      price::text,
      currency,
      image_url,
      stock
    FROM products
    WHERE active = true
      AND stock > 0
    ORDER BY created_at DESC
  `) as Product[];

  return <Storefront products={products} />;
}

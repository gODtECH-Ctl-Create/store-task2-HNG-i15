import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import CheckoutForm from "@/components/checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in?callbackURL=%2Fcheckout");

  const items = await sql`
    SELECT ci.product_id, ci.quantity, p.name, p.price::text, p.currency, p.stock
    FROM carts c
    JOIN cart_items ci ON ci.cart_id = c.id
    JOIN products p ON p.id = ci.product_id
    WHERE c.user_id = ${session.user.id} AND c.status = 'open'
    ORDER BY ci.created_at ASC
  `;

  if (items.length === 0) {
    return (
      <main className="checkout-page">
        <div className="checkout-empty">
          <p className="eyebrow">CHECKOUT</p>
          <h1>Your cart is empty.</h1>
          <p>Add something to your cart before checking out.</p>
          <Link className="checkout-secondary" href="/">Back to store</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-heading">
        <Link href="/" className="back-link">← Store</Link>
        <p className="eyebrow">CHECKOUT</p>
        <h1>Complete your order.</h1>
        <p>Signed in as {session.user.email}</p>
      </div>
      <CheckoutForm email={session.user.email} items={items.map((item) => ({ ...item, price: Number(item.price) }))} />
    </main>
  );
}

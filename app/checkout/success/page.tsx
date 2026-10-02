import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccess({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return notFound();
  const params = await searchParams;
  if (!params.order) return notFound();

  const rows = await sql`SELECT id, total::text, currency, customer_email, mailgun_sent_at FROM orders WHERE id = ${params.order} AND user_id = ${session.user.id} LIMIT 1`;
  if (rows.length === 0) return notFound();
  const order = rows[0] as { id: string; total: string; currency: string; customer_email: string; mailgun_sent_at: string | null };

  return <main className="checkout-page"><div className="checkout-success"><p className="eyebrow">ORDER CONFIRMED</p><h1>Thank you for your order.</h1><p>Order <strong>#{order.id.slice(0, 8)}</strong> was created successfully.</p><p>Total: <strong>{order.currency} {Number(order.total).toFixed(2)}</strong></p><p>Your order is recorded for {order.customer_email}. Email confirmation will be added with the Mailgun integration.</p><Link className="checkout-primary inline-button" href="/">Continue shopping</Link></div></main>;
}

"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  product_id: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  stock: number;
};

export default function CheckoutForm({ email, items }: { email: string; items: Item[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", address: "", city: "", state: "", postalCode: "", country: "Nigeria" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error ?? "Unable to create the order."); return; }
      router.push(`/checkout/success?order=${payload.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="checkout-layout">
      <form className="checkout-form" onSubmit={submit}>
        <div><label htmlFor="name">Full name</label><input id="name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label htmlFor="address">Address</label><textarea id="address" required maxLength={300} rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="checkout-row">
          <div><label htmlFor="city">City</label><input id="city" required maxLength={120} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><label htmlFor="state">State</label><input id="state" maxLength={120} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
        </div>
        <div className="checkout-row">
          <div><label htmlFor="postalCode">Postal code</label><input id="postalCode" maxLength={32} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></div>
          <div><label htmlFor="country">Country</label><input id="country" required maxLength={120} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
        </div>
        <button className="checkout-primary" disabled={submitting} type="submit">{submitting ? "Placing order..." : "Place order"}</button>
        {error ? <p className="checkout-error">{error}</p> : null}
      </form>

      <aside className="order-summary">
        <p className="eyebrow">ORDER SUMMARY</p>
        {items.map((item) => <div className="summary-item" key={item.product_id}><span>{item.name} × {item.quantity}</span><strong>USD {(item.price * item.quantity).toFixed(2)}</strong></div>)}
        <div className="summary-total"><span>Subtotal</span><strong>USD {subtotal.toFixed(2)}</strong></div>
        <p className="summary-note">Shipping is currently free.</p>
        <p className="summary-email">Confirmation will be sent to {email}.</p>
      </aside>
    </div>
  );
}

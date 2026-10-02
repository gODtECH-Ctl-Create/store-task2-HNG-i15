"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthControls } from "@/components/auth-controls";
import { authClient } from "@/lib/auth/client";

type Product = {
  id: string;
  name: string;
  description: string;
  price: string | number;
  currency: string;
  image_url: string | null;
  stock: number;
};

type CartItem = Product & { quantity: number };

export default function Storefront({ products }: { products: Product[] }) {
  const router = useRouter();
  const { data: session, isPending: authPending } = authClient.useSession();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);

  useEffect(() => {
    if (!session?.user) { setCart([]); return; }
    let cancelled = false;
    setCartLoading(true);
    fetch("/api/cart", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load cart");
        return response.json();
      })
      .then((items: CartItem[]) => { if (!cancelled) setCart(items); })
      .catch(() => { if (!cancelled) setCart([]); })
      .finally(() => { if (!cancelled) setCartLoading(false); });
    return () => { cancelled = true; };
  }, [session?.user]);

  async function addToCart(product: Product) {
    if (!session?.user) {
      router.push("/auth/sign-in?callbackURL=%2F");
      return;
    }
    setCartLoading(true);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      if (!response.ok) throw new Error("Unable to update cart");
      const changed = (await response.json()) as CartItem;
      setCart((current) => {
        const existing = current.find((item) => item.id === changed.product_id);
        const normalized = { ...product, ...changed, id: changed.product_id ?? product.id };
        if (!existing) return [...current, normalized];
        return current.map((item) => item.id === normalized.id ? { ...item, quantity: normalized.quantity } : item);
      });
      setCartOpen(true);
    } catch {
      // Keep the current cart visible; the server remains authoritative.
    } finally {
      setCartLoading(false);
    }
  }

  async function changeQuantity(id: string, delta: number) {
    if (!session?.user) return;
    const current = cart.find((item) => item.id === id);
    if (!current) return;
    const nextQuantity = Math.min(Math.max(current.quantity + delta, 0), current.stock);
    setCart((items) => nextQuantity === 0 ? items.filter((item) => item.id !== id) : items.map((item) => item.id === id ? { ...item, quantity: nextQuantity } : item));
    try {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: id, quantity: nextQuantity }),
      });
      if (!response.ok) throw new Error("Unable to update cart");
      if (nextQuantity > 0) {
        const updated = (await response.json()) as CartItem;
        setCart((items) => items.map((item) => item.id === id ? { ...item, quantity: updated.quantity } : item));
      }
    } catch {
      const response = await fetch("/api/cart", { cache: "no-store" });
      if (response.ok) setCart(await response.json());
    }
  }

  return <div className="store-shell">
    <header className="site-header">
      <a className="brand" href="/">NOVA<span>STORE</span></a>
      <div className="header-actions">
        <AuthControls />
        <button className="cart-trigger" type="button" onClick={() => setCartOpen(true)} disabled={authPending || cartLoading && !session?.user}>
          Cart <span>{cartCount}</span>
        </button>
      </div>
    </header>

    <main>
      <section className="hero">
        <p className="eyebrow">CURATED EVERYDAY GOODS</p>
        <h1>Good things for your everyday.</h1>
        <p className="hero-copy">Thoughtfully selected tech and lifestyle essentials for work, travel, and home.</p>
      </section>

      <section className="catalog">
        <div className="section-heading"><div><p className="eyebrow">SHOP</p><h2>Featured products</h2></div><span>{products.length} products</span></div>
        <div className="product-grid">
          {products.map((product) => <article className="product-card" key={product.id}>
            <div className="product-image">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <div className="image-placeholder">No image</div>}</div>
            <div className="product-info">
              <div><h3>{product.name}</h3><p>{product.description}</p></div>
              <div className="product-buy"><strong>{product.currency} {Number(product.price).toFixed(2)}</strong><button type="button" onClick={() => addToCart(product)} disabled={product.stock < 1}>{session?.user ? "Add to cart" : "Sign in to add"}</button></div>
            </div>
          </article>)}
        </div>
      </section>
    </main>

    {cartOpen && <><button className="cart-backdrop" type="button" aria-label="Close cart" onClick={() => setCartOpen(false)} /><aside className="cart-panel" aria-label="Shopping cart">
      <div className="cart-header"><div><p className="eyebrow">YOUR ORDER</p><h2>Cart</h2></div><button className="icon-button" type="button" onClick={() => setCartOpen(false)} aria-label="Close cart">×</button></div>
      {cart.length === 0 ? <div className="empty-cart"><p>{cartLoading ? "Loading cart..." : "Your cart is empty."}</p><button type="button" onClick={() => setCartOpen(false)}>Continue shopping</button></div> : <><div className="cart-items">
        {cart.map((item) => <div className="cart-item" key={item.id}><div><strong>{item.name}</strong><p>{item.currency} {Number(item.price).toFixed(2)}</p></div><div className="quantity-controls"><button type="button" onClick={() => changeQuantity(item.id, -1)}>−</button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)}>+</button></div></div>)}
      </div><div className="cart-footer"><div className="cart-total"><span>Total</span><strong>USD {cartTotal.toFixed(2)}</strong></div><a className="checkout-button" href="/checkout">Go to checkout</a></div></>}
    </aside></>}
  </div>;
}
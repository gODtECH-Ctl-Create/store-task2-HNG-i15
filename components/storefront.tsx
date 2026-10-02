"use client";

import { useMemo, useState } from "react";
import { AuthControls } from "@/components/auth-controls";

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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart],
  );

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) }
            : item,
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.min(Math.max(item.quantity + delta, 0), item.stock) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  return (
    <div className="store-shell">
      <header className="site-header">
        <a className="brand" href="/">NOVA<span>STORE</span></a>
        <div className="header-actions">
          <AuthControls />
          <button className="cart-trigger" type="button" onClick={() => setCartOpen(true)}>
            Cart <span>{cartCount}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">CURATED EVERYDAY GOODS</p>
          <h1>Good things for your everyday.</h1>
          <p className="hero-copy">
            Thoughtfully selected tech and lifestyle essentials for work, travel, and home.
          </p>
        </section>

        <section className="catalog">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SHOP</p>
              <h2>Featured products</h2>
            </div>
            <span>{products.length} products</span>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} loading="lazy" />
                  ) : (
                    <div className="image-placeholder">No image</div>
                  )}
                </div>
                <div className="product-info">
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                  </div>
                  <div className="product-buy">
                    <strong>{product.currency} {Number(product.price).toFixed(2)}</strong>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={product.stock < 1}
                    >
                      Add to cart
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {cartOpen && (
        <>
          <button
            className="cart-backdrop"
            type="button"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
          />
          <aside className="cart-panel" aria-label="Shopping cart">
            <div className="cart-header">
              <div>
                <p className="eyebrow">YOUR ORDER</p>
                <h2>Cart</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setCartOpen(false)} aria-label="Close cart">
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <p>Your cart is empty.</p>
                <button type="button" onClick={() => setCartOpen(false)}>Continue shopping</button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.currency} {Number(item.price).toFixed(2)}</p>
                      </div>
                      <div className="quantity-controls">
                        <button type="button" onClick={() => changeQuantity(item.id, -1)}>−</button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => changeQuantity(item.id, 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-footer">
                  <div className="cart-total"><span>Total</span><strong>USD {cartTotal.toFixed(2)}</strong></div>
                  <a className="checkout-button" href="/checkout">Go to checkout</a>
                </div>
              </>
            )}
          </aside>
        </>
      )}
    </div>
  );
}

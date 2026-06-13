import { useState, useEffect } from "react";
import type { CartItem } from "../types";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem("cart", JSON.stringify(items)); }, [items]);

  const add = (i: CartItem) => setItems((prev) => {
    const ex = prev.find((x) => x.sku === i.sku);
    return ex ? prev.map((x) => x.sku === i.sku ? { ...x, quantity: x.quantity + 1 } : x) : [...prev, i];
  });

  const remove = (sku: string) => setItems((prev) => prev.filter((x) => x.sku !== sku));

  const update = (sku: string, q: number) => setItems((prev) =>
    q <= 0 ? prev.filter((x) => x.sku !== sku) : prev.map((x) => x.sku === sku ? { ...x, quantity: q } : x)
  );

  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, add, remove, update, clear, total, count };
}

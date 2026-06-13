import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { ShoppingCart, X, Plus, Minus, Check } from "lucide-react";
import type { Product, CartItem } from "./types";

function getColorHex(name: string): string {
  const map: Record<string, string> = {
    Preta: "#1f2937", Branca: "#f9fafb", Vermelha: "#ef4444", Azul: "#3b82f6",
    Verde: "#22c55e", Amarela: "#eab308", Rosa: "#ec4899", Cinza: "#9ca3af",
    Laranja: "#f97316", Marrom: "#78350f", Bege: "#d6a354", Roxa: "#a855f7",
    Prata: "#cbd5e1", Dourada: "#f59e0b", Transparente: "#e5e7eb",
  };
  return map[name] || "#e5e7eb";
}

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("cart", JSON.stringify(items)); }, [items]);
  const add = (i: CartItem) => setItems((prev) => {
    const ex = prev.find((x) => x.sku === i.sku);
    return ex ? prev.map((x) => x.sku === i.sku ? { ...x, quantity: x.quantity + 1 } : x) : [...prev, i];
  });
  const remove = (sku: string) => setItems((prev) => prev.filter((x) => x.sku !== sku));
  const update = (sku: string, q: number) => setItems((prev) => q <= 0 ? prev.filter((x) => x.sku !== sku) : prev.map((x) => x.sku === sku ? { ...x, quantity: q } : x));
  const clear = () => setItems([]);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return { items, add, remove, update, clear, total, count };
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState<"catalog" | "checkout" | "confirm">("catalog");
  const [lastOrder, setLastOrder] = useState<number | null>(null);
  const cart = useCart();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", delivery: "retirada" as "retirada" | "frete", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("products")
      .select("*, color:colors(*)")
      .order("category")
      .order("name")
      .then(({ data }) => {
        if (data) setProducts(data as unknown as Product[]);
        setLoading(false);
      });
  }, []);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];

  async function handleCheckout() {
    if (!form.name || !form.email || !form.phone) return;
    setSubmitting(true);
    const { error, data } = await supabase.from("orders").insert({
      customer_name: form.name,
      customer_email: form.email,
      customer_phone: form.phone,
      customer_address: form.address || null,
      delivery_method: form.delivery,
      notes: form.notes || null,
      total: cart.total,
      status: "pending",
    }).select().single();

    if (error || !data) {
      alert("Erro ao enviar pedido: " + (error?.message || "unknown"));
      setSubmitting(false);
      return;
    }

    const orderId = data.id;
    for (const item of cart.items) {
      await supabase.from("order_items").insert({
        order_id: orderId,
        product_sku: item.sku,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      });
      await supabase.rpc("decrement_stock", { sku_param: item.sku, qty: item.quantity });
    }

    if (import.meta.env.VITE_WEBHOOK_URL) {
      fetch(import.meta.env.VITE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...form, items: cart.items, total: cart.total }),
      }).catch(() => {});
    }

    cart.clear();
    setLastOrder(orderId);
    setView("confirm");
    setCartOpen(false);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <button onClick={() => { setView("catalog"); setCartOpen(false); }} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">I3</div>
            <span className="font-bold text-gray-900">IdeaShop3D</span>
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => setCartOpen(true)} className="relative p-2 text-gray-600 hover:text-gray-900">
              <ShoppingCart className="h-5 w-5" />
              {cart.count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {cart.count > 99 ? "99+" : cart.count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {view === "catalog" && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Catálogo 3D</h1>
              <p className="mt-1 text-gray-500">Produtos impressos em PLA de alta qualidade.</p>
            </div>

            {categories.map((cat) => (
              <section key={cat} className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">{cat}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.filter((p) => p.category === cat).map((p) => (
                    <div key={p.sku} className="group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md">
                      <div className="aspect-square overflow-hidden bg-gray-50">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                            <div className="h-20 w-20 rounded-full" style={{ background: getColorHex(p.color.name) }} />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full border" style={{ background: getColorHex(p.color.name) }} />
                          <span className="text-xs text-gray-400">{p.color.name}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900">{p.name}</h3>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-lg font-bold text-indigo-600">{formatPrice(p.price)}</span>
                          <button
                            onClick={() => cart.add({
                              sku: p.sku, name: p.name, colorName: p.color.name, price: p.price, quantity: 1, image: p.image,
                            })}
                            disabled={p.stock <= 0}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                          >
                            {p.stock > 0 ? "Adicionar" : "Indisponível"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {view === "checkout" && (
          <div className="mx-auto max-w-lg">
            <h2 className="mb-6 text-xl font-bold text-gray-900">Finalizar Pedido</h2>
            <div className="space-y-4">
              <input required placeholder="Nome completo *" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
              <input required placeholder="E-mail *" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
              <input required placeholder="WhatsApp * (11) 99999-8888" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
              <input placeholder="Endereço (para frete)" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />

              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="radio" name="delivery" checked={form.delivery === "retirada"}
                    onChange={() => setForm({ ...form, delivery: "retirada" })} className="text-indigo-600" />
                  <div>
                    <span className="text-sm font-medium">Retirada em Mãos</span>
                    <p className="text-xs text-gray-500">Sem custo de frete</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="radio" name="delivery" checked={form.delivery === "frete"}
                    onChange={() => setForm({ ...form, delivery: "frete" })} className="text-indigo-600" />
                  <div>
                    <span className="text-sm font-medium">Frete a Combinar</span>
                    <p className="text-xs text-gray-500">Valor combinado após o pedido</p>
                  </div>
                </label>
              </div>

              <textarea placeholder="Observações (opcional)" rows={3} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />

              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="divide-y text-sm">
                  {cart.items.map((item) => (
                    <div key={item.sku} className="flex justify-between py-1.5">
                      <span>{item.name} ({item.colorName}) x{item.quantity}</span>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t pt-3 font-bold">
                  <span>Total</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
              </div>

              <button onClick={handleCheckout} disabled={submitting}
                className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                {submitting ? "Enviando..." : "Confirmar Pedido"}
              </button>
              <button onClick={() => setView("catalog")}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Voltar ao catálogo
              </button>
            </div>
          </div>
        )}

        {view === "confirm" && (
          <div className="mx-auto max-w-lg py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Pedido Confirmado!</h2>
            <p className="mt-2 text-gray-600">
              Pedido #{lastOrder} recebido. Entraremos em contato pelo WhatsApp para combinar pagamento e entrega.
            </p>
            <button onClick={() => { setView("catalog"); setCartOpen(false); }}
              className="mt-6 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
              Voltar ao Catálogo
            </button>
          </div>
        )}
      </main>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setCartOpen(false)} />
          <div className="flex w-full max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold text-gray-900">Carrinho ({cart.count})</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.items.length === 0 ? (
                <p className="text-center text-sm text-gray-500">Carrinho vazio</p>
              ) : (
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div key={item.sku} className="flex gap-3 rounded-lg border p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.colorName}</p>
                        <p className="mt-1 text-sm font-semibold text-indigo-600">{formatPrice(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => cart.update(item.sku, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded border text-gray-600 hover:bg-gray-50">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm">{item.quantity}</span>
                        <button onClick={() => cart.update(item.sku, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded border text-gray-600 hover:bg-gray-50">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => cart.remove(item.sku)} className="text-xs text-red-400 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.items.length > 0 && (
              <div className="border-t p-4">
                <div className="mb-3 flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
                <button onClick={() => { setCartOpen(false); setView("checkout"); }}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                  Finalizar Pedido
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

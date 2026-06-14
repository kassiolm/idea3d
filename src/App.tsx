import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { ShoppingCart, X, Plus, Minus, Check, Package, Truck, MapPin, ChevronRight, Star, Sparkles, Shield, ShieldOff, Pencil, Trash2, Plus as PlusIcon } from "lucide-react";
import type { Product, CartItem, ProductFormData } from "./types";
import { FALLBACK_PRODUCTS } from "./data/products";
import { useCart } from "./hooks/useCart";

const BASE = import.meta.env.BASE_URL || "/";
import Modal from "./components/ui/Modal";
import AdminLogin from "./components/admin/AdminLogin";
import ProductForm from "./components/admin/ProductForm";
import DeleteConfirm from "./components/admin/DeleteConfirm";

const COLOR_MAP: Record<string, string> = {
  Preta: "#1f2937", Branca: "#f9fafb", Vermelha: "#ef4444", Azul: "#3b82f6",
  Verde: "#22c55e", Amarela: "#eab308", Rosa: "#ec4899", Cinza: "#9ca3af",
  Laranja: "#f97316", Marrom: "#78350f", Bege: "#d6a354", Roxa: "#a855f7",
  Prata: "#cbd5e1", Dourada: "#f59e0b", Transparente: "#e5e7eb",
};

function getColorHex(name: string): string {
  return COLOR_MAP[name] || "#e5e7eb";
}

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [colors, setColors] = useState<{ id: number; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState<"catalog" | "checkout" | "confirm">("catalog");
  const [lastOrder, setLastOrder] = useState<number | null>(null);
  const cart = useCart();
  const [admin, setAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", delivery: "retirada" as "retirada" | "frete", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function loadProducts() {
    supabase
      .from("products")
      .select("*, color:colors(*)")
      .order("category")
      .order("name")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setProducts(data as unknown as Product[]);
        } else {
          setProducts(FALLBACK_PRODUCTS);
        }
        setLoading(false);
      })
      .catch(() => {
        setProducts(FALLBACK_PRODUCTS);
        setLoading(false);
      });
  }

  function loadColors() {
    supabase.from("colors").select("*").order("id").then(({ data }) => {
      if (data && data.length > 0) setColors(data);
    }).catch(() => {});
  }

  useEffect(() => { loadProducts(); loadColors(); }, []);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];

  async function handleCheckout() {
    if (!form.name || !form.email || !form.phone) return;
    setSubmitting(true);

    let orderId: number;

    try {
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

      if (error || !data) throw new Error(error?.message || "Supabase offline");

      orderId = data.id;
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
    } catch {
      orderId = Date.now();
      const localOrders = JSON.parse(localStorage.getItem("localOrders") || "[]");
      localOrders.push({ id: orderId, ...form, items: cart.items, total: cart.total, date: new Date().toISOString() });
      localStorage.setItem("localOrders", JSON.stringify(localOrders));
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

  // ─── Admin CRUD ───
  async function handleSaveProduct(data: ProductFormData) {
    setSavingProduct(true);
    const p = { ...data, model_number: "1.0" };
    try {
      if (editingProduct) {
        const { error } = await supabase.from("products").update(p).eq("sku", data.sku);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(p);
        if (error) throw error;
      }
      setShowProductForm(false);
      setEditingProduct(null);
      loadProducts();
    } catch {
      const key = `local_products_${data.sku}`;
      localStorage.setItem(key, JSON.stringify(p));
      setShowProductForm(false);
      setEditingProduct(null);
      loadProducts();
    }
    setSavingProduct(false);
  }

  async function handleDeleteProduct() {
    if (!deletingProduct) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("sku", deletingProduct.sku);
      if (error) throw error;
    } catch {
      localStorage.setItem(`local_products_${deletingProduct.sku}_deleted`, "1");
    }
    setDeletingProduct(null);
    setDeleting(false);
    loadProducts();
  }

  const categoryIcons: Record<string, string> = {
    Organizadores: "🗂️",
    Utilitários: "🔧",
    Acessórios: "📱",
    Decoração: "✨",
  };

  // ─── Loading ───
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a1a]">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-[3px] border-[#2d2d2d] border-t-[#f97316] animate-spin" />
          </div>
          <span className="text-[#a3a3a3] text-sm font-medium tracking-wide">Carregando catálogo…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">

      {/* ═══════════ HEADER ═══════════ */}
      <header className="sticky top-0 z-40 border-b border-[#2d2d2d] bg-[#1a1a1a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-24 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => { setView("catalog"); setCartOpen(false); }}
            className="flex items-center gap-3 group"
            id="header-logo"
          >
            <img
              src={`${BASE}logo.png`}
              alt="IdeaShop3D Logo"
              className="h-20 w-20 object-contain rounded-xl transition-transform duration-300 group-hover:scale-110"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-[#f5f5f5] leading-none">
                Idea<span className="gradient-text">Shop3D</span>
              </span>
              <span className="text-[10px] font-medium text-[#737373] tracking-widest uppercase leading-none mt-0.5">
                Impressão 3D
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => admin ? (setAdmin(false), setShowProductForm(false), setEditingProduct(null)) : setShowAdminLogin(true)}
              className={`p-2.5 rounded-xl transition-all duration-200 ${
                admin ? "text-[#f97316] bg-[#f97316]/10" : "text-[#a3a3a3] hover:text-[#f97316] hover:bg-[#2d2d2d]"
              }`}
              id="header-admin-btn"
              title={admin ? "Sair do modo admin" : "Modo admin"}
            >
              {admin ? <ShieldOff className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 rounded-xl text-[#a3a3a3] hover:text-[#f97316] hover:bg-[#2d2d2d] transition-all duration-200"
              id="header-cart-btn"
            >
              <ShoppingCart className="h-5 w-5" />
              {cart.count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#f97316] to-[#ea580c] text-[10px] font-bold text-white shadow-lg shadow-orange-500/30 animate-pulse-glow">
                  {cart.count > 99 ? "99+" : cart.count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">

        {/* ═══════════ CATALOG VIEW ═══════════ */}
        {view === "catalog" && (
          <>
            {/* ── Hero Section ── */}
            <section className="hero-gradient rounded-2xl mt-6 mb-10 px-6 py-12 sm:px-10 sm:py-16 relative overflow-hidden" id="hero-section">
              {/* Decorative orbs */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#f97316]/5 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-[#f97316]/3 rounded-full blur-[60px] pointer-events-none" />

              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
                <div className="flex-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full category-badge text-xs font-semibold mb-4">
                    <Sparkles className="h-3.5 w-3.5" />
                    Feito com PLA Premium
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#f5f5f5] leading-tight mb-4">
                    Transformamos <br />
                    <span className="gradient-text">ideias em 3D</span>
                  </h1>
                  <p className="text-[#a3a3a3] text-base sm:text-lg max-w-md leading-relaxed">
                    Produtos exclusivos impressos em 3D com PLA de alta qualidade. Organizadores, acessórios e decoração para o seu dia a dia.
                  </p>
                  <div className="flex items-center gap-4 mt-6 justify-center sm:justify-start">
                    <a href="#products" className="btn-primary rounded-xl px-6 py-3 text-sm inline-flex items-center gap-2">
                      <span>Ver Catálogo</span>
                      <ChevronRight className="h-4 w-4" />
                    </a>
                    <div className="flex items-center gap-1.5 text-[#737373] text-sm">
                      <div className="flex -space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-[#f97316] text-[#f97316]" />
                        ))}
                      </div>
                      <span className="ml-1 text-[#a3a3a3]">5.0</span>
                    </div>
                  </div>
                </div>

                <div className="relative flex-shrink-0">
                  <div className="w-[150px] h-[150px] sm:w-[180px] sm:h-[180px] relative animate-float">
                    <img
                      src={`${BASE}logo.png`}
                      alt="IdeaShop3D"
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#f97316]/10 to-transparent rounded-full blur-2xl -z-10" />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Stats Bar ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
              {[
                { label: "Produtos", value: products.length.toString(), icon: Package },
                { label: "Categorias", value: categories.length.toString(), icon: Star },
                { label: "Material", value: "PLA", icon: Sparkles },
                { label: "Entrega", value: "SP", icon: MapPin },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`glass-card rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in-up stagger-${i + 1}`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f97316]/10 text-[#f97316]">
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#f5f5f5] leading-none">{stat.value}</p>
                    <p className="text-xs text-[#737373] mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Product Grid ── */}
            <div id="products">
              {categories.map((cat, catIdx) => (
                <section key={cat} className="mb-10" id={`category-${cat.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-2xl">{categoryIcons[cat] || "📦"}</span>
                    <h2 className="text-xl font-bold text-[#f5f5f5]">{cat}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#2d2d2d] to-transparent" />
                    <span className="text-xs text-[#737373] font-medium">
                      {products.filter((p) => p.category === cat).length} itens
                    </span>
                  </div>

                  {admin && (
                    <div className="mb-4">
                      <button
                        onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
                        className="btn-primary rounded-xl px-4 py-2 text-xs inline-flex items-center gap-1.5"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        <span>Adicionar Produto</span>
                      </button>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {products.filter((p) => p.category === cat).map((p, pIdx) => (
                      <div
                        key={p.sku}
                        className={`glass-card rounded-2xl overflow-hidden group animate-fade-in-up stagger-${(pIdx % 6) + 1}`}
                        id={`product-${p.sku}`}
                      >
                        {/* Image */}
                        <div className="aspect-square overflow-hidden bg-[#242424] relative">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#242424] to-[#1a1a1a]">
                              <div
                                className="h-20 w-20 rounded-full shadow-lg"
                                style={{ background: getColorHex(p.color.name), boxShadow: `0 0 30px ${getColorHex(p.color.name)}33` }}
                              />
                            </div>
                          )}
                          {/* Stock badge */}
                          {p.stock <= 0 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="bg-[#2d2d2d] text-[#a3a3a3] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#404040]">
                                Indisponível
                              </span>
                            </div>
                          )}
                          {p.stock > 0 && p.stock <= 2 && (
                            <div className="absolute top-3 right-3">
                              <span className="bg-[#f97316]/90 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                                Últimas {p.stock}!
                              </span>
                            </div>
                          )}
                          {admin && (
                            <div className="absolute top-3 left-3 flex gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingProduct(p); setShowProductForm(true); }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#404040] text-[#a3a3a3] hover:text-[#f97316] hover:border-[#f97316]/50 transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeletingProduct(p); }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#404040] text-[#a3a3a3] hover:text-[#ef4444] hover:border-[#ef4444]/50 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="h-3 w-3 rounded-full border border-white/10 shadow-sm"
                              style={{ background: getColorHex(p.color.name) }}
                            />
                            <span className="text-xs text-[#737373] font-medium">{p.color.name}</span>
                          </div>
                          <h3 className="font-semibold text-[#f5f5f5] text-base leading-snug">{p.name}</h3>

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xl font-extrabold gradient-text">{formatPrice(p.price)}</span>
                            <button
                              onClick={() => cart.add({
                                sku: p.sku, name: p.name, colorName: p.color.name, price: p.price, quantity: 1, image: p.image,
                              })}
                              disabled={p.stock <= 0}
                              className="btn-primary rounded-xl px-4 py-2 text-xs"
                              id={`add-${p.sku}`}
                            >
                              <span>{p.stock > 0 ? "Adicionar" : "Esgotado"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* ── Footer ── */}
            <footer className="mt-16 border-t border-[#2d2d2d] pt-8 pb-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src={`${BASE}logo.png`} alt="IdeaShop3D" className="h-16 w-16 object-contain rounded-xl" />
                  <span className="text-sm text-[#737373]">
                    © {new Date().getFullYear()} IdeaShop3D. Todos os direitos reservados.
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#525252]">
                  <span>Feito com ❤️ e impressão 3D</span>
                </div>
              </div>
            </footer>
          </>
        )}

        {/* ═══════════ CHECKOUT VIEW ═══════════ */}
        {view === "checkout" && (
          <div className="mx-auto max-w-lg py-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => setView("catalog")}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2d2d2d] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#3a3a3a] transition-colors"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
              <h2 className="text-2xl font-bold text-[#f5f5f5]">Finalizar Pedido</h2>
            </div>

            <div className="space-y-4">
              {[
                { placeholder: "Nome completo *", value: form.name, key: "name", type: "text" },
                { placeholder: "E-mail *", value: form.email, key: "email", type: "email" },
                { placeholder: "WhatsApp * (11) 99999-8888", value: form.phone, key: "phone", type: "tel" },
                { placeholder: "Endereço (para frete)", value: form.address, key: "address", type: "text" },
              ].map((field) => (
                <input
                  key={field.key}
                  required={field.key !== "address"}
                  placeholder={field.placeholder}
                  type={field.type}
                  value={field.value}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-full rounded-xl border border-[#404040] bg-[#242424] px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#525252] focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] outline-none transition-all"
                  id={`checkout-${field.key}`}
                />
              ))}

              <div className="space-y-2">
                <label
                  className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                    form.delivery === "retirada"
                      ? "border-[#f97316]/50 bg-[#f97316]/5"
                      : "border-[#404040] bg-[#242424] hover:border-[#525252]"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={form.delivery === "retirada"}
                    onChange={() => setForm({ ...form, delivery: "retirada" })}
                    className="accent-[#f97316]"
                  />
                  <MapPin className="h-4 w-4 text-[#f97316]" />
                  <div>
                    <span className="text-sm font-semibold text-[#f5f5f5]">Retirada em Mãos</span>
                    <p className="text-xs text-[#737373]">Sem custo de frete</p>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                    form.delivery === "frete"
                      ? "border-[#f97316]/50 bg-[#f97316]/5"
                      : "border-[#404040] bg-[#242424] hover:border-[#525252]"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={form.delivery === "frete"}
                    onChange={() => setForm({ ...form, delivery: "frete" })}
                    className="accent-[#f97316]"
                  />
                  <Truck className="h-4 w-4 text-[#f97316]" />
                  <div>
                    <span className="text-sm font-semibold text-[#f5f5f5]">Frete a Combinar</span>
                    <p className="text-xs text-[#737373]">Valor combinado após o pedido</p>
                  </div>
                </label>
              </div>

              <textarea
                placeholder="Observações (opcional)"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-xl border border-[#404040] bg-[#242424] px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#525252] focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] outline-none transition-all resize-none"
                id="checkout-notes"
              />

              {/* Order summary */}
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[#a3a3a3] mb-3 uppercase tracking-wider">Resumo</h3>
                <div className="divide-y divide-[#2d2d2d] text-sm">
                  {cart.items.map((item) => (
                    <div key={item.sku} className="flex justify-between py-2.5">
                      <span className="text-[#a3a3a3]">
                        {item.name} <span className="text-[#525252]">({item.colorName})</span> ×{item.quantity}
                      </span>
                      <span className="font-semibold text-[#f5f5f5]">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between border-t border-[#2d2d2d] pt-4">
                  <span className="font-bold text-[#f5f5f5]">Total</span>
                  <span className="text-xl font-extrabold gradient-text">{formatPrice(cart.total)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={submitting || !form.name || !form.email || !form.phone}
                className="btn-primary w-full rounded-xl py-3.5 text-sm"
                id="checkout-confirm-btn"
              >
                <span>{submitting ? "Enviando…" : "Confirmar Pedido"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ CONFIRMATION VIEW ═══════════ */}
        {view === "confirm" && (
          <div className="mx-auto max-w-lg py-16 text-center animate-fade-in-up">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20">
              <Check className="h-8 w-8 text-[#22c55e]" />
            </div>
            <h2 className="text-3xl font-extrabold text-[#f5f5f5] mb-3">Pedido Confirmado!</h2>
            <p className="text-[#a3a3a3] text-base leading-relaxed max-w-sm mx-auto">
              Pedido <span className="font-bold text-[#f97316]">#{lastOrder}</span> recebido com sucesso. Entraremos em contato pelo WhatsApp para combinar pagamento e entrega.
            </p>
            <button
              onClick={() => { setView("catalog"); setCartOpen(false); }}
              className="btn-primary rounded-xl px-8 py-3 text-sm mt-8 inline-flex items-center gap-2"
              id="confirm-back-btn"
            >
              <span>Voltar ao Catálogo</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>

      {/* ═══════════ CART DRAWER ═══════════ */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 overlay-backdrop animate-fade-in" onClick={() => setCartOpen(false)} />
          <div className="flex w-full max-w-sm flex-col bg-[#1a1a1a] border-l border-[#2d2d2d] shadow-2xl animate-slide-in-right">
            {/* Cart header */}
            <div className="flex items-center justify-between border-b border-[#2d2d2d] px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#f97316]" />
                <h2 className="font-bold text-[#f5f5f5]">Carrinho</h2>
                <span className="ml-1 text-xs font-semibold text-[#737373] bg-[#2d2d2d] px-2 py-0.5 rounded-full">
                  {cart.count}
                </span>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#737373] hover:text-[#f5f5f5] hover:bg-[#2d2d2d] transition-colors"
                id="cart-close-btn"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2d2d2d] mb-4">
                    <ShoppingCart className="h-7 w-7 text-[#525252]" />
                  </div>
                  <p className="text-sm font-medium text-[#737373]">Carrinho vazio</p>
                  <p className="text-xs text-[#525252] mt-1">Adicione produtos do catálogo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div key={item.sku} className="glass-card rounded-xl p-3 flex gap-3" id={`cart-item-${item.sku}`}>
                      {/* Thumbnail */}
                      {item.image && (
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#242424]">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#f5f5f5] truncate">{item.name}</p>
                        <p className="text-xs text-[#525252]">{item.colorName}</p>
                        <p className="text-sm font-bold gradient-text mt-0.5">{formatPrice(item.price)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => cart.remove(item.sku)}
                          className="text-[#525252] hover:text-[#ef4444] transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => cart.update(item.sku, item.quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#404040] bg-[#2d2d2d] text-[#a3a3a3] hover:bg-[#3a3a3a] hover:text-[#f5f5f5] transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-sm font-semibold text-[#f5f5f5]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => cart.update(item.sku, item.quantity + 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#404040] bg-[#2d2d2d] text-[#a3a3a3] hover:bg-[#3a3a3a] hover:text-[#f5f5f5] transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart footer */}
            {cart.items.length > 0 && (
              <div className="border-t border-[#2d2d2d] p-5">
                <div className="mb-4 flex justify-between items-baseline">
                  <span className="font-semibold text-[#a3a3a3] text-sm">Total</span>
                  <span className="text-2xl font-extrabold gradient-text">{formatPrice(cart.total)}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); setView("checkout"); }}
                  className="btn-primary w-full rounded-xl py-3 text-sm"
                  id="cart-checkout-btn"
                >
                  <span>Finalizar Pedido</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ ADMIN MODALS ═══════════ */}
      <Modal open={showAdminLogin} onClose={() => setShowAdminLogin(false)} title="Admin">
        <AdminLogin onLogin={() => { setAdmin(true); setShowAdminLogin(false); }} />
      </Modal>

      <Modal open={showProductForm} onClose={() => { setShowProductForm(false); setEditingProduct(null); }} title={editingProduct ? "Editar Produto" : "Novo Produto"}>
        <ProductForm
          product={editingProduct || undefined}
          colors={colors.length > 0 ? colors : FALLBACK_PRODUCTS.map((p) => p.color).filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i)}
          onSubmit={handleSaveProduct}
          onCancel={() => { setShowProductForm(false); setEditingProduct(null); }}
        />
      </Modal>

      <Modal open={!!deletingProduct} onClose={() => setDeletingProduct(null)} title="Excluir Produto">
        {deletingProduct && (
          <DeleteConfirm
            product={deletingProduct}
            onConfirm={handleDeleteProduct}
            onCancel={() => setDeletingProduct(null)}
            loading={deleting}
          />
        )}
      </Modal>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { ShoppingCart, X, Plus, Minus, Check, Package, Truck, MapPin, ChevronLeft, ChevronRight, Star, Sparkles, Shield, ShieldOff, Pencil, Trash2, Plus as PlusIcon } from "lucide-react";
import type { Product, CartItem, ProductFormData } from "./types";
import { useCart } from "./hooks/useCart";

const BASE = import.meta.env.BASE_URL || "/";
import Modal from "./components/ui/Modal";
import AdminLogin from "./components/admin/AdminLogin";
import ProductForm from "./components/admin/ProductForm";
import DeleteConfirm from "./components/admin/DeleteConfirm";
import CategoryColorForm from "./components/admin/CategoryColorForm";
import ImageSlider from "./components/ui/ImageSlider";
import { toImageUrl } from "./lib/images";
import { fetchProducts, saveProduct as dbSaveProduct, deleteProduct as dbDeleteProduct, fetchColors, saveColors as dbSaveColors, fetchCategories, saveCategories as dbSaveCategories, fetchMaterials, saveMaterials as dbSaveMaterials, getOrders, saveOrder as dbSaveOrder, updateOrders as dbUpdateOrders, decrementStock, incrementStock } from "./lib/db";

let managedHexMap: Record<string, string> = {};

function swatchStyle(colors: { hex: string }[] | undefined, fallback: string): React.CSSProperties {
  if (colors && colors.length >= 2) {
    const n = colors.length;
    const stops = colors.map((c, i) => `${c.hex} ${(i * 360 / n)}deg ${((i + 1) * 360 / n)}deg`).join(", ");
    return { background: `conic-gradient(${stops})` };
  }
  return { background: colors?.[0]?.hex || fallback };
}

function colorDot(c: { hex?: string; hexes?: string[] } | undefined, fb = "#e5e7eb"): React.CSSProperties {
  if (c?.hexes && c.hexes.length >= 2) {
    const n = c.hexes.length;
    const stops = c.hexes.map((hex, i) => `${hex} ${(i * 360 / n)}deg ${((i + 1) * 360 / n)}deg`).join(", ");
    return { background: `conic-gradient(${stops})` };
  }
  return { background: c?.hex || fb };
}

function getColorHex(name: string, fallback = "#e5e7eb"): string {
  return managedHexMap[name] || fallback;
}

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [colors, setColors] = useState<{ id: number; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState<"catalog" | "checkout" | "confirm" | "orders">("catalog");
  const [lastOrder, setLastOrder] = useState<number | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const cart = useCart();
  const [admin, setAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [managedCategories, setManagedCategories] = useState<string[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showColorForm, setShowColorForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materials, setMaterials] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<{ urls: string[]; idx: number } | null>(null);
  const lightboxTouchX = useRef(0);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [pickerVar, setPickerVar] = useState(0);
  const [pickerQty, setPickerQty] = useState(1);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [editItems, setEditItems] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", delivery: "retirada" as "retirada" | "frete", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadProducts() {
    const fromRemote = await fetchProducts();
    if (fromRemote.length > 0) {
      setProducts(fromRemote);
    }
    setLoading(false);
  }

  async function loadColors() {
    const fromRemote = await fetchColors();
    if (fromRemote.length > 0) {
      setColors(fromRemote);
      for (const c of fromRemote) if (c.hex) managedHexMap[c.name] = c.hex;
    }
  }

  async function loadCategories() {
    const fromRemote = await fetchCategories();
    if (fromRemote.length > 0) {
      setManagedCategories(fromRemote);
    }
  }

  async function loadOrders() {
    const fromRemote = await getOrders();
    if (fromRemote.length > 0) setOrders(fromRemote);
  }

  async function loadMaterials() {
    const fromRemote = await fetchMaterials();
    if (fromRemote.length > 0) setMaterials(fromRemote);
  }

  useEffect(() => { Promise.all([loadProducts(), loadColors(), loadCategories(), loadMaterials()]) }, []);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];

  async function handleCheckout() {
    if (!form.name || !form.email || !form.phone) return;
    setSubmitting(true);

    const orderId = Date.now();
    const order = { id: orderId, ...form, items: cart.items, total: cart.total, date: new Date().toISOString(), status: "pending" };
    await dbSaveOrder(order);

    for (const item of cart.items) {
      await decrementStock(item.sku, item.quantity);
    }
    await loadProducts();

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
    const product: Product = {
      id: editingProduct?.id || Date.now(),
      sku: data.sku,
      name: data.name,
      description: data.description || "",
      model_number: "1.0",
      color_id: data.color_id,
      price: data.price,
      stock: data.variants ? data.variants.reduce((s, v) => s + v.stock, 0) : data.stock,
      image: data.variants ? (data.variants[0].image || data.variants[0].images?.find(Boolean) || null) : (data.image || null),
      images: data.variants ? data.variants.flatMap((v) => v.images?.filter(Boolean) || []) : (data.images?.filter(Boolean) as string[] | undefined),
      category: data.category || null,
      color: data.variants ? { id: data.variants[0].colorId, name: data.variants[0].colorName, code: data.variants[0].colorCode, hex: data.variants[0].colorHex } : (colors.find((c) => c.id === data.color_id) || { id: data.color_id, name: "Desconhecida", code: "??" }),
      variants: data.variants,
    };
    await dbSaveProduct(product);
    await loadProducts();
    setShowProductForm(false);
    setEditingProduct(null);
    setSavingProduct(false);
  }

  async function handleDeleteProduct() {
    if (!deletingProduct) return;
    setDeleting(true);
    await dbDeleteProduct(deletingProduct.sku);
    await loadProducts();
    setDeletingProduct(null);
    setDeleting(false);
  }

  async function saveOrders(updated: any[]) {
    await dbUpdateOrders(updated);
    setOrders(updated);
  }

  async function toggleOrderStatus(order: any) {
    const isCompleting = order.status !== "completed";
    const updated = orders.map((o: any) => o.id === order.id ? { ...o, status: isCompleting ? "completed" : "pending" } : o);
    await saveOrders(updated);
    for (const item of order.items) {
      if (isCompleting) {
        await decrementStock(item.sku, item.quantity);
      } else {
        await incrementStock(item.sku, item.quantity);
      }
    }
    await loadProducts();
  }

  async function deleteOrder(order: any) {
    if (!confirm(`Excluir pedido #${order.id}?`)) return;
    await saveOrders(orders.filter((o: any) => o.id !== order.id));
  }

  function startEditOrder(order: any) {
    setEditingOrder(order);
    setEditForm({ name: order.name, email: order.email, phone: order.phone, address: order.address || "", notes: order.notes || "" });
    setEditItems(order.items.map((item: any) => ({ ...item, _selectedSku: item.sku, _selectedVariantIdx: -1 })));
  }

  async function saveEditOrder() {
    if (!editingOrder) return;
    const items = editItems.map(({ _selectedSku, _selectedVariantIdx, ...item }: any) => item);
    const total = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    const updated = orders.map((o: any) => o.id === editingOrder.id ? { ...o, ...editForm, items, total } : o);
    await saveOrders(updated);
    setEditingOrder(null);
  }

  function updateEditItem(idx: number, productSku: string, variantIdx: number) {
    const next = [...editItems];
    const product = products.find((p: Product) => p.sku === productSku);
    if (!product) return;
    const variant = product.variants?.[variantIdx];
    next[idx] = {
      sku: productSku,
      name: product.name,
      price: product.price,
      quantity: next[idx].quantity,
      colorName: variant?.colorName || "",
      image: variant?.image || null,
      images: variant?.images || null,
      _selectedSku: productSku,
      _selectedVariantIdx: variantIdx,
    };
    setEditItems(next);
  }

  function updateEditItemQty(idx: number, qty: number) {
    const next = [...editItems];
    next[idx] = { ...next[idx], quantity: Math.max(1, qty) };
    setEditItems(next);
  }

  function removeEditItem(idx: number) {
    if (editItems.length <= 1) return;
    setEditItems(editItems.filter((_, i) => i !== idx));
  }

  function addEditItem() {
    const first = products[0];
    if (!first) return;
    const variant = first.variants?.[0];
    setEditItems([...editItems, {
      sku: first.sku,
      name: first.name,
      price: first.price,
      quantity: 1,
      colorName: variant?.colorName || "",
      image: variant?.image || null,
      images: variant?.images || null,
      _selectedSku: first.sku,
      _selectedVariantIdx: 0,
    }]);
  }

  function resolveColorHex(name: string, fallback = "#e5e7eb"): string {
    const fromState = colors.find((c) => c.name === name)?.hex;
    if (fromState) return fromState;
    const fromMap = managedHexMap[name];
    if (fromMap) return fromMap;
    return fallback;
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
            {admin && (
              <button
                onClick={() => { loadOrders(); setView("orders"); setCartOpen(false); }}
                className={`p-2.5 rounded-xl transition-all duration-200 text-[#a3a3a3] hover:text-[#f97316] hover:bg-[#2d2d2d]`}
                id="header-orders-btn"
                title="Pedidos"
              >
                <Package className="h-5 w-5" />
              </button>
            )}
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
                    Fabricados com filamentos de alta qualidade.
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#f5f5f5] leading-tight mb-4">
                    Transformamos <br />
                    <span className="gradient-text">ideias em 3D</span>
                  </h1>
                  <p className="text-[#a3a3a3] text-base sm:text-lg max-w-md leading-relaxed">
                    Produtos exclusivos fabricados com filamentos de alta qualidade. Organizadores, acessórios e decoração para o seu dia a dia.
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

                <div className="relative flex-shrink-0 animate-float">
                  <img
                    src={`${BASE}logo.png`}
                    alt="IdeaShop3D"
                    className="w-64 h-64 sm:w-80 sm:h-80 object-contain drop-shadow-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#f97316]/10 to-transparent rounded-full blur-2xl -z-10" />
                </div>
              </div>
            </section>

            {/* ── Stats Bar ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
              {[
                { label: "Produtos", value: products.length.toString(), icon: Package },
                { label: "Categorias", value: categories.length.toString(), icon: Star },
                { label: "Material", value: "PLA", icon: Sparkles },
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
              {admin && (
                <div className="mb-6 flex flex-wrap gap-2">
                  <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
                    className="btn-primary rounded-xl px-4 py-2 text-xs inline-flex items-center gap-1.5">
                    <PlusIcon className="h-3.5 w-3.5" />
                    <span>Novo Produto</span>
                  </button>
                  <button onClick={() => setShowCategoryForm(true)}
                    className="rounded-xl border border-[#404040] bg-[#242424] px-4 py-2 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] inline-flex items-center gap-1.5 transition-colors">
                    <span>Categorias</span>
                  </button>
                  <button onClick={() => setShowColorForm(true)}
                    className="rounded-xl border border-[#404040] bg-[#242424] px-4 py-2 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] inline-flex items-center gap-1.5 transition-colors">
                    <span>Cores</span>
                  </button>
                  <button onClick={() => setShowMaterialForm(true)}
                    className="rounded-xl border border-[#404040] bg-[#242424] px-4 py-2 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] inline-flex items-center gap-1.5 transition-colors">
                    <span>Materiais</span>
                  </button>
                </div>
              )}

              {products.length === 0 && (
                <div className="text-center py-20 animate-fade-in">
                  <Package className="mx-auto h-12 w-12 text-[#404040] mb-4" />
                  <h3 className="text-lg font-semibold text-[#a3a3a3] mb-2">Nenhum produto no catálogo</h3>
                  {admin && (
                    <p className="text-sm text-[#737373]">Clique em "Novo Produto" acima para adicionar o primeiro.</p>
                  )}
                </div>
              )}

              {(categories.length > 0 ? categories : managedCategories).map((cat, catIdx) => (
                <section key={cat} className="mb-10" id={`category-${cat.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-2xl">{categoryIcons[cat] || "📦"}</span>
                    <h2 className="text-xl font-bold text-[#f5f5f5]">{cat}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#2d2d2d] to-transparent" />
                    <span className="text-xs text-[#737373] font-medium">
                      {products.filter((p) => p.category === cat).length} itens
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {products.filter((p) => p.category === cat).map((p, pIdx) => (
                      <div
                        key={p.sku}
                        className={`glass-card rounded-2xl overflow-hidden group animate-fade-in-up stagger-${(pIdx % 6) + 1}`}
                        id={`product-${p.sku}`}
                      >
                        {/* Image */}
                        <div className="bg-[#242424] relative overflow-hidden">
                          {(() => {
                              // [ALTERADO] Coleta imagens: usa p.images (todas variantes concatenadas) ou,
                              // como fallback, concatena imagens de TODAS as variantes (não só a primeira)
                              const allImages: string[] = (p.images?.filter(Boolean) as string[] | undefined)?.length
                                ? (p.images as string[])
                                : (p.variants?.flatMap((v) => v.images?.filter(Boolean) || []) || []);
                              return allImages.length > 0 ? (
                            <ImageSlider images={allImages}
                              alt={p.name} onImageClick={(urls, idx) => setLightbox({ urls, idx })} />
                          ) : null;
                              // [ALTERADO] fim do IIFE de imagens
                            })()} 
                          {!((p.images?.filter(Boolean) as string[] | undefined)?.length || p.variants?.flatMap((v) => v.images?.filter(Boolean) || []).length) && (
                            p.image ? (
                            <div className="aspect-square overflow-hidden cursor-pointer" onClick={() => setLightbox({ urls: [toImageUrl(p.image)], idx: 0 })}>
                              <img src={toImageUrl(p.image)} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                            </div>
                          ) : (
                            <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-[#242424] to-[#1a1a1a]">
                              <div
                                className="h-20 w-20 rounded-full shadow-lg"
                                style={{ backgroundColor: p.color.hex || resolveColorHex(p.color.name, p.color.hex), boxShadow: `0 0 30px ${resolveColorHex(p.color.name, p.color.hex)}33` }}
                              />
                            </div>
                          )
                          )}
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
                          <div className="flex items-center gap-1.5 mb-2 min-h-[18px]">
                            {p.variants ? p.variants.map((v, vi) => (
                              <span key={vi} className="h-4 w-4 rounded-full border border-white/10 shadow-sm shrink-0"
                                title={v.colorName}
                                style={swatchStyle(v.colors, resolveColorHex(v.colorName, v.colorHex) || v.colorHex || "#e5e7eb")} />
                            )) : (
                              <span className="h-4 w-4 rounded-full border border-white/10 shadow-sm shrink-0"
                                title={p.color.name}
                                style={{ background: resolveColorHex(p.color.name, p.color.hex) || p.color.hex || "#e5e7eb" }} />
                            )}
                          </div>
                          <h3 className="font-semibold text-[#f5f5f5] text-base leading-snug">{p.name}</h3>
                          {p.description && (
                            <p className="mt-1 text-xs text-[#737373] leading-relaxed line-clamp-2">{p.description}</p>
                          )}

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xl font-extrabold gradient-text">{formatPrice(p.price)}</span>
                            <button
                              onClick={() => {
                                if (p.variants && p.variants.length > 1) {
                                  setPickerProduct(p);
                                  setPickerVar(0);
                                  setPickerQty(1);
                                } else {
                                  cart.add({
                                    sku: p.sku, name: p.name,
                                    colorName: p.variants ? p.variants[0].colorName : p.color.name,
                                    price: p.price, quantity: 1,
                                    image: p.variants ? p.variants[0].image : p.image,
                                    images: p.variants ? p.variants[0].images : p.images,
                                  });
                                }
                              }}
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

        {/* ═══════════ ORDERS VIEW (admin) ═══════════ */}
        {view === "orders" && (
          <div className="py-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-8">
              <button onClick={() => setView("catalog")}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2d2d2d] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#3a3a3a] transition-colors">
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
              <Package className="h-6 w-6 text-[#f97316]" />
              <h2 className="text-2xl font-bold text-[#f5f5f5]">Pedidos</h2>
              <span className="text-xs text-[#737373] bg-[#2d2d2d] px-2 py-0.5 rounded-full">{orders.length} total</span>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-20">
                <Package className="mx-auto h-12 w-12 text-[#404040] mb-4" />
                <h3 className="text-lg font-semibold text-[#a3a3a3] mb-2">Nenhum pedido ainda</h3>
                <p className="text-sm text-[#737373]">Os pedidos aparecerão aqui quando os clientes finalizarem a compra.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...orders].reverse().map((order) => (
                  <div key={order.id} className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleOrderStatus(order)}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                            order.status === "completed"
                              ? "bg-[#22c55e] border-[#22c55e] text-white"
                              : "border-[#404040] text-[#404040] hover:border-[#22c55e] hover:text-[#22c55e]"
                          }`}
                          title={order.status === "completed" ? "Marcar como pendente" : "Concluir pedido"}>
                          {order.status === "completed" && <Check className="h-4 w-4" />}
                        </button>
                        <div>
                          <span className="text-xs text-[#737373]">Pedido</span>
                          <p className="text-lg font-bold text-[#f5f5f5]">#{order.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.status === "completed" && (
                          <span className="text-[10px] font-semibold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">Concluído</span>
                        )}
                        <span className="text-xs text-[#737373]">{new Date(order.date).toLocaleString("pt-BR")}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 mb-4">
                      <div>
                        <span className="text-[10px] text-[#737373] uppercase tracking-wider">Cliente</span>
                        <p className="text-sm text-[#f5f5f5] font-medium">{order.name}</p>
                        <p className="text-xs text-[#a3a3a3]">{order.email}</p>
                        <p className="text-xs text-[#a3a3a3]">{order.phone}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#737373] uppercase tracking-wider">Entrega</span>
                        <p className="text-sm text-[#f5f5f5] font-medium">{order.delivery === "retirada" ? "Retira em mãos" : "Frete a combinar"}</p>
                        {order.address && <p className="text-xs text-[#a3a3a3]">{order.address}</p>}
                        {order.notes && <p className="text-xs text-[#737373] mt-1 italic">Obs: {order.notes}</p>}
                      </div>
                    </div>

                    <div className="border-t border-[#2d2d2d] pt-3">
                      <span className="text-[10px] text-[#737373] uppercase tracking-wider mb-2 block">Itens</span>
                      <div className="space-y-2">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-[#a3a3a3]">
                              {item.quantity}x <span className="text-[#f5f5f5]">{item.name}</span>
                              <span className="text-[#737373]"> ({item.colorName})</span>
                            </span>
                            <span className="text-[#f5f5f5] font-medium">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-[#2d2d2d] mt-3 pt-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-[#f5f5f5]">Total</span>
                        <span className="text-xl font-extrabold gradient-text">{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    <div className="border-t border-[#2d2d2d] mt-3 pt-3 flex justify-end gap-2">
                      <button onClick={() => startEditOrder(order)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#404040] bg-[#242424] px-3 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f97316] hover:border-[#f97316]/50 transition-colors">
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                      <button onClick={() => deleteOrder(order)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#404040] bg-[#242424] px-3 py-1.5 text-xs text-[#a3a3a3] hover:text-[#ef4444] hover:border-[#ef4444]/50 transition-colors">
                        <Trash2 className="h-3 w-3" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                          <img src={toImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
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

      {/* ═══════════ LIGHTBOX ═══════════ */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightbox(null)}
          onTouchStart={(e) => { lightboxTouchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (lightbox.urls.length <= 1) return;
            const diff = lightboxTouchX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
              const dir = diff > 0 ? 1 : -1;
              setLightbox((prev) => {
                if (!prev) return null;
                let next = prev.idx + dir;
                if (next < 0) next = prev.urls.length - 1;
                if (next >= prev.urls.length) next = 0;
                return { urls: prev.urls, idx: next };
              });
            }
          }}>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden rounded-2xl shadow-2xl">
              <div className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${lightbox.idx * 100}%)` }}>
                {lightbox.urls.map((url, i) => (
                  <div key={i} className="w-full shrink-0 flex items-center justify-center">
                    <img src={url} alt={`Ampliada ${i + 1}`} className="max-h-[85vh] max-w-[85vw] object-contain select-none" draggable={false} />
                  </div>
                ))}
              </div>
            </div>
            {lightbox.urls.length > 1 && (
              <>
                <button onClick={() => setLightbox((prev) => prev ? { ...prev, idx: prev.idx === 0 ? prev.urls.length - 1 : prev.idx - 1 } : null)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-lg">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => setLightbox((prev) => prev ? { ...prev, idx: prev.idx >= prev.urls.length - 1 ? 0 : prev.idx + 1 } : null)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-lg">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {lightbox.urls.map((_, i) => (
                    <div key={i} className={`rounded-full transition-all duration-300 ${i === lightbox.idx ? "h-2.5 w-2.5 bg-[#f97316] scale-110" : "h-2 w-2 bg-white/40"}`} />
                  ))}
                </div>
              </>
            )}
            <button onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-[#2d2d2d] border border-[#404040] text-[#f5f5f5] flex items-center justify-center hover:bg-[#3a3a3a] transition-colors shadow-lg">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ VARIANT PICKER ═══════════ */}
      {pickerProduct && pickerProduct.variants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setPickerProduct(null)}>
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}>
            {(() => {
              const curVar = pickerProduct.variants![pickerVar];
              const varImgs = curVar?.images?.filter(Boolean) || (curVar?.image ? [curVar.image] : []);
              return varImgs.length > 0 ? (
                varImgs.length === 1 ? (
                  <img src={toImageUrl(varImgs[0])} alt="" className="w-full aspect-square object-cover bg-[#242424]" />
                ) : (
                  <ImageSlider images={varImgs} alt="" onImageClick={(urls, idx) => setLightbox({ urls, idx })} />
                )
              ) : null;
            })()}
            <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#f5f5f5]">Selecionar Cor</h3>
              <button onClick={() => setPickerProduct(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#737373] hover:text-[#f5f5f5] hover:bg-[#2d2d2d] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-[#a3a3a3] mb-4">{pickerProduct.name}</p>

            <div className="flex flex-wrap gap-3 mb-5">
              {pickerProduct.variants.map((v, vi) => {
                const active = pickerVar === vi;
                const out = v.stock <= 0;
                return (
                  <button key={vi} type="button" onClick={() => !out && setPickerVar(vi)} disabled={out}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                      active ? "border-[#f97316] bg-[#f97316]/5" : out ? "border-[#2d2d2d] opacity-40 cursor-not-allowed" : "border-[#404040] hover:border-[#525252] bg-[#242424]"
                    }`}>
                    <span className="h-5 w-5 rounded-full border border-white/10 shrink-0"
                      style={swatchStyle(v.colors, v.colorHex || resolveColorHex(v.colorName, v.colorHex) || "#e5e7eb")} />
                    <div className="text-left">
                      <span className={`text-sm font-medium ${active ? "text-[#f97316]" : "text-[#f5f5f5]"}`}>{v.colorName}</span>
                      {out && <p className="text-[10px] text-[#737373]">Indisponível</p>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-[#2d2d2d] pt-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPickerQty(Math.max(1, pickerQty - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#404040] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#2d2d2d] transition-colors">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-semibold text-[#f5f5f5]">{pickerQty}</span>
                <button type="button" onClick={() => setPickerQty(pickerQty + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#404040] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#2d2d2d] transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <button onClick={() => {
                const v = pickerProduct.variants![pickerVar];
                if (!v || v.stock <= 0) return;
                cart.add({
                  sku: pickerProduct.sku, name: pickerProduct.name,
                  colorName: v.colorName, price: pickerProduct.price,
                  quantity: pickerQty, image: v.image, images: v.images,
                });
                setPickerProduct(null);
              }}
                className="btn-primary rounded-xl px-5 py-2.5 text-sm">
                <span>Adicionar</span>
              </button>
            </div>
            </div>
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
          colors={colors}
          categories={managedCategories}
          products={products}
          onSubmit={handleSaveProduct}
          onCancel={() => { setShowProductForm(false); setEditingProduct(null); }}
        />
      </Modal>

      <CategoryColorForm type="category" open={showCategoryForm} onClose={() => { setShowCategoryForm(false); loadCategories(); }} />
      <CategoryColorForm type="color" open={showColorForm} onClose={() => { setShowColorForm(false); loadColors(); }} />
      <CategoryColorForm type="material" open={showMaterialForm} onClose={() => { setShowMaterialForm(false); loadMaterials(); }} />

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

      {/* ═══════════ EDIT ORDER MODAL ═══════════ */}
      <Modal open={!!editingOrder} onClose={() => setEditingOrder(null)} title={`Editar Pedido #${editingOrder?.id || ""}`}>
        {editingOrder && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            {/* Customer info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#f5f5f5]">Cliente</h3>
              <div>
                <label className="block text-xs text-[#737373] mb-1">Nome</label>
                <input value={editForm.name} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-[#404040] bg-[#242424] px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#525252] focus:outline-none focus:border-[#f97316] transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-[#737373] mb-1">Email</label>
                <input value={editForm.email} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-[#404040] bg-[#242424] px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#525252] focus:outline-none focus:border-[#f97316] transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-[#737373] mb-1">Telefone</label>
                <input value={editForm.phone} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-[#404040] bg-[#242424] px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#525252] focus:outline-none focus:border-[#f97316] transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-[#737373] mb-1">Endereço</label>
                <input value={editForm.address} onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full rounded-lg border border-[#404040] bg-[#242424] px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#525252] focus:outline-none focus:border-[#f97316] transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-[#737373] mb-1">Observações</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-lg border border-[#404040] bg-[#242424] px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#525252] focus:outline-none focus:border-[#f97316] transition-colors resize-none" rows={2} />
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-[#2d2d2d] pt-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#f5f5f5]">Itens</h3>
                <button onClick={addEditItem}
                  className="flex items-center gap-1 text-xs text-[#f97316] hover:text-[#fb923c] transition-colors">
                  <Plus className="h-3 w-3" /> Adicionar item
                </button>
              </div>
              <div className="space-y-3">
                {editItems.map((item: any, idx: number) => {
                  const prod = products.find((p: Product) => p.sku === item._selectedSku);
                  const variants = prod?.variants || [];
                  return (
                    <div key={idx} className="rounded-xl border border-[#2d2d2d] bg-[#1f1f1f] p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] text-[#737373] uppercase">Item {idx + 1}</span>
                        <button onClick={() => removeEditItem(idx)}
                          className="text-[#737373] hover:text-[#ef4444] transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid gap-2">
                        <select value={item._selectedSku} onChange={(e) => {
                          const p = products.find((x: Product) => x.sku === e.target.value);
                          if (!p) return;
                          const v = p.variants?.[0];
                          const next = [...editItems];
                          next[idx] = {
                            sku: p.sku, name: p.name, price: p.price, quantity: next[idx].quantity,
                            colorName: v?.colorName || "", image: v?.image || null, images: v?.images || null,
                            _selectedSku: p.sku, _selectedVariantIdx: 0,
                          };
                          setEditItems(next);
                        }}
                          className="w-full rounded-lg border border-[#404040] bg-[#242424] px-2.5 py-2 text-xs text-[#f5f5f5] focus:outline-none focus:border-[#f97316] transition-colors">
                          {products.map((p: Product) => (
                            <option key={p.sku} value={p.sku}>{p.sku} — {p.name}</option>
                          ))}
                        </select>
                        {variants.length > 0 && (
                          <select value={item._selectedVariantIdx} onChange={(e) => {
                            const vi = parseInt(e.target.value);
                            updateEditItem(idx, item._selectedSku, vi);
                          }}
                            className="w-full rounded-lg border border-[#404040] bg-[#242424] px-2.5 py-2 text-xs text-[#f5f5f5] focus:outline-none focus:border-[#f97316] transition-colors">
                            {variants.map((v: any, vi: number) => (
                              <option key={vi} value={vi}>
                                {v.colorName}{v.colorHex ? ` ●` : ""} {v.stock > 0 ? `(est: ${v.stock})` : "(indisponível)"}
                              </option>
                            ))}
                          </select>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateEditItemQty(idx, item.quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#404040] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#2d2d2d] transition-colors">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-7 text-center text-sm font-semibold text-[#f5f5f5]">{item.quantity}</span>
                            <button onClick={() => updateEditItemQty(idx, item.quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#404040] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#2d2d2d] transition-colors">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-bold gradient-text">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-[#2d2d2d] mt-3 pt-3 flex items-center justify-between">
                <span className="text-xs text-[#737373]">Total</span>
                <span className="text-lg font-extrabold gradient-text">{formatPrice(editItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0))}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2d2d2d]">
              <button onClick={() => setEditingOrder(null)}
                className="rounded-lg border border-[#404040] px-4 py-2 text-sm text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
                Cancelar
              </button>
              <button onClick={saveEditOrder}
                className="btn-primary rounded-lg px-4 py-2 text-sm">
                Salvar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

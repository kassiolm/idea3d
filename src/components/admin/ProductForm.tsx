import { useState, useMemo } from "react";
import { Plus, X } from "lucide-react";
import type { Product, Color, ProductVariant } from "../../types";

interface Props {
  product?: Product;
  colors: Color[];
  categories: string[];
  products?: Product[];
  onSubmit: (data: {
    sku: string; name: string; description?: string; category: string;
    price: number; stock: number; color_id: number; image: string; images?: string[];
    variants?: ProductVariant[];
  }) => void;
  onCancel: () => void;
}

const NONE = -1;

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0].toUpperCase()).join("");
}

function nextNumber(initials: string, existing: Product[]): string {
  const re = new RegExp(`^SKU-${initials}(\\d{2})`);
  const max = existing.map((p) => p.sku?.match(re)).filter(Boolean).map((m) => parseInt(m![1], 10))
    .reduce((a, b) => Math.max(a, b), 0);
  return String(max + 1).padStart(2, "0");
}

function toImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  return url;
}

function makeid() { return Date.now() + Math.random(); }

function colorEntry(c: Color): { id: number; name: string; hex: string } {
  return { id: c.id, name: c.name, hex: (c as any).hex || "#e5e7eb" };
}

export default function ProductForm({ product, colors, categories, products = [], onSubmit, onCancel }: Props) {
  const [sku, setSku] = useState(product?.sku || "");
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [category, setCategory] = useState(product?.category || categories[0] || "");
  const [price, setPrice] = useState(product?.price || 0);

  function initVariants(): ProductVariant[] {
    if (product?.variants) {
      return product.variants.map((v) => {
        const cols = v.colors?.length ? v.colors : [colorEntry(colors.find((c) => c.id === v.colorId) || colors.find((c) => c.name === v.colorName) || colors[0] || { id: 0, name: "", code: "", hex: "#e5e7eb" })];
        const match = colors.find((c) => c.id === v.colorId) || colors.find((c) => c.name === v.colorName);
        const c0 = match || colors[0] || { id: 0, name: "", code: "", hex: "#e5e7eb" };
        return { ...v, colorId: c0.id, colorName: c0.name, colorCode: c0.code, colorHex: (c0 as any).hex, colors: cols, images: v.images || (v.image ? [v.image] : []) };
      });
    }
    return [buildVariantFromSequence(0)];
  }

  function buildVariantFromSequence(startIdx: number): ProductVariant {
    const c0 = colors[startIdx] || colors[0] || { id: 1, name: "", code: "", hex: "" };
    const cols = [colorEntry(c0)];
    const c1 = colors[startIdx + 1];
    if (c1) cols.push(colorEntry(c1));
    const c2 = colors[startIdx + 2];
    if (c2) cols.push(colorEntry(c2));
    return {
      colorId: c0.id, colorName: c0.name, colorCode: c0.code, colorHex: (c0 as any).hex,
      colors: cols, stock: 0, image: null, images: [],
    };
  }
  const [variants, setVariants] = useState<ProductVariant[]>(initVariants);
  const [error, setError] = useState("");

  const computedSku = useMemo(() => {
    if (product) return sku;
    const initials = getInitials(name);
    if (!initials) return "";
    const num = nextNumber(initials, products);
    return `SKU-${initials}${num}`;
  }, [name, product, products, sku]);

  function addVariant() {
    const nextIdx = variants.length;
    setVariants([...variants, buildVariantFromSequence(nextIdx)]);
  }

  function syncVariant(v: ProductVariant): ProductVariant {
    const c0 = v.colors?.[0];
    if (c0) {
      const match = colors.find((co) => co.id === c0.id);
      return { ...v, colorId: c0.id, colorName: c0.name, colorCode: match?.code || "", colorHex: c0.hex };
    }
    return v;
  }

  function updateVariantColor(i: number, slotIdx: number, colorId: number) {
    const next = [...variants];
    const cols = [...(next[i].colors || [])];
    if (colorId === NONE) {
      cols.splice(slotIdx, 1);
    } else {
      const c = colors.find((co) => co.id === colorId);
      if (c) {
        const h = (c as any).hexes as string[] | undefined;
        if (slotIdx === 0 && h && h.length >= 2) {
          const newCols = h.map((hex: string) => ({ id: c.id, name: c.name, hex }));
          next[i] = syncVariant({ ...next[i], colors: newCols });
          setVariants(next);
          return;
        }
        if (slotIdx < cols.length) cols[slotIdx] = colorEntry(c);
        else cols.push(colorEntry(c));
        if (slotIdx === 0) autoFillSlots(cols, colorId);
      }
    }
    if (!cols.length) {
      const c = colors[0];
      cols.push(colorEntry(c || { id: 0, name: "", code: "", hex: "#e5e7eb" }));
    }
    next[i] = syncVariant({ ...next[i], colors: cols });
    setVariants(next);
  }

  function autoFillSlots(cols: { id: number; name: string; hex: string }[], colorId: number) {
    const idx = colors.findIndex((co) => co.id === colorId);
    if (idx < 0) return;
    const n1 = colors[idx + 1];
    if (n1) {
      if (cols.length < 2) cols.push(colorEntry(n1));
      else cols[1] = colorEntry(n1);
    }
    const n2 = colors[idx + 2];
    if (n2) {
      if (cols.length < 3) cols.push(colorEntry(n2));
      else cols[2] = colorEntry(n2);
    }
  }

  function updateVariant(i: number, field: string, value: any) {
    const next = [...variants];
    (next[i] as any)[field] = value;
    setVariants(next);
  }

  function addVariantImage(i: number) {
    const next = [...variants];
    next[i] = { ...next[i], images: [...(next[i].images || []), ""] };
    setVariants(next);
  }

  function setVariantImage(i: number, imgIdx: number, val: string) {
    const next = [...variants];
    const imgs = [...(next[i].images || [])];
    imgs[imgIdx] = val;
    next[i] = { ...next[i], images: imgs, image: imgs[0] || null };
    setVariants(next);
  }

  function removeVariantImage(i: number, imgIdx: number) {
    const next = [...variants];
    const imgs = (next[i].images || []).filter((_, idx) => idx !== imgIdx);
    next[i] = { ...next[i], images: imgs.length ? imgs : [], image: imgs[0] || null };
    setVariants(next);
  }

  function removeVariant(i: number) {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    setError("");
    const cleanedVariants = variants.map((v) => ({
      ...v,
      colors: v.colors?.filter((c) => c && c.id !== NONE),
    }));
    const isMulti = cleanedVariants.length > 1 || cleanedVariants.some((v) => v.stock !== cleanedVariants[0].stock || v.image !== cleanedVariants[0].image);
    const totalStock = cleanedVariants.reduce((s, v) => s + v.stock, 0);
    onSubmit({
      sku: product ? sku : computedSku,
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      price,
      stock: totalStock,
      color_id: cleanedVariants[0].colorId,
      image: cleanedVariants[0].image || "",
      images: cleanedVariants[0].images,
      variants: isMulti ? cleanedVariants : undefined,
    });
  }

  function slotSelect(i: number, slotIdx: number) {
    const v = variants[i];
    const entry = v.colors?.[slotIdx];
    return (
      <select value={entry ? entry.id : NONE} onChange={(e) => updateVariantColor(i, slotIdx, parseFloat(e.target.value))}
        className="w-full rounded-lg border border-[#404040] bg-[#1a1a1a] px-2 py-1.5 text-xs text-[#f5f5f5] outline-none">
        {slotIdx > 0 && <option value={NONE}>Nenhuma</option>}
        {colors.map((c) => (
          <option key={c.id} value={c.id}>{c.name} ({(c as any).code}){(c as any).hex && ` ●`}</option>
        ))}
      </select>
    );
  }

  const f = "w-full rounded-xl border border-[#404040] bg-[#242424] px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#525252] focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] outline-none transition-all";
  const l = "block text-sm font-medium text-[#a3a3a3] mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-[#ef4444] bg-[#ef4444]/10 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={l}>SKU</label>
          <input value={product ? sku : computedSku} onChange={(e) => setSku(e.target.value)}
            placeholder="Automático" className={f} disabled={!product} readOnly={!product} />
        </div>
        <div>
          <label className={l}>Categoria</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={f}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={l}>Nome *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Gancho Box" className={f} />
      </div>

      <div>
        <label className={l}>Descrição</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do produto..." rows={3} className={`${f} resize-none`} />
      </div>

      <div>
        <label className={l}>Preço (R$)</label>
        <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className={f} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={l}>Variações de Cor</label>
          <button type="button" onClick={addVariant}
            className="text-xs text-[#f97316] hover:text-[#fb923c] flex items-center gap-1 transition-colors">
            <Plus className="h-3 w-3" /> Adicionar cor
          </button>
        </div>
        <div className="space-y-3">
          {variants.map((v, i) => (
            <div key={i} className="rounded-xl border border-[#404040] bg-[#242424] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#737373] font-medium">Variante {i + 1}</span>
                  {v.colors && (
                    <span className="h-4 w-4 rounded-full border border-white/10 shrink-0"
                      style={{ background: v.colors.length > 1
                        ? `conic-gradient(${v.colors.map((c, ci, a) => {
                            const deg = 360 / a.length;
                            return `${c.hex} ${ci * deg}deg ${(ci + 1) * deg}deg`;
                          }).join(", ")})`
                        : v.colors[0].hex }} />
                  )}
                </div>
                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(i)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-[#737373] hover:text-[#ef4444] transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] text-[#737373] block mb-0.5">Cor 1</span>
                  {slotSelect(i, 0)}
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] block mb-0.5">Cor 2</span>
                  {slotSelect(i, 1)}
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] block mb-0.5">Cor 3</span>
                  {slotSelect(i, 2)}
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] block mb-0.5">Estoque</span>
                  <input type="number" min="0" value={v.stock} onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-[#404040] bg-[#1a1a1a] px-2 py-1.5 text-xs text-[#f5f5f5] outline-none" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#737373]">Imagens</span>
                  <button type="button" onClick={() => addVariantImage(i)}
                    className="text-[10px] text-[#f97316] hover:text-[#fb923c] flex items-center gap-0.5 transition-colors">
                    <Plus className="h-2.5 w-2.5" /> URL
                  </button>
                </div>
                {(v.images || []).map((img, imgIdx) => (
                  <div key={imgIdx} className="flex gap-1.5 mb-1.5">
                    <input value={img} onChange={(e) => setVariantImage(i, imgIdx, e.target.value)}
                      placeholder={`URL ${imgIdx + 1}`} className="w-full rounded-lg border border-[#404040] bg-[#1a1a1a] px-2 py-1.5 text-xs text-[#f5f5f5] placeholder-[#525252] outline-none" />
                    {(v.images?.length || 0) > 1 && (
                      <button type="button" onClick={() => removeVariantImage(i, imgIdx)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#404040] text-[#737373] hover:text-[#ef4444] transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {(v.images || []).some(Boolean) && (
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {(v.images || []).filter(Boolean).map((img, imgIdx) => (
                      <img key={imgIdx} src={toImageUrl(img)} alt=""
                        className="h-10 w-10 rounded-lg object-cover border border-[#404040]" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="rounded-xl border border-[#404040] bg-[#242424] px-5 py-3 text-sm text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
          Cancelar
        </button>
        <button type="submit" className="btn-primary flex-1 rounded-xl py-3 text-sm">
          <span>{product ? "Salvar Alterações" : "Criar Produto"}</span>
        </button>
      </div>
    </form>
  );
}

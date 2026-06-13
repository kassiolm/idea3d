import { useState } from "react";
import type { Product, Color } from "../../types";

interface ProductFormData {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  color_id: number;
  image: string;
}

interface Props {
  product?: Product;
  colors: Color[];
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
}

const CATEGORIES = ["Organizadores", "Utilitários", "Acessórios", "Decoração"];

export default function ProductForm({ product, colors, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<ProductFormData>({
    sku: product?.sku || "",
    name: product?.name || "",
    category: product?.category || CATEGORIES[0],
    price: product?.price || 0,
    stock: product?.stock ?? 0,
    color_id: product?.color_id || colors[0]?.id || 1,
    image: product?.image || "",
  });
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sku.trim() || !form.name.trim()) {
      setError("SKU e Nome são obrigatórios");
      return;
    }
    setError("");
    onSubmit(form);
  }

  const fieldClass = "w-full rounded-xl border border-[#404040] bg-[#242424] px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#525252] focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] outline-none transition-all";
  const labelClass = "block text-sm font-medium text-[#a3a3a3] mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-[#ef4444] bg-[#ef4444]/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>SKU *</label>
          <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ex: SKU-MP01WH" className={fieldClass} disabled={!!product} />
        </div>
        <div>
          <label className={labelClass}>Categoria</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={fieldClass}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Nome *</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do produto" className={fieldClass} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Preço (R$)</label>
          <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Estoque</label>
          <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className={fieldClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Cor</label>
        <select value={form.color_id} onChange={(e) => setForm({ ...form, color_id: parseInt(e.target.value) })} className={fieldClass}>
          {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}>URL da Imagem</label>
        <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/images/produto.webp" className={fieldClass} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 rounded-xl py-3 text-sm">
          <span>{product ? "Salvar Alterações" : "Criar Produto"}</span>
        </button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-[#404040] bg-[#242424] py-3 text-sm text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
}

import { AlertTriangle } from "lucide-react";
import type { Product } from "../../types";

interface Props {
  product: Product;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DeleteConfirm({ product, onConfirm, onCancel, loading }: Props) {
  return (
    <div className="text-center space-y-5">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20">
        <AlertTriangle className="h-8 w-8 text-[#ef4444]" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-[#f5f5f5]">Excluir Produto</h3>
        <p className="mt-1 text-sm text-[#a3a3a3]">
          Tem certeza que deseja excluir <span className="font-semibold text-[#f5f5f5]">{product.name}</span> ({product.sku})?
        </p>
        <p className="text-xs text-[#737373] mt-1">Esta ação não pode ser desfeita.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={loading} className="flex-1 rounded-xl border border-[#404040] bg-[#242424] py-3 text-sm text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors disabled:opacity-50">
          Cancelar
        </button>
        <button onClick={onConfirm} disabled={loading} className="flex-1 rounded-xl bg-[#ef4444] py-3 text-sm font-semibold text-white hover:bg-[#dc2626] transition-colors disabled:opacity-50">
          {loading ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </div>
  );
}

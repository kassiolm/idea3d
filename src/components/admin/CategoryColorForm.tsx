import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import Modal from "../ui/Modal";
import { saveColors, saveCategories, saveMaterials } from "../../lib/db";

interface Item {
  id?: number;
  name: string;
  code?: string;
  hex?: string;
  hexes?: string[];
}

interface Props {
  type: "category" | "color" | "material";
  open: boolean;
  onClose: () => void;
}

function makeid() {
  return Date.now() + Math.random();
}

function swatchPreview(item: Item): string {
  const h = item.hexes?.filter(Boolean) || [];
  if (h.length >= 2) {
    const n = h.length;
    const stops = h.map((hex, i) => `${hex} ${(i * 360 / n)}deg ${((i + 1) * 360 / n)}deg`).join(", ");
    return `conic-gradient(${stops})`;
  }
  return item.hex || "#e5e7eb";
}

const STORAGE_KEY = { category: "local_categories", color: "local_colors", material: "local_materials" } as const;

export default function CategoryColorForm({ type, open, onClose }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [edit, setEdit] = useState<Item | null>(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newHex, setNewHex] = useState("#e5e7eb");
  const [newHexes, setNewHexes] = useState<string[]>(["#e5e7eb"]);

  const storageKey = STORAGE_KEY[type];
  const label = type === "color" ? "Cor" : type === "material" ? "Material" : "Categoria";
  const isColor = type === "color";

  function loadItems(): Item[] {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (saved.length > 0) return saved;
    if (type === "category") {
      return ["Organizadores", "Utilitários", "Acessórios", "Decoração"].map((n) => ({ id: makeid(), name: n }));
    }
    if (type === "color") {
      return [
        { id: makeid(), name: "Preta", code: "BK", hex: "#1f2937", hexes: ["#1f2937"] }, { id: makeid(), name: "Branca", code: "WH", hex: "#f9fafb", hexes: ["#f9fafb"] },
        { id: makeid(), name: "Vermelha", code: "RD", hex: "#ef4444", hexes: ["#ef4444"] }, { id: makeid(), name: "Azul", code: "BL", hex: "#3b82f6", hexes: ["#3b82f6"] },
        { id: makeid(), name: "Verde", code: "GN", hex: "#22c55e", hexes: ["#22c55e"] }, { id: makeid(), name: "Amarela", code: "YL", hex: "#eab308", hexes: ["#eab308"] },
        { id: makeid(), name: "Rosa", code: "PK", hex: "#ec4899", hexes: ["#ec4899"] }, { id: makeid(), name: "Cinza", code: "GY", hex: "#9ca3af", hexes: ["#9ca3af"] },
        { id: makeid(), name: "Laranja", code: "OR", hex: "#f97316", hexes: ["#f97316"] }, { id: makeid(), name: "Marrom", code: "BR", hex: "#78350f", hexes: ["#78350f"] },
        { id: makeid(), name: "Bege", code: "BG", hex: "#d6a354", hexes: ["#d6a354"] }, { id: makeid(), name: "Roxa", code: "PL", hex: "#a855f7", hexes: ["#a855f7"] },
        { id: makeid(), name: "Prata", code: "SL", hex: "#cbd5e1", hexes: ["#cbd5e1"] }, { id: makeid(), name: "Dourada", code: "GD", hex: "#f59e0b", hexes: ["#f59e0b"] },
        { id: makeid(), name: "Transparente", code: "TR", hex: "#e5e7eb", hexes: ["#e5e7eb"] },
      ];
    }
    if (type === "material") {
      return ["PLA", "ABS", "PETG", "TPU", "Nylon", "Resina"].map((n) => ({ id: makeid(), name: n }));
    }
    return [];
  }

  useEffect(() => {
    if (open) {
      setItems(loadItems());
      resetForm();
    }
  }, [open, type]);

  function resetForm() {
    setEdit(null);
    setNewName("");
    setNewCode("");
    setNewHex("#e5e7eb");
    setNewHexes(["#e5e7eb"]);
  }

  async function persist(items: Item[]) {
    setItems(items);
    localStorage.setItem(storageKey, JSON.stringify(items));
    if (type === "color") await saveColors(items);
    else if (type === "category") await saveCategories(items.map((i) => i.name));
    else if (type === "material") await saveMaterials(items.map((i) => i.name));
  }

  async function add() {
    if (!newName.trim()) return;
    const hexes = newHexes.filter(Boolean);
    const payload: Item = { id: makeid(), name: newName.trim() };
    if (isColor) {
      payload.code = newCode.trim().toUpperCase() || undefined;
      payload.hex = hexes[0] || "#e5e7eb";
      payload.hexes = hexes.length > 1 ? hexes : [payload.hex];
    }
    await persist([...items, payload]);
    resetForm();
  }

  async function update() {
    if (!edit || !newName.trim()) return;
    const hexes = newHexes.filter(Boolean);
    const payload: any = { name: newName.trim() };
    if (isColor) {
      payload.code = newCode.trim().toUpperCase() || undefined;
      payload.hex = hexes[0] || "#e5e7eb";
      payload.hexes = hexes.length > 1 ? hexes : [payload.hex];
    }
    await persist(items.map((i) => (i.id === edit.id ? { ...i, ...payload } : i)));
    resetForm();
  }

  async function remove(item: Item) {
    if (!confirm(`Excluir ${item.name}?`)) return;
    await persist(items.filter((i) => i.id !== item.id));
  }

  function startEdit(item: Item) {
    setEdit(item);
    setNewName(item.name);
    setNewCode(item.code || "");
    setNewHex((item.hexes?.[0] || item.hex) || "#e5e7eb");
    setNewHexes((item.hexes?.filter(Boolean).length ? item.hexes! : [(item.hex || "#e5e7eb")]));
  }

  const isMulti = newHexes.length >= 2;

  return (
    <Modal open={open} onClose={onClose} title={`Gerenciar ${label}s`}>
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder={`Nome da ${label.toLowerCase()}`}
            className="min-w-0 flex-1 rounded-xl border border-[#404040] bg-[#242424] px-4 py-2 text-sm text-[#f5f5f5] placeholder-[#525252] focus:border-[#f97316] outline-none" />
          {isColor && (
            <>
              <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="Código" maxLength={4}
                className="w-20 rounded-xl border border-[#404040] bg-[#242424] px-3 py-2 text-sm text-[#f5f5f5] uppercase placeholder-[#525252] focus:border-[#f97316] outline-none" />
              <div className="flex items-center gap-2">
                <input type="color" value={newHexes[0] || "#e5e7eb"}
                  onChange={(e) => setNewHexes([e.target.value, ...newHexes.slice(1)])}
                  className="h-10 w-10 rounded-xl border border-[#404040] bg-[#242424] cursor-pointer p-0.5" />
                {isMulti && (
                  <>
                    <input type="color" value={newHexes[1] || "#e5e7eb"}
                      onChange={(e) => {
                        const n = [...newHexes];
                        n[1] = e.target.value;
                        setNewHexes(n);
                      }}
                      className="h-10 w-10 rounded-xl border border-[#404040] bg-[#242424] cursor-pointer p-0.5" />
                    <input type="color" value={newHexes[2] || "#e5e7eb"}
                      onChange={(e) => {
                        const n = [...newHexes];
                        n[2] = e.target.value;
                        setNewHexes(n);
                      }}
                      className="h-10 w-10 rounded-xl border border-[#404040] bg-[#242424] cursor-pointer p-0.5" />
                  </>
                )}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-[#a3a3a3] cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={isMulti}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const h = [...newHexes];
                      while (h.length < 3) h.push("#e5e7eb");
                      setNewHexes(h);
                    } else {
                      setNewHexes([newHexes[0] || "#e5e7eb"]);
                    }
                  }}
                  className="rounded border-[#404040] bg-[#242424] text-[#f97316] focus:ring-[#f97316]" />
                Multi
              </label>
            </>
          )}
          <button onClick={edit ? update : add} type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f97316] text-white hover:bg-[#ea580c] transition-colors shrink-0">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-[#2d2d2d] max-h-60 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                {type === "color" && (
                  <span className="h-4 w-4 rounded-full border border-white/10 shadow-sm shrink-0"
                    style={{ background: swatchPreview(item) }} />
                )}
                <span className="text-sm text-[#f5f5f5]">{item.name}</span>
                {item.code && <span className="text-[10px] text-[#737373] uppercase">{item.code}</span>}
                {isColor && item.hexes && item.hexes.length >= 2 && (
                  <span className="text-[10px] text-[#f97316] font-medium">● Multi</span>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(item)} type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#737373] hover:text-[#f97316] hover:bg-[#2d2d2d] transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(item)} type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#737373] hover:text-[#ef4444] hover:bg-[#2d2d2d] transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { fetchColors, saveColors, fetchCategories, saveCategories, fetchMaterials, saveMaterials } from "../../lib/db";

interface Props { type: "category" | "color" | "material"; open: boolean; onClose: () => void; }

interface Item { id: number | string; name: string; code?: string; hex?: string; hexes?: string[]; }

let _cid = Date.now();
function makeid() { return _cid++; }

function hexVal(item: Item): string {
  if (item.hexes?.length && item.hexes.filter(Boolean).length > 1) {
    const n = item.hexes.length;
    return `conic-gradient(${item.hexes.map((h, i) => `${h} ${(i * 360 / n)}deg ${((i + 1) * 360 / n)}deg`).join(", ")})`;
  }
  return item.hex || "#e5e7eb";
}

export default function CategoryColorForm({ type, open, onClose }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [edit, setEdit] = useState<Item | null>(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newHex, setNewHex] = useState("#e5e7eb");
  const [newHexes, setNewHexes] = useState<string[]>(["#e5e7eb"]);
  const [loading, setLoading] = useState(false);

  const label = type === "color" ? "Cor" : type === "material" ? "Material" : "Categoria";
  const isColor = type === "color";

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      let loaded: Item[] = [];
      if (type === "color") {
        const fromDb = await fetchColors();
        if (fromDb.length > 0) {
          loaded = fromDb.map((c: any) => ({ id: c.id, name: c.name, code: c.code || "", hex: c.hex || "#e5e7eb", hexes: c.hexes?.filter(Boolean)?.length ? c.hexes : [c.hex || "#e5e7eb"] }));
        }
      } else if (type === "category") {
        const fromDb = await fetchCategories();
        loaded = fromDb.length > 0 ? fromDb.map((n) => ({ id: makeid(), name: n })) : [];
      } else if (type === "material") {
        const fromDb = await fetchMaterials();
        loaded = fromDb.length > 0 ? fromDb.map((n) => ({ id: makeid(), name: n })) : [];
      }
      setItems(loaded);
      setLoading(false);
      resetForm();
    })();
  }, [open, type]);

  function resetForm() {
    setEdit(null);
    setNewName("");
    setNewCode("");
    setNewHex("#e5e7eb");
    setNewHexes(["#e5e7eb"]);
  }

  async function persist(newItems: Item[]) {
    setItems(newItems);
    if (type === "color") await saveColors(newItems);
    else if (type === "category") await saveCategories(newItems.map((i) => i.name));
    else if (type === "material") await saveMaterials(newItems.map((i) => i.name));
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

  function selectColorForEdit(item: Item) {
    setEdit(item);
    setNewName(item.name);
    setNewCode(item.code || "");
    if (item.hexes?.filter(Boolean).length) {
      setNewHexes(item.hexes);
      setNewHex(item.hexes[0] || "#e5e7eb");
    } else {
      setNewHexes([item.hex || "#e5e7eb"]);
      setNewHex(item.hex || "#e5e7eb");
    }
  }

  const hasMulti = newHexes.filter(Boolean).length > 1;

  return (
    <Modal open={open} onClose={onClose} title={`Gerenciar ${label}${label === "Material" ? "s" : "es"}`}>
      <form onSubmit={(e) => { e.preventDefault(); edit ? update() : add(); }} className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Nome</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`Nova ${label.toLowerCase()}`} className="w-full px-3 py-2 rounded-lg bg-[#252525] border border-[#333] text-white text-sm focus:outline-none focus:border-[#f97316]" />
          </div>
          {isColor && (
            <div className="w-20">
              <label className="block text-xs text-gray-400 mb-1">Código</label>
              <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="BK" maxLength={4} className="w-full px-3 py-2 rounded-lg bg-[#252525] border border-[#333] text-white text-sm focus:outline-none focus:border-[#f97316]" />
            </div>
          )}
          <button type="submit" className="px-4 py-2 rounded-lg bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea580c] transition-colors whitespace-nowrap">
            {edit ? "Salvar" : "Adicionar"}
          </button>
        </div>
        {isColor && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={hasMulti} onChange={() => setNewHexes(hasMulti ? [newHex] : [newHex, "#e5e7eb"])} className="accent-[#f97316]" />
              Multicolorido (até 3 cores)
            </label>
            <div className="flex flex-wrap gap-3">
              {newHexes.map((h, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <label className="text-[10px] text-gray-500">Cor {i + 1}</label>
                  <input type="color" value={h || "#e5e7eb"} onChange={(e) => { const next = [...newHexes]; next[i] = e.target.value; setNewHexes(next); }} className="w-8 h-8 rounded cursor-pointer border border-[#333]" />
                  {hasMulti && i > 0 && (
                    <button type="button" onClick={() => setNewHexes(newHexes.filter((_, j) => j !== i))} className="text-[10px] text-red-400 hover:text-red-300">&times;</button>
                  )}
                </div>
              ))}
              {hasMulti && newHexes.length < 3 && (
                <button type="button" onClick={() => setNewHexes([...newHexes, "#e5e7eb"])} className="text-xs text-[#f97316] hover:underline">+ adicionar cor</button>
              )}
            </div>
          </div>
        )}
      </form>

      <div className="mt-6 space-y-2 max-h-64 overflow-y-auto">
        {loading ? (
          <p className="text-center text-gray-500 text-sm py-4">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">Nenhum {label.toLowerCase()} cadastrado.</p>
        ) : items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#252525] border border-[#333] group">
            <div className="flex items-center gap-2">
              {isColor && (
                <span className="inline-block w-5 h-5 rounded-full border border-[#444] flex-shrink-0" style={{ background: hexVal(item) }} />
              )}
              <span className="text-sm text-gray-200">{item.name}</span>
              {item.code && <span className="text-[10px] text-gray-500">({item.code})</span>}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => selectColorForEdit(item)} className="p-1.5 rounded-lg text-gray-500 hover:text-[#f97316] hover:bg-[#2a2a2a] transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button type="button" onClick={() => remove(item)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-[#2a2a2a] transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

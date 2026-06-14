import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import Modal from "../ui/Modal";

interface Item {
  id?: number;
  name: string;
  code?: string;
}

interface Props {
  type: "category" | "color";
  open: boolean;
  onClose: () => void;
}

function makeid() {
  return Date.now() + Math.random();
}

export default function CategoryColorForm({ type, open, onClose }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [edit, setEdit] = useState<Item | null>(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  function load() {
    if (type === "color") {
      supabase.from("colors").select("*").order("id").then(({ data }) => {
        if (data) setItems(data);
      }).catch(() => {
        setItems(JSON.parse(localStorage.getItem("local_colors") || "[]"));
      });
    } else {
      const saved = JSON.parse(localStorage.getItem("local_categories") || "[]");
      setItems(saved.length > 0 ? saved : ["Organizadores", "Utilitários", "Acessórios", "Decoração"].map((n) => ({ id: makeid(), name: n })));
    }
  }

  useEffect(() => { if (open) load(); }, [open, type]);

  function save(items: Item[]) {
    setItems(items);
    localStorage.setItem(type === "color" ? "local_colors" : "local_categories", JSON.stringify(items));
  }

  function add() {
    if (!newName.trim()) return;
    save([...items, { id: makeid(), name: newName.trim(), code: newCode.trim().toUpperCase() || undefined }]);
    setNewName("");
    setNewCode("");
  }

  function update() {
    if (!edit || !newName.trim()) return;
    save(items.map((i) => i.id === edit.id ? { ...i, name: newName.trim(), code: newCode.trim().toUpperCase() || i.code } : i));
    setEdit(null);
    setNewName("");
    setNewCode("");
  }

  function remove(item: Item) {
    if (!confirm(`Excluir ${item.name}?`)) return;
    save(items.filter((i) => i.id !== item.id));
  }

  function startEdit(item: Item) {
    setEdit(item);
    setNewName(item.name);
    setNewCode(item.code || "");
  }

  const label = type === "color" ? "Cor" : "Categoria";

  return (
    <Modal open={open} onClose={onClose} title={`Gerenciar ${label}s`}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder={`Nome da ${label.toLowerCase()}`}
            className="flex-1 rounded-xl border border-[#404040] bg-[#242424] px-4 py-2 text-sm text-[#f5f5f5] placeholder-[#525252] focus:border-[#f97316] outline-none" />
          {type === "color" && (
            <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="Código" maxLength={4}
              className="w-20 rounded-xl border border-[#404040] bg-[#242424] px-3 py-2 text-sm text-[#f5f5f5] uppercase placeholder-[#525252] focus:border-[#f97316] outline-none" />
          )}
          <button onClick={edit ? update : add} type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f97316] text-white hover:bg-[#ea580c] transition-colors">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-[#2d2d2d] max-h-60 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#f5f5f5]">{item.name}</span>
                {item.code && <span className="text-[10px] text-[#737373] uppercase">{item.code}</span>}
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

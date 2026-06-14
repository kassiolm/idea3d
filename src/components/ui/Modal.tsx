import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[#404040] bg-[#1a1a1a] shadow-2xl animate-fade-in-up max-h-[90vh] flex flex-col">
        <div className="flex items-center border-b border-[#2d2d2d] px-5 py-4">
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#737373] hover:text-[#f5f5f5] hover:bg-[#2d2d2d] transition-colors">
            <X className="h-4 w-4" />
          </button>
          <h2 className="ml-3 text-lg font-bold text-[#f5f5f5]">{title}</h2>
        </div>
        <div className="overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

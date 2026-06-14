import { useState } from "react";
import { ShieldAlert } from "lucide-react";

interface Props {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: Props) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "123";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) {
      setError(false);
      onLogin();
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f97316]/10 border border-[#f97316]/20">
            <ShieldAlert className="h-7 w-7 text-[#f97316]" />
          </div>
          <h2 className="text-xl font-bold text-[#f5f5f5]">Acesso Administrativo</h2>
          <p className="mt-1 text-sm text-[#737373]">Digite a senha para gerenciar produtos</p>
        </div>

        <input
          type="password"
          placeholder="Senha"
          value={pwd}
          onChange={(e) => { setPwd(e.target.value); setError(false); }}
          className="w-full rounded-xl border border-[#404040] bg-[#242424] px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#525252] focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] outline-none text-center text-lg tracking-widest"
          autoFocus
        />

        {error && (
          <p className="text-center text-sm text-[#ef4444]">Senha incorreta</p>
        )}

        <button type="submit" className="btn-primary w-full rounded-xl py-3 text-sm">
          <span>Entrar</span>
        </button>
      </form>
    </div>
  );
}

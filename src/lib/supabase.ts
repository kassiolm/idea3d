import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const client = supabaseUrl ? createClient(supabaseUrl, supabaseAnonKey) : null;

function noopResolve(data: any = null) {
  return Promise.resolve({ data, error: null });
}

function chainable() {
  const ch: any = {
    select: () => ch,
    order: () => ch,
    eq: () => ch,
    single: () => noopResolve(null),
    then: (cb: any) => noopResolve(null).then(cb),
    insert: () => ch,
    update: () => ch,
    delete: () => ch,
  };
  return ch;
}

export const supabase = client || {
  from: () => chainable(),
  rpc: () => noopResolve(null),
};

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const client = supabaseUrl ? createClient(supabaseUrl, supabaseAnonKey) : null;

function noopQuery() {
  return Promise.resolve({ data: null, error: new Error("Supabase não configurado") });
}

function noopInsert() {
  return { select: () => ({ single: () => Promise.resolve({ data: null, error: new Error("Supabase não configurado") }) }) };
}

function noopRpc() {
  return Promise.resolve({ data: null, error: new Error("Supabase não configurado") });
}

export const supabase = client || {
  from: () => ({
    select: () => ({ then: (cb: any) => noopQuery().then(cb), order: () => ({ then: (cb: any) => noopQuery().then(cb) }) }),
    insert: () => noopInsert(),
    delete: () => ({ eq: () => ({ then: (cb: any) => Promise.resolve({ error: null }).then(cb) }) }),
    update: () => ({ eq: () => ({ then: (cb: any) => Promise.resolve({ error: null }).then(cb) }) }),
  }),
  rpc: () => noopRpc(),
};

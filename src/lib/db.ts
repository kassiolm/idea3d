import { supabase } from "./supabase";
import type { Product, Color } from "../types";

function toImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  return url;
}

// ─── Products ───

export async function fetchProducts(): Promise<Product[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("products").select("*");
  if (error || !data) return [];
  return data.map((p: any) => ({
    ...p,
    images: p.images || undefined,
    variants: p.variants || undefined,
    color: typeof p.color === "string" ? JSON.parse(p.color) : p.color,
  }));
}

export async function saveProduct(product: Product): Promise<void> {
  if (!supabase) return;
  const payload = {
    ...product,
    images: product.images || null,
    variants: product.variants || null,
    color: product.color || null,
  };
  await supabase.from("products").upsert(payload, { onConflict: "sku" });
}

export async function deleteProduct(sku: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("products").delete().eq("sku", sku);
}

// ─── Colors ───

export async function fetchColors(): Promise<Color[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("colors").select("*");
  if (error || !data) return [];
  return data;
}

export async function saveColors(colors: Color[]): Promise<void> {
  if (!supabase) return;
  const { error: delErr } = await supabase.from("colors").delete().neq("id", -1);
  if (delErr) return;
  if (colors.length) {
    await supabase.from("colors").insert(colors.map((c) => ({ ...c, hexes: c.hexes || null })));
  }
}

// ─── Categories ───

export async function fetchCategories(): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("categories").select("name");
  if (error || !data) return [];
  return data.map((c: any) => c.name);
}

export async function saveCategories(names: string[]): Promise<void> {
  if (!supabase) return;
  await supabase.from("categories").delete().neq("id", -1);
  if (names.length) {
    await supabase.from("categories").insert(names.map((n) => ({ id: Date.now() + Math.random(), name: n })));
  }
}

// ─── Materials ───

export async function fetchMaterials(): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("materials").select("name");
  if (error || !data) return [];
  return data.map((m: any) => m.name);
}

export async function saveMaterials(names: string[]): Promise<void> {
  if (!supabase) return;
  await supabase.from("materials").delete().neq("id", -1);
  if (names.length) {
    await supabase.from("materials").insert(names.map((n) => ({ id: Date.now() + Math.random(), name: n })));
  }
}

// ─── Orders ───

export async function getOrders(): Promise<any[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("orders").select("*").order("id", { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function saveOrder(order: any): Promise<void> {
  if (!supabase) return;
  await supabase.from("orders").insert(order);
}

export async function updateOrders(orders: any[]): Promise<void> {
  if (!supabase) return;
  const { error: delErr } = await supabase.from("orders").delete().neq("id", -1);
  if (delErr) return;
  if (orders.length) {
    await supabase.from("orders").insert(orders);
  }
}

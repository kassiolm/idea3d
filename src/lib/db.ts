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
  if (supabase) {
    const { data, error } = await supabase.from("products").select("*");
    if (!error && data && data.length > 0) {
      const mapped = data.map((p: any) => ({
        ...p,
        images: p.images || undefined,
        variants: p.variants || undefined,
        color: typeof p.color === "string" ? JSON.parse(p.color) : p.color,
      }));
      localStorage.setItem("cache_products", JSON.stringify(mapped));
      return mapped;
    }
  }
  try {
    return JSON.parse(localStorage.getItem("cache_products") || "[]");
  } catch {
    return [];
  }
}

export async function saveProduct(product: Product): Promise<void> {
  const payload = {
    ...product,
    images: product.images || null,
    variants: product.variants || null,
    color: product.color || null,
  };
  localStorage.setItem(`local_products_${product.sku}`, JSON.stringify(product));
  if (supabase) {
    await supabase.from("products").upsert(payload, { onConflict: "sku" });
  }
}

export async function deleteProduct(sku: string): Promise<void> {
  localStorage.setItem(`local_products_${sku}_deleted`, "1");
  if (supabase) {
    await supabase.from("products").delete().eq("sku", sku);
  }
}

// ─── Colors ───

export async function fetchColors(): Promise<Color[]> {
  if (supabase) {
    const { data, error } = await supabase.from("colors").select("*");
    if (!error && data && data.length > 0) {
      localStorage.setItem("cache_colors", JSON.stringify(data));
      return data;
    }
  }
  try {
    return JSON.parse(localStorage.getItem("cache_colors") || "[]");
  } catch {
    return [];
  }
}

export async function saveColors(colors: Color[]): Promise<void> {
  localStorage.setItem("local_colors", JSON.stringify(colors));
  localStorage.setItem("cache_colors", JSON.stringify(colors));
  if (supabase) {
    const { error: delErr } = await supabase.from("colors").delete().neq("id", -1);
    if (!delErr) {
      await supabase.from("colors").insert(colors.map((c) => ({ ...c, hexes: c.hexes || null })));
    }
  }
}

// ─── Categories ───

export async function fetchCategories(): Promise<string[]> {
  if (supabase) {
    const { data, error } = await supabase.from("categories").select("name");
    if (!error && data && data.length > 0) {
      const names = data.map((c: any) => c.name);
      localStorage.setItem("cache_categories", JSON.stringify(names));
      return names;
    }
  }
  try {
    return JSON.parse(localStorage.getItem("cache_categories") || "[]");
  } catch {
    return [];
  }
}

export async function saveCategories(names: string[]): Promise<void> {
  localStorage.setItem("local_categories", JSON.stringify(names.map((n) => ({ name: n }))));
  localStorage.setItem("cache_categories", JSON.stringify(names));
  if (supabase) {
    await supabase.from("categories").delete().neq("id", -1);
    if (names.length) {
      await supabase.from("categories").insert(names.map((n) => ({ id: Date.now() + Math.random(), name: n })));
    }
  }
}

// ─── Materials ───

export async function fetchMaterials(): Promise<string[]> {
  if (supabase) {
    const { data, error } = await supabase.from("materials").select("name");
    if (!error && data && data.length > 0) {
      const names = data.map((m: any) => m.name);
      localStorage.setItem("cache_materials", JSON.stringify(names));
      return names;
    }
  }
  try {
    return JSON.parse(localStorage.getItem("cache_materials") || "[]");
  } catch {
    return [];
  }
}

export async function saveMaterials(names: string[]): Promise<void> {
  localStorage.setItem("local_materials", JSON.stringify(names.map((n) => ({ name: n }))));
  localStorage.setItem("cache_materials", JSON.stringify(names));
  if (supabase) {
    await supabase.from("materials").delete().neq("id", -1);
    if (names.length) {
      await supabase.from("materials").insert(names.map((n) => ({ id: Date.now() + Math.random(), name: n })));
    }
  }
}

// ─── Orders ───

export async function getOrders(): Promise<any[]> {
  if (supabase) {
    const { data, error } = await supabase.from("orders").select("*").order("id", { ascending: false });
    if (!error && data) {
      localStorage.setItem("cache_orders", JSON.stringify(data));
      return data;
    }
  }
  try {
    return JSON.parse(localStorage.getItem("cache_orders") || "[]");
  } catch {
    return [];
  }
}

export async function saveOrder(order: any): Promise<void> {
  const orders = JSON.parse(localStorage.getItem("cache_orders") || "[]");
  orders.push(order);
  localStorage.setItem("cache_orders", JSON.stringify(orders));
  if (supabase) {
    await supabase.from("orders").insert(order);
  }
}

export async function updateOrders(orders: any[]): Promise<void> {
  localStorage.setItem("cache_orders", JSON.stringify(orders));
  if (supabase) {
    const { error: delErr } = await supabase.from("orders").delete().neq("id", -1);
    if (!delErr) {
      await supabase.from("orders").insert(orders);
    }
  }
}

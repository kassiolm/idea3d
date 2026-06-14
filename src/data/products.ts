import type { Product } from "../types";

function img(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}${path}`;
}

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 1, sku: "SKU-GB01WH", name: "Gancho Box", model_number: "1.0",
    color_id: 2, price: 20, stock: 2, image: img("/images/c3deecfaccaa8057.webp"),
    category: "Organizadores", color: { id: 2, name: "Branca", code: "WH" },
    description: "Gancho organizador multiuso para pendurar bolsas, mochilas e objetos. Ideal para quartos, escritórios e closets.",
  },
  {
    id: 2, sku: "SKU-GB01BK", name: "Gancho Box", model_number: "1.0",
    color_id: 1, price: 20, stock: 2, image: img("/images/c3deecfaccaa8057.webp"),
    category: "Organizadores", color: { id: 1, name: "Preta", code: "BK" },
    description: "Gancho organizador multiuso para pendurar bolsas, mochilas e objetos. Ideal para quartos, escritórios e closets.",
  },
  {
    id: 3, sku: "SKU-AG01YL", name: "Abridor Garrafas", model_number: "1.0",
    color_id: 6, price: 15, stock: 1, image: img("/images/2024-11-26_a2d8aba2ccc8f.webp"),
    category: "Utilitários", color: { id: 6, name: "Amarela", code: "YL" },
    description: "Abridor de garrafas funcional e estiloso. Design ergonômico impresso em PLA de alta resistência.",
  },
  {
    id: 4, sku: "SKU-AG01WH", name: "Abridor Garrafas", model_number: "1.0",
    color_id: 2, price: 15, stock: 1, image: img("/images/2024-11-26_a2d8aba2ccc8f.webp"),
    category: "Utilitários", color: { id: 2, name: "Branca", code: "WH" },
    description: "Abridor de garrafas funcional e estiloso. Design ergonômico impresso em PLA de alta resistência.",
  },
  {
    id: 5, sku: "SKU-SD01GN", name: "Suporte Deslizante", model_number: "1.0",
    color_id: 5, price: 15, stock: 2, image: img("/images/6387278bd2541ee8.webp"),
    category: "Acessórios", color: { id: 5, name: "Verde", code: "GN" },
    description: "Suporte deslizante para organizar pequenos objetos. Perfeito para gavetas, mesas e bancadas.",
  },
  {
    id: 6, sku: "SKU-CG01BK", name: "Cabide Gravidade", model_number: "1.0",
    color_id: 1, price: 30, stock: 2, image: img("/images/de7672e8beae7276.webp"),
    category: "Organizadores", color: { id: 1, name: "Preta", code: "BK" },
    description: "Cabide inteligente que usa a gravidade para manter roupas no lugar. Design moderno e funcional.",
  },
  {
    id: 7, sku: "SKU-CG01WH", name: "Cabide Gravidade", model_number: "1.0",
    color_id: 2, price: 30, stock: 1, image: img("/images/de7672e8beae7276.webp"),
    category: "Organizadores", color: { id: 2, name: "Branca", code: "WH" },
    description: "Cabide inteligente que usa a gravidade para manter roupas no lugar. Design moderno e funcional.",
  },
  {
    id: 8, sku: "SKU-SC01RD", name: "Suporte Celular Coração", model_number: "1.0",
    color_id: 3, price: 30, stock: 1, image: img("/images/2024-10-13_ba2ff7fdd3da5.webp"),
    category: "Acessórios", color: { id: 3, name: "Vermelha", code: "RD" },
    description: "Suporte para celular em formato de coração. Presente perfeito para decorar a mesa e manter o celular à vista.",
  },
  {
    id: 9, sku: "SKU-BP01BG", name: "Bandeja Porta Joias", model_number: "1.0",
    color_id: 11, price: 15, stock: 1, image: img("/images/2025-11-11_146fa046f718c8.webp"),
    category: "Organizadores", color: { id: 11, name: "Bege", code: "BG" },
    description: "Bandeja elegante para organizar joias, anéis e acessórios. Design compacto para penteadeiras e cômodas.",
  },
  {
    id: 10, sku: "SKU-OD01WH", name: "Ovo de Dragão", model_number: "1.0",
    color_id: 2, price: 40, stock: 1, image: img("/images/2025-04-24_e5bb4fc349c098.webp"),
    category: "Decoração", color: { id: 2, name: "Branca", code: "WH" },
    description: "Ovo de dragão decorativo impresso em 3D com textura detalhada. Peça única para colecionadores e decoração temática.",
  },
  {
    id: 11, sku: "SKU-CG01BK-SK", name: "Caixa Grande SILK", model_number: "1.0",
    color_id: 1, price: 60, stock: 0, image: img("/images/IMG_20260204_220129.jpg"),
    category: "Organizadores", color: { id: 1, name: "Preta", code: "BK" },
    description: "Caixa organizadora de grande porte com acabamento silk (brilhante). Ideal para armazenamento de objetos diversos.",
  },
];

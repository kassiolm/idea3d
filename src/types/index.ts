export interface Color {
  id: number;
  name: string;
  code: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  model_number: string;
  color_id: number;
  price: number;
  stock: number;
  image: string | null;
  category: string | null;
  color: Color;
}

export interface CartItem {
  sku: string;
  name: string;
  colorName: string;
  price: number;
  quantity: number;
  image: string | null;
}

export interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string | null;
  delivery_method: string;
  notes: string | null;
  total: number;
  status: string;
  created_at: string;
}

export interface ProductFormData {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  color_id: number;
  image: string;
}

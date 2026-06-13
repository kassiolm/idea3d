-- SQL idempotente para configurar o Supabase (pode rodar múltiplas vezes)
-- Execute no SQL Editor do Supabase

-- Tabela de cores
CREATE TABLE IF NOT EXISTS colors (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  model_number TEXT DEFAULT '1.0',
  color_id INTEGER REFERENCES colors(id),
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  image TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  delivery_method TEXT DEFAULT 'retirada',
  notes TEXT,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens do pedido
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
);

-- Função para abater estoque
CREATE OR REPLACE FUNCTION decrement_stock(sku_param TEXT, qty INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE products SET stock = stock - qty WHERE sku = sku_param;
END;
$$ LANGUAGE plpgsql;

-- Inserir cores (ignora se já existirem)
INSERT INTO colors (name, code) VALUES
  ('Preta', 'BK'), ('Branca', 'WH'), ('Vermelha', 'RD'), ('Azul', 'BL'),
  ('Verde', 'GN'), ('Amarela', 'YL'), ('Rosa', 'PK'), ('Cinza', 'GY'),
  ('Laranja', 'OR'), ('Marrom', 'BR'), ('Bege', 'BG'), ('Roxa', 'PL'),
  ('Prata', 'SL'), ('Dourada', 'GD'), ('Transparente', 'TR')
ON CONFLICT (code) DO NOTHING;

-- Inserir produtos (ignora se já existirem)
INSERT INTO products (sku, name, model_number, color_id, price, stock, category) VALUES
  ('SKU-GB01WH', 'Gancho Box', '1.0', (SELECT id FROM colors WHERE code = 'WH'), 20, 2, 'Organizadores'),
  ('SKU-GB01BK', 'Gancho Box', '1.0', (SELECT id FROM colors WHERE code = 'BK'), 20, 2, 'Organizadores'),
  ('SKU-AG01YL', 'Abridor Garrafas', '1.0', (SELECT id FROM colors WHERE code = 'YL'), 15, 1, 'Utilitários'),
  ('SKU-AG01WH', 'Abridor Garrafas', '1.0', (SELECT id FROM colors WHERE code = 'WH'), 15, 1, 'Utilitários'),
  ('SKU-SD01GN', 'Suporte Deslizante', '1.0', (SELECT id FROM colors WHERE code = 'GN'), 15, 2, 'Acessórios'),
  ('SKU-CG01BK', 'Cabide Gravidade', '1.0', (SELECT id FROM colors WHERE code = 'BK'), 30, 2, 'Organizadores'),
  ('SKU-CG01WH', 'Cabide Gravidade', '1.0', (SELECT id FROM colors WHERE code = 'WH'), 30, 1, 'Organizadores'),
  ('SKU-SC01RD', 'Suporte Celular Coração', '1.0', (SELECT id FROM colors WHERE code = 'RD'), 30, 1, 'Acessórios'),
  ('SKU-BP01BG', 'Bandeja Porta Joias', '1.0', (SELECT id FROM colors WHERE code = 'BG'), 15, 1, 'Organizadores'),
  ('SKU-OD01WH', 'Ovo de Dragão', '1.0', (SELECT id FROM colors WHERE code = 'WH'), 40, 1, 'Decoração'),
  ('SKU-CG01BK-SK', 'Caixa Grande SILK', '1.0', (SELECT id FROM colors WHERE code = 'BK'), 60, 0, 'Organizadores')
ON CONFLICT (sku) DO NOTHING;

-- RLS: produtos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "produtos_leitura_anon" ON products;
CREATE POLICY "produtos_leitura_anon" ON products FOR SELECT TO anon USING (true);

-- RLS: pedidos
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pedidos_insert_anon" ON orders;
DROP POLICY IF EXISTS "pedidos_select_anon" ON orders;
CREATE POLICY "pedidos_insert_anon" ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "pedidos_select_anon" ON orders FOR SELECT TO anon USING (true);

-- RLS: itens
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "itens_insert_anon" ON order_items;
CREATE POLICY "itens_insert_anon" ON order_items FOR INSERT TO anon WITH CHECK (true);

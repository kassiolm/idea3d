-- Rodar no SQL Editor do Supabase (https://supabase.com/dashboard/project/_/sql/new)

-- 1. Colors
CREATE TABLE colors (
  id DOUBLE PRECISION PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  hex TEXT,
  hexes JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE colors DISABLE ROW LEVEL SECURITY;

-- 2. Categories
CREATE TABLE categories (
  id DOUBLE PRECISION PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- 3. Materials
CREATE TABLE materials (
  id DOUBLE PRECISION PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

ALTER TABLE materials DISABLE ROW LEVEL SECURITY;

-- 4. Products
CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  model_number TEXT DEFAULT '1.0',
  color_id DOUBLE PRECISION,
  price DOUBLE PRECISION NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  color JSONB,
  variants JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 5. Orders
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  delivery TEXT DEFAULT 'retirada',
  notes TEXT DEFAULT '',
  items JSONB DEFAULT '[]'::jsonb,
  total DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'pending',
  date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

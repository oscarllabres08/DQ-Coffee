/*
# Create DQ-Cafe owner-scoped products and sales

1. New Tables
- `products`: menu products created by each signed-in owner, including category, price, stock quantity, and optional description.
- `sales`: completed POS transactions owned by the signed-in owner, including totals and payment method.
- `sale_items`: product line items belonging to a sale, preserving the product name and price at checkout.

2. Security
- Row Level Security is enabled on all three tables.
- Authenticated users can only read and write records whose owner is their own auth user.
- Product ownership is checked directly; sale item access is checked through its parent sale.
- Data API grants are limited to authenticated CRUD operations needed by the application.

3. Important Notes
- Product and sale owner columns default to `auth.uid()` so inserts remain safely owner-scoped.
- Product categories are constrained to Hot Coffee, Hot Latte, or Snacks.
- No existing tables or user data are modified.
*/

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('Hot Coffee', 'Hot Latte', 'Snacks')),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  tax numeric(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  payment_method text NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'GCash', 'Card')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(10,2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;

DROP POLICY IF EXISTS "owners_select_products" ON public.products;
CREATE POLICY "owners_select_products" ON public.products FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "owners_insert_products" ON public.products;
CREATE POLICY "owners_insert_products" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owners_update_products" ON public.products;
CREATE POLICY "owners_update_products" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owners_delete_products" ON public.products;
CREATE POLICY "owners_delete_products" ON public.products FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owners_select_sales" ON public.sales;
CREATE POLICY "owners_select_sales" ON public.sales FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "owners_insert_sales" ON public.sales;
CREATE POLICY "owners_insert_sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owners_update_sales" ON public.sales;
CREATE POLICY "owners_update_sales" ON public.sales FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owners_delete_sales" ON public.sales;
CREATE POLICY "owners_delete_sales" ON public.sales FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owners_select_sale_items" ON public.sale_items;
CREATE POLICY "owners_select_sale_items" ON public.sale_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "owners_insert_sale_items" ON public.sale_items;
CREATE POLICY "owners_insert_sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid()));
DROP POLICY IF EXISTS "owners_update_sale_items" ON public.sale_items;
CREATE POLICY "owners_update_sale_items" ON public.sale_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid()));
DROP POLICY IF EXISTS "owners_delete_sale_items" ON public.sale_items;
CREATE POLICY "owners_delete_sale_items" ON public.sale_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS products_user_id_idx ON public.products(user_id);
CREATE INDEX IF NOT EXISTS sales_user_id_created_at_idx ON public.sales(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON public.sale_items(sale_id);

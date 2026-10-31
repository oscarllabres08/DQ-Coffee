/*
# Menu categories, temperature, size, and product photos

1. Products
- Categories become Coffee, Non Coffee, Matcha Series, Frappe, Sparkling Series, Tea Infusion, and Specialty hot coffee.
- Each product stores temperature (Hot or Iced) and size (16 oz or 22 oz).
- An optional image URL points at a photo in the product-images bucket.

2. Existing rows
- Hot Coffee and Hot Latte become Coffee / Hot / 16 oz.
- Snacks become Non Coffee / Iced / 16 oz.

3. Storage
- Public product-images bucket so the menu and POS can show photos.
- Only the signed-in owner can upload, replace, or delete files inside their own folder.
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS temperature text,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;

UPDATE public.products
SET
  temperature = CASE
    WHEN category IN ('Hot Coffee', 'Hot Latte') THEN 'Hot'
    ELSE COALESCE(temperature, 'Iced')
  END,
  size = COALESCE(size, '16 oz'),
  category = CASE
    WHEN category IN ('Hot Coffee', 'Hot Latte') THEN 'Coffee'
    WHEN category = 'Snacks' THEN 'Non Coffee'
    ELSE category
  END;

UPDATE public.products SET temperature = 'Iced' WHERE temperature IS NULL;
UPDATE public.products SET size = '16 oz' WHERE size IS NULL;

ALTER TABLE public.products ALTER COLUMN temperature SET DEFAULT 'Iced';
ALTER TABLE public.products ALTER COLUMN temperature SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN size SET DEFAULT '16 oz';
ALTER TABLE public.products ALTER COLUMN size SET NOT NULL;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_check CHECK (category IN ('Coffee', 'Non Coffee', 'Matcha Series', 'Frappe', 'Sparkling Series', 'Tea Infusion', 'Specialty hot coffee')),
  ADD CONSTRAINT products_temperature_check CHECK (temperature IN ('Hot', 'Iced')),
  ADD CONSTRAINT products_size_check CHECK (size IN ('16 oz', '22 oz'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public read product images" ON storage.objects;
CREATE POLICY "public read product images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "owners upload product images" ON storage.objects;
CREATE POLICY "owners upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "owners update product images" ON storage.objects;
CREATE POLICY "owners update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "owners delete product images" ON storage.objects;
CREATE POLICY "owners delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

/*
# One shop for every signed-in account

Products, photos, sales, sale items, and expenses belong to the cafe,
not to the account that happened to create them. Any signed-in account
can read and update the same records, so an owner away from the shop
can check sales from another login.

Sign-in is still required. The public internet cannot read the shop data.
Product photos stay in the public product-images bucket so every account
can display the same picture URL.
*/

DROP POLICY IF EXISTS "owners_select_products" ON public.products;
DROP POLICY IF EXISTS "owners_insert_products" ON public.products;
DROP POLICY IF EXISTS "owners_update_products" ON public.products;
DROP POLICY IF EXISTS "owners_delete_products" ON public.products;
DROP POLICY IF EXISTS "shop_select_products" ON public.products;
DROP POLICY IF EXISTS "shop_insert_products" ON public.products;
DROP POLICY IF EXISTS "shop_update_products" ON public.products;
DROP POLICY IF EXISTS "shop_delete_products" ON public.products;

CREATE POLICY "shop_select_products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "shop_insert_products" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shop_update_products" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shop_delete_products" ON public.products FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "owners_select_sales" ON public.sales;
DROP POLICY IF EXISTS "owners_insert_sales" ON public.sales;
DROP POLICY IF EXISTS "owners_update_sales" ON public.sales;
DROP POLICY IF EXISTS "owners_delete_sales" ON public.sales;
DROP POLICY IF EXISTS "shop_select_sales" ON public.sales;
DROP POLICY IF EXISTS "shop_insert_sales" ON public.sales;
DROP POLICY IF EXISTS "shop_update_sales" ON public.sales;
DROP POLICY IF EXISTS "shop_delete_sales" ON public.sales;

CREATE POLICY "shop_select_sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "shop_insert_sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shop_update_sales" ON public.sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shop_delete_sales" ON public.sales FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "owners_select_sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "owners_insert_sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "owners_update_sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "owners_delete_sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "shop_select_sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "shop_insert_sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "shop_update_sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "shop_delete_sale_items" ON public.sale_items;

CREATE POLICY "shop_select_sale_items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "shop_insert_sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shop_update_sale_items" ON public.sale_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shop_delete_sale_items" ON public.sale_items FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "owners_select_expenses" ON public.expenses;
DROP POLICY IF EXISTS "owners_insert_expenses" ON public.expenses;
DROP POLICY IF EXISTS "owners_update_expenses" ON public.expenses;
DROP POLICY IF EXISTS "owners_delete_expenses" ON public.expenses;
DROP POLICY IF EXISTS "shop_select_expenses" ON public.expenses;
DROP POLICY IF EXISTS "shop_insert_expenses" ON public.expenses;
DROP POLICY IF EXISTS "shop_update_expenses" ON public.expenses;
DROP POLICY IF EXISTS "shop_delete_expenses" ON public.expenses;

CREATE POLICY "shop_select_expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "shop_insert_expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shop_update_expenses" ON public.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shop_delete_expenses" ON public.expenses FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "owners upload product images" ON storage.objects;
DROP POLICY IF EXISTS "owners update product images" ON storage.objects;
DROP POLICY IF EXISTS "owners delete product images" ON storage.objects;
DROP POLICY IF EXISTS "shop upload product images" ON storage.objects;
DROP POLICY IF EXISTS "shop update product images" ON storage.objects;
DROP POLICY IF EXISTS "shop delete product images" ON storage.objects;

CREATE POLICY "shop upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "shop update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "shop delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

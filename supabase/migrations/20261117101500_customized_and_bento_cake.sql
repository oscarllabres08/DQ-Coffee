/*
# Customized cakes and Bento Cheese Cake

Food can be filed under Customized for made-to-order cakes with a flexible price.
Bento Cheese Cake is added under Cakes.
*/

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_subcategory_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_subcategory_check CHECK (subcategory IN (
    'Coffee', 'Non Coffee', 'Matcha Series', 'Frappe', 'Sparkling Series', 'Tea Infusion', 'Specialty hot coffee',
    'Breakfast', 'Sandwich', 'Salad', 'Soup', 'Pasta', 'Snacks', 'Meal', 'Waffles', 'Pastries', 'Cakes', 'Customized',
    'Korean Dish', 'Fries'
  ));

INSERT INTO public.products (user_id, name, description, category, subcategory, temperature, size, image_url, price, quantity, available)
SELECT owner.user_id, item.name, item.description, item.category, item.subcategory, item.temperature, item.size, null, item.price, item.quantity, true
FROM (
  SELECT user_id
  FROM public.products
  WHERE user_id IS NOT NULL
  ORDER BY created_at
  LIMIT 1
) AS owner
CROSS JOIN (
  VALUES
    ('Customized', 'Set price per order in POS or inventory.', 'Food', 'Customized', 'None', 'Regular', 0::numeric, 999),
    ('Bento Cheese Cake', null, 'Food', 'Cakes', 'None', 'Regular', 350::numeric, 20)
) AS item(name, description, category, subcategory, temperature, size, price, quantity)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.products existing
  WHERE existing.name = item.name
    AND existing.temperature = item.temperature
    AND existing.size = item.size
);
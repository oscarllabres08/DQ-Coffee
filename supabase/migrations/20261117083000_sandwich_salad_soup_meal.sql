/*
# Sandwich, Salad, Soup, Meal, and availability

Food can also be filed under Sandwich, Salad, Soup, or Meal.
Every product can be marked available or unavailable.
The new menu items are inserted when the shop already has products.
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_subcategory_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_subcategory_check CHECK (subcategory IN (
    'Coffee', 'Non Coffee', 'Matcha Series', 'Frappe', 'Sparkling Series', 'Tea Infusion', 'Specialty hot coffee',
    'Breakfast', 'Sandwich', 'Salad', 'Soup', 'Pasta', 'Snacks', 'Meal', 'Waffles', 'Pastries', 'Cakes', 'Korean Dish', 'Fries'
  ));

UPDATE public.products
SET name = 'Aligue Pasta'
WHERE name = 'Aglio Pasta'
  AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Aligue Pasta');

UPDATE public.products
SET price = 150
WHERE name = 'El Churros' AND size = '12 pcs' AND price = 130;

INSERT INTO public.products (user_id, name, description, category, subcategory, temperature, size, image_url, price, quantity, available)
SELECT owner.user_id, item.name, null, item.category, item.subcategory, item.temperature, item.size, null, item.price, 20, true
FROM (
  SELECT user_id
  FROM public.products
  WHERE user_id IS NOT NULL
  ORDER BY created_at
  LIMIT 1
) AS owner
CROSS JOIN (
  VALUES
    ('Choco Blast', 'Beverages', 'Frappe', 'Iced', '16 oz', 175::numeric),
    ('Choco Blast', 'Beverages', 'Frappe', 'Iced', '22 oz', 190::numeric),
    ('Cortado', 'Beverages', 'Specialty hot coffee', 'Hot', '16 oz', 150::numeric),
    ('Espresso Single', 'Beverages', 'Specialty hot coffee', 'Hot', '16 oz', 110::numeric),
    ('Espresso Double', 'Beverages', 'Specialty hot coffee', 'Hot', '16 oz', 120::numeric),
    ('Club House', 'Food', 'Sandwich', 'None', 'Regular', 200::numeric),
    ('Egg Mayo', 'Food', 'Sandwich', 'None', 'Regular', 150::numeric),
    ('Tuna Melt', 'Food', 'Sandwich', 'None', 'Regular', 180::numeric),
    ('Kani Salad', 'Food', 'Salad', 'None', 'Regular', 230::numeric),
    ('Caesar Salad', 'Food', 'Salad', 'None', 'Regular', 200::numeric),
    ('Creamy Mushroom Soup', 'Food', 'Soup', 'None', 'Regular', 120::numeric),
    ('Crab Corn Soup', 'Food', 'Soup', 'None', 'Regular', 150::numeric),
    ('Aligue Pasta', 'Food', 'Pasta', 'None', 'Regular', 289::numeric),
    ('Crispy Creamy Chicken', 'Food', 'Meal', 'None', 'Regular', 200::numeric),
    ('Sausage w/ Egg', 'Food', 'Meal', 'None', 'Regular', 150::numeric),
    ('Spam w/ Egg', 'Food', 'Meal', 'None', 'Regular', 150::numeric),
    ('Corn Beef w/ Egg', 'Food', 'Meal', 'None', 'Regular', 150::numeric),
    ('Salmon Bites', 'Food', 'Meal', 'None', 'Regular', 230::numeric)
) AS item(name, category, subcategory, temperature, size, price)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.products existing
  WHERE existing.name = item.name
    AND existing.temperature = item.temperature
    AND existing.size = item.size
);

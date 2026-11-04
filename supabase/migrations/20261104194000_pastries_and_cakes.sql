/*
# Pastries and Cakes

Food can also be filed under Pastries or Cakes.
*/

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_subcategory_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_subcategory_check CHECK (subcategory IN (
    'Coffee', 'Non Coffee', 'Matcha Series', 'Frappe', 'Sparkling Series', 'Tea Infusion', 'Specialty hot coffee',
    'Breakfast', 'Pasta', 'Snacks', 'Waffles', 'Pastries', 'Cakes', 'Korean Dish', 'Fries'
  ));

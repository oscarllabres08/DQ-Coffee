/*
# Food and Beverages

1. Categories
- `category` is now only Food or Beverages.
- The old drink categories move into `subcategory`.
- Food subcategories are Breakfast, Pasta, Snacks, Waffles, Korean Dish, and Fries.

2. Food portions
- Food is stored with temperature None.
- Most food uses size Regular. El Churros uses 6 pcs and 12 pcs.
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subcategory text;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_subcategory_check;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_temperature_check;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_size_check;

UPDATE public.products
SET subcategory = category
WHERE subcategory IS NULL
  AND category NOT IN ('Food', 'Beverages');

UPDATE public.products
SET category = 'Beverages'
WHERE category NOT IN ('Food', 'Beverages');

UPDATE public.products
SET subcategory = 'Coffee'
WHERE subcategory IS NULL AND category = 'Beverages';

ALTER TABLE public.products
  ADD CONSTRAINT products_category_check CHECK (category IN ('Food', 'Beverages')),
  ADD CONSTRAINT products_subcategory_check CHECK (subcategory IN (
    'Coffee', 'Non Coffee', 'Matcha Series', 'Frappe', 'Sparkling Series', 'Tea Infusion', 'Specialty hot coffee',
    'Breakfast', 'Pasta', 'Snacks', 'Waffles', 'Korean Dish', 'Fries'
  )),
  ADD CONSTRAINT products_temperature_check CHECK (temperature IN ('Hot', 'Iced', 'None')),
  ADD CONSTRAINT products_size_check CHECK (size IN ('16 oz', '22 oz', 'Regular', '6 pcs', '12 pcs'));

ALTER TABLE public.products ALTER COLUMN subcategory SET NOT NULL;

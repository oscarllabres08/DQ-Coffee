/*
# Add the Tea Infusion category

Tea Infusion is an iced-only menu category. This updates the product
category check so existing databases accept the new value.
*/

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_category_check CHECK (category IN ('Coffee', 'Non Coffee', 'Matcha Series', 'Frappe', 'Sparkling Series', 'Tea Infusion', 'Specialty hot coffee'));

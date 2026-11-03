/*
# Business expense categories

Replace the first expense list with the shop's actual costs:
Rent, Electricity, Water Bill, Internet, Salaries / Wages,
Transportation, Maintenance, Supplies, and Miscellaneous.
*/

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

UPDATE public.expenses
SET category = 'Electricity',
    label = CASE WHEN label = 'Electric Bill' THEN 'Electricity' ELSE label END
WHERE category = 'Electric Bill';

UPDATE public.expenses
SET category = 'Internet',
    label = CASE WHEN label = 'Internet Bill' THEN 'Internet' ELSE label END
WHERE category = 'Internet Bill';

UPDATE public.expenses
SET category = 'Miscellaneous',
    label = CASE WHEN label IN ('Food', 'Others') THEN 'Miscellaneous' ELSE label END
WHERE category IN ('Food', 'Others');

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check CHECK (category IN (
    'Rent',
    'Electricity',
    'Water Bill',
    'Internet',
    'Salaries / Wages',
    'Transportation',
    'Maintenance',
    'Supplies',
    'Miscellaneous'
  ));

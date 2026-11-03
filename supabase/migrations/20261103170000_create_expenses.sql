/*
# Cafe expenses

1. New table
- `expenses` stores owner-scoped costs such as utility bills, food, and other spending.
- `category` is Water Bill, Electric Bill, Internet Bill, Food, or Others.
- `label` repeats the category, or holds a custom name when the category is Others.
- `spent_on` is the calendar day the cost belongs to, so a day can be reviewed on its own.

2. Security
- Row Level Security limits every row to the signed-in owner.
- `user_id` defaults to `auth.uid()`.
*/

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Water Bill', 'Electric Bill', 'Internet Bill', 'Food', 'Others')),
  label text NOT NULL CHECK (char_length(btrim(label)) > 0),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  notes text,
  spent_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Manila')::date),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;

DROP POLICY IF EXISTS "owners_select_expenses" ON public.expenses;
CREATE POLICY "owners_select_expenses" ON public.expenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "owners_insert_expenses" ON public.expenses;
CREATE POLICY "owners_insert_expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owners_update_expenses" ON public.expenses;
CREATE POLICY "owners_update_expenses" ON public.expenses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owners_delete_expenses" ON public.expenses;
CREATE POLICY "owners_delete_expenses" ON public.expenses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS expenses_user_id_spent_on_idx ON public.expenses(user_id, spent_on DESC, created_at DESC);

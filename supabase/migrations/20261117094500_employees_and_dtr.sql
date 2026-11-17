/*
# Employees and daily time records

Each employee gets a name and an automatic employee number.
Time in and time out are stored per shift, with minutes late after the shift start.
Any signed-in shop account can see and update the same records.
*/

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_no text NOT NULL UNIQUE,
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  shift_start time NOT NULL DEFAULT '08:00',
  hourly_rate numeric(10,2) CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Manila')::date),
  time_in timestamptz NOT NULL DEFAULT now(),
  time_out timestamptz,
  late_minutes integer NOT NULL DEFAULT 0 CHECK (late_minutes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (time_out IS NULL OR time_out >= time_in)
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_records TO authenticated;

DROP POLICY IF EXISTS "shop_select_employees" ON public.employees;
DROP POLICY IF EXISTS "shop_insert_employees" ON public.employees;
DROP POLICY IF EXISTS "shop_update_employees" ON public.employees;
DROP POLICY IF EXISTS "shop_delete_employees" ON public.employees;
CREATE POLICY "shop_select_employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "shop_insert_employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shop_update_employees" ON public.employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shop_delete_employees" ON public.employees FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "shop_select_time_records" ON public.time_records;
DROP POLICY IF EXISTS "shop_insert_time_records" ON public.time_records;
DROP POLICY IF EXISTS "shop_update_time_records" ON public.time_records;
DROP POLICY IF EXISTS "shop_delete_time_records" ON public.time_records;
CREATE POLICY "shop_select_time_records" ON public.time_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "shop_insert_time_records" ON public.time_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shop_update_time_records" ON public.time_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shop_delete_time_records" ON public.time_records FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS employees_employee_no_idx ON public.employees(employee_no);
CREATE INDEX IF NOT EXISTS time_records_employee_day_idx ON public.time_records(employee_id, work_date DESC, time_in DESC);

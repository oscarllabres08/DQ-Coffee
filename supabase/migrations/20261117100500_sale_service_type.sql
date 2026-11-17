-- Dine in vs take out on POS sales and receipts
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'Dine in'
  CHECK (service_type IN ('Dine in', 'Take out'));
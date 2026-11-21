-- Permite mais de 3 notas fiscais por liberação.
-- As 3 primeiras continuam em nf_1..3 / serie_1..3; da 4ª em diante
-- ficam nesta coluna JSON: [{"codigo_barras":"...","nf":"...","serie":"..."}]
ALTER TABLE public.cargo_releases
  ADD COLUMN IF NOT EXISTS notas_extras jsonb NOT NULL DEFAULT '[]'::jsonb;

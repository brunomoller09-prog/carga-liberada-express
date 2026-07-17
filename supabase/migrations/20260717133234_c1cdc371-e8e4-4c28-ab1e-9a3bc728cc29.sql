
CREATE TABLE public.cargo_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_carga text NOT NULL UNIQUE,
  data text NOT NULL,
  hora text NOT NULL,
  destino text NOT NULL,
  endereco text NOT NULL,
  codigo_barras_1 text NOT NULL,
  codigo_barras_2 text,
  codigo_barras_3 text,
  nf_1 text, serie_1 text,
  nf_2 text, serie_2 text,
  nf_3 text, serie_3 text,
  placa_cavalo text,
  placa_bau text,
  motorista text,
  transportadora text,
  conferente text,
  lacre_1 text,
  lacre_2 text,
  lacre_3 text,
  paletes integer,
  email text,
  status text NOT NULL DEFAULT 'Gerado',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.cargo_releases TO anon, authenticated;
GRANT ALL ON public.cargo_releases TO service_role;

ALTER TABLE public.cargo_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert cargo releases"
  ON public.cargo_releases FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view cargo releases"
  ON public.cargo_releases FOR SELECT
  TO anon, authenticated
  USING (true);

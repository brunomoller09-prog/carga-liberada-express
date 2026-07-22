import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ComprovanteLogistico, type ComprovanteData } from "@/components/ComprovanteLogistico";
import logoAsset from "@/assets/logo-liberacao-carga.png.asset.json";

export const Route = createFileRoute("/historico")({
  component: HistoricoPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Não encontrado.</div>,
});

type Row = {
  id: string;
  id_carga: string;
  data: string;
  hora: string;
  destino: string;
  endereco: string;
  motorista: string | null;
  transportadora: string | null;
  conferente: string | null;
  placa_cavalo: string | null;
  placa_bau: string | null;
  paletes: number | null;
  lacre_1: string | null;
  nf_1: string | null;
  serie_1: string | null;
  nf_2: string | null;
  serie_2: string | null;
  nf_3: string | null;
  serie_3: string | null;
  observacoes: string | null;
  status: string;
  created_at: string;
};

function HistoricoPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [imprimir, setImprimir] = useState<ComprovanteData | null>(null);

  function toComprovante(r: Row): ComprovanteData {
    return {
      idCarga: r.id_carga,
      data: r.data,
      hora: r.hora,
      destino: r.destino,
      endereco: r.endereco,
      nf1: r.nf_1 || "", serie1: r.serie_1 || "",
      nf2: r.nf_2 || "", serie2: r.serie_2 || "",
      nf3: r.nf_3 || "", serie3: r.serie_3 || "",
      placaCavalo: r.placa_cavalo || "", placaBau: r.placa_bau || "",
      motorista: r.motorista || "", transportadora: r.transportadora || "",
      conferente: r.conferente || "",
      lacre1: r.lacre_1 || "",
      paletes: r.paletes?.toString() || "",
      observacoes: r.observacoes || "",
    };
  }

  function handleImprimir(r: Row) {
    setImprimir(toComprovante(r));
    setTimeout(() => {
      window.print();
      setTimeout(() => setImprimir(null), 300);
    }, 100);
  }

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("cargo_releases" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) setErro(error.message);
      else setRows((data as unknown as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtro = busca.trim().toLowerCase();
  const filtradas = filtro
    ? rows.filter((r) =>
        [r.id_carga, r.destino, r.motorista, r.transportadora, r.conferente, r.placa_cavalo]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(filtro)),
      )
    : rows;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {imprimir && <ComprovanteLogistico registro={imprimir} />}
      <header className="no-print bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <img
              src={logoAsset.url}
              alt="Liberação de Carga"
              className="h-12 w-12 rounded bg-white/10 object-contain p-1"
            />
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">Britânia Eletrodomésticos</p>
              <h1 className="text-2xl font-bold">Histórico de Liberações</h1>
            </div>
          </div>
          <Link
            to="/"
            className="rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/20"
          >
            Nova Liberação
          </Link>
        </div>
      </header>

      <main className="no-print mx-auto max-w-5xl px-6 py-8">
        <div className="mb-4">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por ID, destino, motorista, placa, transportadora..."
            className="w-full rounded-md border border-border bg-white px-4 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {erro && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erro}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : filtradas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma liberação encontrada.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-accent/40 text-xs uppercase tracking-wide text-primary">
                <tr>
                  <th className="px-4 py-3">ID da Carga</th>
                  <th className="px-4 py-3">Data / Hora</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Motorista</th>
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.flatMap((r) => {
                  const isOpen = aberto === r.id;
                  const rows = [
                    (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-4 py-3 font-mono text-xs">{r.id_carga}</td>
                        <td className="px-4 py-3">{r.data} · {r.hora}</td>
                        <td className="px-4 py-3">{r.destino}</td>
                        <td className="px-4 py-3">{r.motorista || "—"}</td>
                        <td className="px-4 py-3">{r.placa_cavalo || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleImprimir(r)}
                            className="mr-3 text-xs font-semibold text-primary hover:underline"
                          >
                            Imprimir
                          </button>
                          <button
                            onClick={() => setAberto(isOpen ? null : r.id)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            {isOpen ? "Fechar" : "Detalhes"}
                          </button>
                        </td>
                      </tr>
                    ),
                  ];
                  if (isOpen) {
                    rows.push(
                      <tr key={r.id + "-d"} className="border-t border-border bg-muted/30">
                          <td colSpan={6} className="px-4 py-4 text-xs">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              <Detail label="Endereço" value={r.endereco} />
                              <Detail label="Transportadora" value={r.transportadora} />
                              <Detail label="Conferente" value={r.conferente} />
                              <Detail label="Placa Baú" value={r.placa_bau} />
                              <Detail label="Paletes" value={r.paletes?.toString() ?? null} />
                              <Detail label="Lacre" value={r.lacre_1} />
                              <Detail label="NF 1 / Série" value={r.nf_1 ? `${r.nf_1} / ${r.serie_1}` : null} />
                              <Detail label="NF 2 / Série" value={r.nf_2 ? `${r.nf_2} / ${r.serie_2}` : null} />
                              <Detail label="NF 3 / Série" value={r.nf_3 ? `${r.nf_3} / ${r.serie_3}` : null} />
                              {r.observacoes && (
                                <div className="col-span-full">
                                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Observações</p>
                                  <p>{r.observacoes}</p>
                                </div>
                              )}
                            </div>
                          </td>
                      </tr>,
                    );
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p>{value || "—"}</p>
    </div>
  );
}
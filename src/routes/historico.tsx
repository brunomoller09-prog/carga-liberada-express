import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listCargoReleases } from "@/lib/releases.functions";
import { ComprovanteLogistico, type ComprovanteData } from "@/components/ComprovanteLogistico";
import { isHistoricoUnlocked, lockHistorico } from "@/lib/gate.functions";


export const Route = createFileRoute("/historico")({
  beforeLoad: async () => {
    const { unlocked } = await isHistoricoUnlocked();
    if (!unlocked) throw redirect({ to: "/historico-senha" });
  },
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
  notas_extras: { nf: string; serie: string }[] | null;
  observacoes: string | null;
  status: string;
  created_at: string;
};

const POR_PAGINA = 25;

// Todas as NFs de uma liberação (3 colunas + extras), já sem vazios.
function todasNotas(r: Row): { nf: string; serie: string }[] {
  const base = [
    { nf: r.nf_1 ?? "", serie: r.serie_1 ?? "" },
    { nf: r.nf_2 ?? "", serie: r.serie_2 ?? "" },
    { nf: r.nf_3 ?? "", serie: r.serie_3 ?? "" },
  ];
  return [...base, ...(r.notas_extras ?? [])].filter((n) => n.nf);
}

// "20/11/2026" -> "2026-11-20" (para comparar com <input type="date">)
function dataIso(br: string) {
  const [d, m, a] = br.split("/");
  return a && m && d ? `${a}-${m}-${d}` : "";
}

function HistoricoPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [imprimir, setImprimir] = useState<ComprovanteData | null>(null);
  const [destinoFiltro, setDestinoFiltro] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(1);

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
      notasExtras: r.notas_extras ?? [],
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

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const { rows } = await listCargoReleases();
      setRows(rows as unknown as Row[]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar o histórico.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const destinos = useMemo(() => Array.from(new Set(rows.map((r) => r.destino))).sort(), [rows]);

  // Filtros: texto (inclui número das NFs), destino e período.
  const filtro = busca.trim().toLowerCase();
  const filtradas = rows.filter((r) => {
    if (destinoFiltro && r.destino !== destinoFiltro) return false;
    const iso = dataIso(r.data);
    if (de && iso < de) return false;
    if (ate && iso > ate) return false;
    if (!filtro) return true;
    const textos = [
      r.id_carga, r.destino, r.motorista, r.transportadora, r.conferente,
      r.placa_cavalo, r.placa_bau, r.lacre_1,
      ...todasNotas(r).map((n) => n.nf),
    ];
    return textos.filter(Boolean).some((v) => (v as string).toLowerCase().includes(filtro));
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  // Resumo (cartões no topo) — calculado sobre o que está filtrado.
  const hoje = new Date().toLocaleDateString("pt-BR");
  const resumo = {
    total: filtradas.length,
    hoje: rows.filter((r) => r.data === hoje).length,
    paletes: filtradas.reduce((t, r) => t + (r.paletes ?? 0), 0),
    notas: filtradas.reduce((t, r) => t + todasNotas(r).length, 0),
  };

  function limparFiltros() {
    setBusca(""); setDestinoFiltro(""); setDe(""); setAte(""); setPagina(1);
  }

  function exportarCSV() {
    const cols: [string, (r: Row) => string][] = [
      ["ID da Carga", (r) => r.id_carga],
      ["Data", (r) => r.data],
      ["Hora", (r) => r.hora],
      ["Destino", (r) => r.destino],
      ["Endereço", (r) => r.endereco],
      ["Motorista", (r) => r.motorista ?? ""],
      ["Transportadora", (r) => r.transportadora ?? ""],
      ["Conferente", (r) => r.conferente ?? ""],
      ["Placa Cavalo", (r) => r.placa_cavalo ?? ""],
      ["Placa Baú", (r) => r.placa_bau ?? ""],
      ["Paletes", (r) => r.paletes?.toString() ?? ""],
      ["Lacre", (r) => r.lacre_1 ?? ""],
      ["NF 1", (r) => r.nf_1 ?? ""],
      ["Série 1", (r) => r.serie_1 ?? ""],
      ["NF 2", (r) => r.nf_2 ?? ""],
      ["Série 2", (r) => r.serie_2 ?? ""],
      ["NF 3", (r) => r.nf_3 ?? ""],
      ["Série 3", (r) => r.serie_3 ?? ""],
      ["Outras NFs (4ª em diante)", (r) => (r.notas_extras ?? []).map((n) => `${n.nf}/${n.serie}`).join(" | ")],
      ["Total de NFs", (r) => String(todasNotas(r).length)],
      ["Observações", (r) => r.observacoes ?? ""],
      ["Status", (r) => r.status],
    ];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const linhas = [
      cols.map((c) => esc(c[0])).join(";"),
      ...filtradas.map((r) => cols.map((c) => esc(c[1](r))).join(";")),
    ];
    const blob = new Blob(["\uFEFF" + linhas.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liberacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {imprimir && <ComprovanteLogistico registro={imprimir} />}
      <header className="no-print bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Britânia Eletrodomésticos</p>
            <h1 className="text-2xl font-bold">Histórico de Liberações</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/20"
            >
              Nova Liberação
            </Link>
            <button
              onClick={async () => {
                await lockHistorico();
                await router.navigate({ to: "/historico-senha" });
              }}
              className="rounded-md border border-primary-foreground/30 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/20"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="no-print mx-auto max-w-5xl px-6 py-8">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card titulo="Liberações" valor={resumo.total} />
          <Card titulo="Hoje" valor={resumo.hoje} />
          <Card titulo="Notas fiscais" valor={resumo.notas} />
          <Card titulo="Paletes" valor={resumo.paletes} />
        </div>

        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm">
          <input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            placeholder="Buscar por ID, nº da NF, destino, motorista, placa, lacre, transportadora..."
            className="w-full rounded-md border border-border bg-white px-4 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Destino
              <select
                value={destinoFiltro}
                onChange={(e) => { setDestinoFiltro(e.target.value); setPagina(1); }}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground"
              >
                <option value="">Todos</option>
                {destinos.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              De
              <input type="date" value={de} onChange={(e) => { setDe(e.target.value); setPagina(1); }}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Até
              <input type="date" value={ate} onChange={(e) => { setAte(e.target.value); setPagina(1); }}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground" />
            </label>
            <button onClick={limparFiltros}
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-accent">
              Limpar
            </button>
            <button onClick={() => void carregar()} disabled={loading}
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50">
              Atualizar
            </button>
            <button
              onClick={exportarCSV}
              disabled={filtradas.length === 0}
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Exportar Excel (CSV)
            </button>
          </div>
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
                  <th className="px-4 py-3">NFs</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {visiveis.flatMap((r) => {
                  const isOpen = aberto === r.id;
                  const rows = [
                    (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-4 py-3 font-mono text-xs">{r.id_carga}</td>
                        <td className="px-4 py-3">{r.data} · {r.hora}</td>
                        <td className="px-4 py-3">{r.destino}</td>
                        <td className="px-4 py-3">{r.motorista || "—"}</td>
                        <td className="px-4 py-3">{r.placa_cavalo || "—"}</td>
                        <td className="px-4 py-3">{todasNotas(r).length}</td>
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
                          <td colSpan={7} className="px-4 py-4 text-xs">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              <Detail label="Endereço" value={r.endereco} />
                              <Detail label="Transportadora" value={r.transportadora} />
                              <Detail label="Conferente" value={r.conferente} />
                              <Detail label="Placa Baú" value={r.placa_bau} />
                              <Detail label="Paletes" value={r.paletes?.toString() ?? null} />
                              <Detail label="Lacre" value={r.lacre_1} />
                              <div className="col-span-full">
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                                  Notas fiscais ({todasNotas(r).length})
                                </p>
                                <p>
                                  {todasNotas(r).length
                                    ? todasNotas(r).map((n) => `${n.nf} / ${n.serie}`).join("  ·  ")
                                    : "—"}
                                </p>
                              </div>
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

        {!loading && filtradas.length > POR_PAGINA && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              onClick={() => setPagina(Math.max(1, paginaAtual - 1))}
              disabled={paginaAtual <= 1}
              className="rounded-md border border-border bg-white px-4 py-2 font-semibold hover:bg-accent disabled:opacity-50"
            >
              ← Anterior
            </button>
            <span className="text-muted-foreground">Página {paginaAtual} de {totalPaginas}</span>
            <button
              onClick={() => setPagina(Math.min(totalPaginas, paginaAtual + 1))}
              disabled={paginaAtual >= totalPaginas}
              className="rounded-md border border-border bg-white px-4 py-2 font-semibold hover:bg-accent disabled:opacity-50"
            >
              Próxima →
            </button>
          </div>
        )}
        {rows.length >= 2000 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Mostrando as 2000 liberações mais recentes. Use o filtro de datas ou exporte para ver períodos anteriores.
          </p>
        )}
      </main>
    </div>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="text-2xl font-bold text-primary">{valor}</p>
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
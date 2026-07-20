import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ComprovanteLogistico, type ComprovanteData } from "@/components/ComprovanteLogistico";

export const Route = createFileRoute("/")({
  component: LiberacaoCarga,
});

const DESTINOS: { value: string; endereco: string }[] = [
  { value: "A3", endereco: "Galpão A3 - Fábrica" },
  { value: "B2", endereco: "Galpão Novo CDPA - Rua Dona Francisca 12340 - Zona Industrial Norte" },
  { value: "CDAG", endereco: "Rua: Hans Dieter Schmidt, 3303 - Zona Industrial Norte Joinville" },
  { value: "CDAT", endereco: "Rua: Dona Francisca Número: 12340 Zona Industrial Norte Joinville" },
  { value: "CDPA", endereco: "Rua: Dona Francisca Número: 12340 Zona Industrial Norte Joinville" },
  { value: "FABRICA B", endereco: "Rua: Dona Francisca Número: 12340 Zona Industrial Norte Joinville" },
  { value: "GC BRASIL", endereco: "Rua: Atalanta, 101-159 - Pomeranos, Timbó" },
  { value: "INTERATIVA", endereco: "Rua: Dona Francisca, 10174 - Zona Industrial Norte" },
  { value: "MASTER", endereco: "Rua: Bernardo Schneider (marginal BR 101) Rio Bonito, Joinville" },
  { value: "TERCEIRO", endereco: "" },
  { value: "TIGRE", endereco: "R. Ottokar Doerffel, 875 - Atiradores" },
  { value: "WEG", endereco: "Rod. Gov. Mário Covas 475 - Espinheiros, Itajaí - SC" },
];

function extractNfInfo(barcode: string): { nf: string; serie: string } {
  const clean = (barcode || "").replace(/\D/g, "");
  if (clean.length < 34) return { nf: "", serie: "" };
  const serie = clean.substring(22, 25);
  const numero = clean.substring(25, 34).replace(/^0+/, "");
  return { nf: numero, serie };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function gerarIdCarga(d: Date) {
  return `LG-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

type Registro = ComprovanteData;

function LiberacaoCarga() {
  const [destino, setDestino] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cb1, setCb1] = useState("");
  const [cb2, setCb2] = useState("");
  const [cb3, setCb3] = useState("");
  const [placaCavalo, setPlacaCavalo] = useState("");
  const [placaBau, setPlacaBau] = useState("");
  const [motorista, setMotorista] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [paletes, setPaletes] = useState("");
  const [lacre1, setLacre1] = useState("");
  const [conferente, setConferente] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [registro, setRegistro] = useState<Registro | null>(null);

  const nf1 = useMemo(() => extractNfInfo(cb1), [cb1]);
  const nf2 = useMemo(() => extractNfInfo(cb2), [cb2]);
  const nf3 = useMemo(() => extractNfInfo(cb3), [cb3]);

  const isTerceiro = destino === "TERCEIRO";

  function handleDestino(v: string) {
    setDestino(v);
    const found = DESTINOS.find((d) => d.value === v);
    if (v === "TERCEIRO") {
      setEndereco("");
    } else if (found) {
      setEndereco(found.endereco);
    }
  }

  function limpar() {
    setDestino(""); setEndereco("");
    setCb1(""); setCb2(""); setCb3("");
    setPlacaCavalo(""); setPlacaBau("");
    setMotorista(""); setTransportadora("");
    setPaletes("");
    setLacre1("");
    setConferente(""); setObservacoes("");
    setErro(null); setRegistro(null);
  }

  async function finalizar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!destino || !endereco || !cb1 || !conferente) {
      setErro("⚠️ Verifique os campos obrigatórios antes de finalizar.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    const agora = new Date();
    const idCarga = gerarIdCarga(agora);
    const dataFmt = `${pad(agora.getDate())}/${pad(agora.getMonth() + 1)}/${agora.getFullYear()}`;
    const horaFmt = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;

    const payload = {
      id_carga: idCarga,
      data: dataFmt,
      hora: horaFmt,
      destino,
      endereco,
      codigo_barras_1: cb1,
      codigo_barras_2: cb2 || null,
      codigo_barras_3: cb3 || null,
      nf_1: nf1.nf || null, serie_1: nf1.serie || null,
      nf_2: cb2 ? nf2.nf || null : null, serie_2: cb2 ? nf2.serie || null : null,
      nf_3: cb3 ? nf3.nf || null : null, serie_3: cb3 ? nf3.serie || null : null,
      placa_cavalo: placaCavalo || null,
      placa_bau: placaBau || null,
      motorista: motorista || null,
      transportadora: transportadora || null,
      conferente,
      lacre_1: lacre1 || null,
      lacre_2: null,
      lacre_3: null,
      paletes: paletes ? Number(paletes) : null,
      email: null,
      status: "Gerado",
      observacoes: observacoes || null,
    };

    const { error } = await supabase.from("cargo_releases" as never).insert(payload as never);
    setSaving(false);

    if (error) {
      setErro(`Erro ao salvar: ${error.message}`);
      return;
    }

    setRegistro({
      idCarga, data: dataFmt, hora: horaFmt,
      destino, endereco,
      nf1: nf1.nf, serie1: nf1.serie,
      nf2: cb2 ? nf2.nf : "", serie2: cb2 ? nf2.serie : "",
      nf3: cb3 ? nf3.nf : "", serie3: cb3 ? nf3.serie : "",
      placaCavalo, placaBau, motorista, transportadora,
      conferente,
      lacre1,
      paletes, observacoes,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Cabeçalho */}
      <header className="no-print bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Britânia Eletrodomésticos</p>
            <h1 className="text-2xl font-bold">Liberação de Carga — Expedição Fábrica Joinville</h1>
          </div>
          <Link
            to="/historico"
            className="rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/20"
          >
            Histórico
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {erro && (
          <div className="no-print mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erro}
          </div>
        )}

        {registro && (
          <div className="no-print mb-6 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✅ Liberação de carga registrada com sucesso!<br />
            O documento foi gerado e pode ser impresso ou salvo em PDF.
          </div>
        )}

        {registro && (
          <ComprovanteLogistico registro={registro} />
        )}

        {registro && (
          <div className="no-print mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => window.print()}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
            >
              Imprimir / Salvar PDF
            </button>
            <button
              onClick={limpar}
              className="rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
            >
              Nova Liberação
            </button>
          </div>
        )}

        {!registro && (
          <form onSubmit={finalizar} className="no-print space-y-6">
            <Section titulo="1. Dados da Carga">
              <Field label="Destino *">
                <select
                  value={destino}
                  onChange={(e) => handleDestino(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Selecione o destino</option>
                  {DESTINOS.map((d) => (
                    <option key={d.value} value={d.value}>{d.value}</option>
                  ))}
                </select>
              </Field>
              <Field label="Endereço *" full>
                <input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  readOnly={!isTerceiro}
                  placeholder={isTerceiro ? "Digite o endereço completo" : "Preenchido automaticamente"}
                  className={`input ${!isTerceiro ? "bg-muted" : ""}`}
                  required
                />
              </Field>
              <p className="col-span-full text-xs text-muted-foreground">
                Data, hora e ID da carga são gerados automaticamente ao finalizar.
              </p>
            </Section>

            <Section titulo="2. Notas Fiscais">
              <Field label="Código de Barras 1 * (44 dígitos)" full>
                <input value={cb1} onChange={(e) => setCb1(e.target.value)} className="input font-mono" required />
              </Field>
              <Field label="NF 1"><input value={nf1.nf} readOnly className="input bg-muted" /></Field>
              <Field label="Série 1"><input value={nf1.serie} readOnly className="input bg-muted" /></Field>

              <Field label="Código de Barras 2 (opcional)" full>
                <input value={cb2} onChange={(e) => setCb2(e.target.value)} className="input font-mono" />
              </Field>
              <Field label="NF 2"><input value={cb2 ? nf2.nf : ""} readOnly className="input bg-muted" /></Field>
              <Field label="Série 2"><input value={cb2 ? nf2.serie : ""} readOnly className="input bg-muted" /></Field>

              <Field label="Código de Barras 3 (opcional)" full>
                <input value={cb3} onChange={(e) => setCb3(e.target.value)} className="input font-mono" />
              </Field>
              <Field label="NF 3"><input value={cb3 ? nf3.nf : ""} readOnly className="input bg-muted" /></Field>
              <Field label="Série 3"><input value={cb3 ? nf3.serie : ""} readOnly className="input bg-muted" /></Field>
            </Section>

            <Section titulo="3. Dados do Veículo">
              <Field label="Placa Cavalo"><input value={placaCavalo} onChange={(e) => setPlacaCavalo(e.target.value.toUpperCase())} className="input uppercase" /></Field>
              <Field label="Placa Baú"><input value={placaBau} onChange={(e) => setPlacaBau(e.target.value.toUpperCase())} className="input uppercase" /></Field>
              <Field label="Motorista"><input value={motorista} onChange={(e) => setMotorista(e.target.value)} className="input" /></Field>
              <Field label="Transportadora"><input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} className="input" /></Field>
            </Section>

            <Section titulo="4. Lacres e Paletes">
              <Field label="Quantidade de Paletes">
                <input type="number" min={0} value={paletes} onChange={(e) => setPaletes(e.target.value)} className="input" />
              </Field>
              <Field label="Lacre"><input value={lacre1} onChange={(e) => setLacre1(e.target.value)} className="input" /></Field>
            </Section>

            <Section titulo="5. Conferência">
              <Field label="Conferente *"><input value={conferente} onChange={(e) => setConferente(e.target.value)} className="input" required /></Field>
              <Field label="Observações" full>
                <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="input min-h-[80px]" />
              </Field>
            </Section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-lg hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Finalizar Liberação"}
              </button>
            </div>
          </form>
        )}
      </main>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid var(--color-border);
          background: white;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 14px;
          color: var(--color-foreground);
          outline: none;
        }
        .input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 2px oklch(0.35 0.09 250 / 0.15); }
      `}</style>
    </div>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-accent/40 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">{titulo}</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}


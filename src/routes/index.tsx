import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
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
//Filtrar NF e serie 
function extractNfInfo(barcode: string): { nf: string; serie: string } {
  const clean = (barcode || "").replace(/\D/g, "");
  if (clean.length < 34) return { nf: "", serie: "" };
  const serie = clean.substring(22, 25);
  const numero = clean.substring(27, 34).replace(/^0+/, "");
  return { nf: numero, serie };
}

// Limite de notas por liberação (evita comprovante gigante / erro de leitura).
const MAX_NOTAS = 20;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function gerarIdCarga(d: Date) {
  return `LG-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function formatarPlaca(v: string) {
  // Aceita formato antigo (ABC-1234) e Mercosul (ABC1D23). Mantém apenas letras/números, máx 7.
  const clean = (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
}

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "").slice(0, 44);
}

// Campo que aceita SOMENTE entrada de leitor de código de barras.
// Digitação manual é bloqueada. Detecção por velocidade de teclas (< 50ms entre teclas).
function BarcodeScanInput({
  value,
  onChange,
  required,
  autoFocus,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const lastKeyAt = useRef<number>(0);
  const bufferRef = useRef<string>("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permite navegação/edição básica
    if (e.key === "Tab") return;
    e.preventDefault();

    const now = performance.now();
    const gap = now - lastKeyAt.current;
    lastKeyAt.current = now;

    // Backspace só se for o próprio scanner (raro) — ignoramos
    if (e.key === "Backspace") {
      bufferRef.current = "";
      onChange("");
      return;
    }

    if (e.key === "Enter") {
      // Finaliza leitura
      return;
    }

    // Só aceita dígitos
    if (!/^[0-9]$/.test(e.key)) return;

    // Se demorou muito desde a última tecla, é digitação humana → reinicia
    if (gap > 50 && bufferRef.current.length > 0) {
      bufferRef.current = "";
    }

    bufferRef.current = (bufferRef.current + e.key).slice(0, 44);
    onChange(bufferRef.current);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Bloqueia colar também
    e.preventDefault();
  };

  const clear = () => {
    bufferRef.current = "";
    onChange("");
  };

  return (
    <div className="flex gap-2">
      <input
        value={value}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={() => { /* controlado só pelo scanner */ }}
        onDrop={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        className="input font-mono flex-1"
        inputMode="none"
        autoComplete="off"
        autoFocus={autoFocus}
        required={required}
        placeholder={placeholder ?? "Escaneie o código de barras (digitação bloqueada)"}
        title="Este campo aceita apenas leitura por scanner de código de barras"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          className="px-3 py-1 text-xs rounded border border-border hover:bg-muted"
          title="Limpar"
        >
          Limpar
        </button>
      )}
    </div>
  );
}

type Registro = ComprovanteData;

function LiberacaoCarga() {
  const [destino, setDestino] = useState("");
  const [endereco, setEndereco] = useState("");
  // Lista de códigos de barras (um por nota fiscal). Começa com 3 campos
  // e o conferente pode adicionar mais com o botão "+ Adicionar nota fiscal".
  const [cbs, setCbs] = useState<string[]>(["", "", ""]);
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

  // NF e série de cada código lido (mesma ordem da lista cbs).
  const notas = useMemo(() => cbs.map((c) => (c ? extractNfInfo(c) : { nf: "", serie: "" })), [cbs]);
  const lidas = cbs.filter(Boolean).length;
  // Códigos repetidos (a mesma NF bipada duas vezes) — avisa antes de salvar.
  const duplicados = useMemo(() => {
    const vistos = new Set<string>();
    const dups = new Set<string>();
    for (const c of cbs) {
      if (!c) continue;
      if (vistos.has(c)) dups.add(c);
      vistos.add(c);
    }
    return dups;
  }, [cbs]);

  function setCb(i: number, v: string) {
    setCbs((prev) => prev.map((c, idx) => (idx === i ? v : c)));
  }
  function adicionarNota() {
    setCbs((prev) => (prev.length >= MAX_NOTAS ? prev : [...prev, ""]));
  }
  function removerNota(i: number) {
    setCbs((prev) => prev.filter((_, idx) => idx !== i));
  }

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
    setCbs(["", "", ""]);
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

    if (!destino || !endereco || !cbs[0] || !conferente) {
      setErro("⚠️ Verifique os campos obrigatórios antes de finalizar.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const invalido = cbs.some((c) => c && c.replace(/\D/g, "").length !== 44);
    if (invalido) {
      setErro("⚠️ Cada código de barras deve conter exatamente 44 dígitos.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (duplicados.size > 0) {
      setErro("⚠️ Há nota fiscal lida em duplicidade. Remova a repetida antes de finalizar.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    const agora = new Date();
    const idCarga = gerarIdCarga(agora);
    const dataFmt = `${pad(agora.getDate())}/${pad(agora.getMonth() + 1)}/${agora.getFullYear()}`;
    const horaFmt = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;

    // Só considera os campos que foram realmente lidos, mantendo a ordem.
    const lidos = cbs
      .map((c, i) => ({ cb: c, ...notas[i] }))
      .filter((n) => n.cb);
    // As 3 primeiras notas ficam nas colunas antigas (nf_1..3); da 4ª em
    // diante vão para a coluna JSON "notas_extras".
    const extras = lidos.slice(3).map((n) => ({ codigo_barras: n.cb, nf: n.nf, serie: n.serie }));

    const payload: Record<string, unknown> = {
      id_carga: idCarga,
      data: dataFmt,
      hora: horaFmt,
      destino,
      endereco,
      codigo_barras_1: lidos[0]?.cb ?? "",
      codigo_barras_2: lidos[1]?.cb ?? null,
      codigo_barras_3: lidos[2]?.cb ?? null,
      nf_1: lidos[0]?.nf || null, serie_1: lidos[0]?.serie || null,
      nf_2: lidos[1]?.nf || null, serie_2: lidos[1]?.serie || null,
      nf_3: lidos[2]?.nf || null, serie_3: lidos[2]?.serie || null,
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
    // Só envia notas_extras quando existe (assim o site continua funcionando
    // mesmo antes de rodar o SQL que cria essa coluna, para liberações de até 3 NFs).
    if (extras.length > 0) payload.notas_extras = extras;

    const { error } = await supabase.from("cargo_releases" as never).insert(payload as never);
    setSaving(false);

    if (error) {
      setErro(`Erro ao salvar: ${error.message}`);
      return;
    }

    setRegistro({
      idCarga, data: dataFmt, hora: horaFmt,
      destino, endereco,
      nf1: lidos[0]?.nf ?? "", serie1: lidos[0]?.serie ?? "",
      nf2: lidos[1]?.nf ?? "", serie2: lidos[1]?.serie ?? "",
      nf3: lidos[2]?.nf ?? "", serie3: lidos[2]?.serie ?? "",
      notasExtras: extras.map((n) => ({ nf: n.nf, serie: n.serie })),
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
          <div className="flex items-center gap-2">
            <Link
              to="/historico"
              className="rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/20"
            >
              Histórico
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {erro && (
          <div className="no-print mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erro}
          </div>
        )}

        {registro && <TelaSucesso registro={registro} onNova={limpar} />}

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

            <Section titulo={`2. Notas Fiscais (${lidas} lida${lidas === 1 ? "" : "s"})`}>
              {cbs.map((cb, i) => (
                <NotaBloco
                  key={i}
                  indice={i}
                  cb={cb}
                  nf={notas[i].nf}
                  serie={notas[i].serie}
                  obrigatoria={i === 0}
                  duplicada={!!cb && duplicados.has(cb)}
                  onChange={(v) => setCb(i, onlyDigits(v))}
                  onRemover={i >= 3 ? () => removerNota(i) : undefined}
                />
              ))}
              <div className="col-span-full">
                <button
                  type="button"
                  onClick={adicionarNota}
                  disabled={cbs.length >= MAX_NOTAS}
                  className="rounded-md border border-dashed border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-accent disabled:opacity-50"
                >
                  + Adicionar nota fiscal
                </button>
                <span className="ml-3 text-xs text-muted-foreground">
                  Máximo de {MAX_NOTAS} notas por liberação.
                </span>
              </div>
            </Section>

            <Section titulo="3. Dados do Veículo">
              <Field label="Placa Cavalo">
                <input
                  value={placaCavalo}
                  onChange={(e) => setPlacaCavalo(formatarPlaca(e.target.value))}
                  className="input uppercase font-mono"
                  maxLength={8}
                  placeholder="ABC-1D23"
                />
              </Field>
              <Field label="Placa Baú">
                <input
                  value={placaBau}
                  onChange={(e) => setPlacaBau(formatarPlaca(e.target.value))}
                  className="input uppercase font-mono"
                  maxLength={8}
                  placeholder="ABC-1D23"
                />
              </Field>
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

// Tela exibida depois de gerar a liberação: confirmação, resumo rápido,
// ações (imprimir / nova liberação) e a pré-visualização do comprovante.
// O comprovante em si (ComprovanteLogistico) NÃO foi alterado: é o
// formulário oficial LG-SC.FO.030 e precisa sair igual no papel.
function TelaSucesso({ registro, onNova }: { registro: Registro; onNova: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const totalNotas =
    [registro.nf1, registro.nf2, registro.nf3].filter(Boolean).length + (registro.notasExtras?.length ?? 0);

  async function copiarId() {
    try {
      await navigator.clipboard.writeText(registro.idCarga);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sem permissão de área de transferência: ignora */
    }
  }

  const itens: { rotulo: string; valor: string }[] = [
    { rotulo: "Destino", valor: registro.destino },
    { rotulo: "Notas fiscais", valor: String(totalNotas) },
    { rotulo: "Paletes", valor: registro.paletes || "—" },
    { rotulo: "Motorista", valor: registro.motorista || "—" },
    { rotulo: "Placa cavalo", valor: registro.placaCavalo || "—" },
    { rotulo: "Lacre", valor: registro.lacre1 || "—" },
  ];

  return (
    <div>
      <div className="no-print overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-md">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl">✓</span>
            <div>
              <p className="text-lg font-bold leading-tight">Liberação registrada com sucesso</p>
              <p className="text-sm opacity-90">{registro.data} às {registro.hora} · Conferente: {registro.conferente}</p>
            </div>
          </div>
          <div className="rounded-lg bg-black/25 px-4 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">ID da carga</p>
            <p className="font-mono text-lg font-bold tracking-wide">{registro.idCarga}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-6">
          {itens.map((i) => (
            <div key={i.rotulo} className="bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{i.rotulo}</p>
              <p className="truncate text-sm font-semibold text-foreground" title={i.valor}>{i.valor}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 px-6 py-4">
          <button
            onClick={() => window.print()}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
          >
            🖨️ Imprimir / Salvar PDF
          </button>
          <button
            onClick={onNova}
            className="rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
          >
            + Nova liberação
          </button>
          <button
            onClick={copiarId}
            className="rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
          >
            {copiado ? "✓ ID copiado" : "Copiar ID"}
          </button>
          <p className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">
            Imprima e anexe as NFs ao comprovante antes de liberar o veículo.
          </p>
        </div>
      </div>

      <p className="no-print mb-2 mt-8 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Pré-visualização do comprovante
      </p>
      <div className="no-print-frame overflow-x-auto rounded-xl border border-border bg-muted p-3 shadow-inner sm:p-6">
        <div className="mx-auto max-w-[900px] bg-white shadow-lg ring-1 ring-black/10">
          <ComprovanteLogistico registro={registro} />
        </div>
      </div>
    </div>
  );
}

// Um bloco de nota fiscal: campo do scanner + NF + série (somente leitura).
// Blocos a partir do 4º têm botão "Remover".
function NotaBloco({
  indice, cb, nf, serie, obrigatoria, duplicada, onChange, onRemover,
}: {
  indice: number; cb: string; nf: string; serie: string;
  obrigatoria: boolean; duplicada: boolean;
  onChange: (v: string) => void; onRemover?: () => void;
}) {
  const n = indice + 1;
  return (
    <>
      <Field label={`Código de Barras ${n}${obrigatoria ? " *" : ""} (somente scanner)`} full>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <BarcodeScanInput
              value={cb}
              onChange={onChange}
              required={obrigatoria}
              autoFocus={obrigatoria || indice >= 3}
            />
          </div>
          {onRemover && (
            <button
              type="button"
              onClick={onRemover}
              className="rounded border border-destructive/40 px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
              title="Remover esta nota"
            >
              Remover
            </button>
          )}
        </div>
        {duplicada && <span className="text-xs font-semibold text-destructive">⚠️ Esta nota já foi lida acima.</span>}
      </Field>
      <Field label={`NF ${n}`}><input value={nf} readOnly className="input bg-muted" /></Field>
      <Field label={`Série ${n}`}><input value={serie} readOnly className="input bg-muted" /></Field>
    </>
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


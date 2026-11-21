import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ComprovanteLogistico, type ComprovanteData } from "@/components/ComprovanteLogistico";
import britaniaLogo from "@/assets/britania-logo.jpg";

export const Route = createFileRoute("/")({
  component: LiberacaoCarga,
});

// Destinos fixos. "TERCEIRO" libera o campo de endereço para digitar.
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

// Filtrar NF e série da chave de acesso (44 dígitos).
// Série = posições 23–25 (índice 22–25). NF = 7 dígitos, índice 27–34, sem zeros à esquerda.
function extractNfInfo(barcode: string): { nf: string; serie: string } {
  const clean = (barcode || "").replace(/\D/g, "");
  if (clean.length < 34) return { nf: "", serie: "" };
  const serie = clean.substring(22, 25);
  const numero = clean.substring(27, 34).replace(/^0+/, "");
  return { nf: numero, serie };
}

// Limite de notas por liberação (evita comprovante gigante / erro de leitura).
const MAX_NOTAS = 20;
// Chave usada para lembrar o último conferente neste navegador.
const CHAVE_CONFERENTE = "liberacao:ultimo-conferente";

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

type Registro = ComprovanteData;
type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

function LiberacaoCarga() {
  const [destino, setDestino] = useState("");
  const [endereco, setEndereco] = useState("");
  // Códigos de barras já lidos (cada um = uma nota fiscal), na ordem da leitura.
  const [cbs, setCbs] = useState<string[]>([]);
  const [placaCavalo, setPlacaCavalo] = useState("");
  const [placaBau, setPlacaBau] = useState("");
  const [motorista, setMotorista] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [paletes, setPaletes] = useState("");
  const [lacre1, setLacre1] = useState("");
  const [conferente, setConferente] = useState("");

  const [aviso, setAviso] = useState<Aviso>(null);
  const [ultimaLida, setUltimaLida] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [registro, setRegistro] = useState<Registro | null>(null);

  // Preenche o conferente com o último usado neste computador (conveniência).
  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_CONFERENTE);
      if (salvo) setConferente(salvo);
    } catch {
      /* navegador sem armazenamento: segue sem preencher */
    }
  }, []);

  const notas = useMemo(() => cbs.map((c) => ({ cb: c, ...extractNfInfo(c) })), [cbs]);
  const isTerceiro = destino === "TERCEIRO";

  // O que ainda falta para poder finalizar (mostrado no painel lateral).
  // Placa completa = 7 letras/números (ABC1D23 ou ABC1234), sem contar o hífen.
  const placaOk = (p: string) => p.replace(/[^A-Z0-9]/g, "").length === 7;
  const veiculoOk = placaOk(placaCavalo) && placaOk(placaBau) && !!motorista.trim() && !!transportadora.trim();
  const cargaOk = Number(paletes) > 0 && !!lacre1.trim() && !!conferente.trim();

  // TODOS os campos são obrigatórios. Esta lista aparece no painel lateral
  // e o botão Finalizar só libera quando tudo estiver preenchido.
  const pendencias = [
    { ok: !!destino && !!endereco.trim(), texto: isTerceiro && !endereco.trim() ? "Endereço do terceiro" : "Destino" },
    { ok: cbs.length > 0, texto: "Pelo menos uma nota fiscal" },
    { ok: placaOk(placaCavalo), texto: "Placa do cavalo" },
    { ok: placaOk(placaBau), texto: "Placa do baú" },
    { ok: !!motorista.trim(), texto: "Motorista" },
    { ok: !!transportadora.trim(), texto: "Transportadora" },
    { ok: Number(paletes) > 0, texto: "Paletes" },
    { ok: !!lacre1.trim(), texto: "Lacre" },
    { ok: !!conferente.trim(), texto: "Conferente" },
  ];
  const podeFinalizar = pendencias.every((p) => p.ok);

  function handleDestino(v: string) {
    setDestino(v);
    const found = DESTINOS.find((d) => d.value === v);
    setEndereco(v === "TERCEIRO" ? "" : found?.endereco ?? "");
  }

  // Chamado pela estação de leitura quando um código completo (44 dígitos) é lido.
  function adicionarNota(codigo: string) {
    if (cbs.includes(codigo)) {
      setAviso({ tipo: "erro", texto: `A NF ${extractNfInfo(codigo).nf} já foi lida nesta liberação.` });
      return;
    }
    if (cbs.length >= MAX_NOTAS) {
      setAviso({ tipo: "erro", texto: `Limite de ${MAX_NOTAS} notas por liberação atingido.` });
      return;
    }
    setCbs((prev) => [...prev, codigo]);
    setUltimaLida(codigo);
    setAviso({ tipo: "ok", texto: `NF ${extractNfInfo(codigo).nf} adicionada.` });
  }

  function removerNota(codigo: string) {
    setCbs((prev) => prev.filter((c) => c !== codigo));
    setAviso(null);
  }

  function limpar() {
    setDestino(""); setEndereco("");
    setCbs([]); setUltimaLida(null); setAviso(null);
    setPlacaCavalo(""); setPlacaBau("");
    setMotorista(""); setTransportadora("");
    setPaletes(""); setLacre1("");
    setErro(null); setRegistro(null);
    // O conferente continua preenchido: normalmente é a mesma pessoa.
  }

  async function finalizar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!podeFinalizar) {
      setErro("Todos os campos são obrigatórios. Preencha os itens pendentes.");
      return;
    }

    setSaving(true);
    const agora = new Date();
    const idCarga = gerarIdCarga(agora);
    const dataFmt = `${pad(agora.getDate())}/${pad(agora.getMonth() + 1)}/${agora.getFullYear()}`;
    const horaFmt = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;

    // As 3 primeiras notas ficam nas colunas antigas (nf_1..3); da 4ª em
    // diante vão para a coluna JSON "notas_extras".
    const extras = notas.slice(3).map((n) => ({ codigo_barras: n.cb, nf: n.nf, serie: n.serie }));

    const payload: Record<string, unknown> = {
      id_carga: idCarga,
      data: dataFmt,
      hora: horaFmt,
      destino,
      endereco: endereco.trim(),
      codigo_barras_1: notas[0]?.cb ?? "",
      codigo_barras_2: notas[1]?.cb ?? null,
      codigo_barras_3: notas[2]?.cb ?? null,
      nf_1: notas[0]?.nf || null, serie_1: notas[0]?.serie || null,
      nf_2: notas[1]?.nf || null, serie_2: notas[1]?.serie || null,
      nf_3: notas[2]?.nf || null, serie_3: notas[2]?.serie || null,
      placa_cavalo: placaCavalo || null,
      placa_bau: placaBau || null,
      motorista: motorista.trim() || null,
      transportadora: transportadora.trim() || null,
      conferente: conferente.trim(),
      lacre_1: lacre1.trim() || null,
      lacre_2: null,
      lacre_3: null,
      paletes: paletes ? Number(paletes) : null,
      email: null,
      status: "Gerado",
      // Campo de observações saiu do formulário (ninguém usava); a coluna continua no banco.
      observacoes: null,
    };
    // Só envia notas_extras quando existe (assim liberações de até 3 NFs
    // funcionam mesmo antes de rodar o SQL que cria essa coluna).
    if (extras.length > 0) payload.notas_extras = extras;

    const { error } = await supabase.from("cargo_releases" as never).insert(payload as never);
    setSaving(false);

    if (error) {
      setErro(`Não foi possível salvar a liberação: ${error.message}`);
      return;
    }

    try {
      window.localStorage.setItem(CHAVE_CONFERENTE, conferente.trim());
    } catch {
      /* ignora */
    }

    setRegistro({
      idCarga, data: dataFmt, hora: horaFmt,
      destino, endereco: endereco.trim(),
      nf1: notas[0]?.nf ?? "", serie1: notas[0]?.serie ?? "",
      nf2: notas[1]?.nf ?? "", serie2: notas[1]?.serie ?? "",
      nf3: notas[2]?.nf ?? "", serie3: notas[2]?.serie ?? "",
      notasExtras: extras.map((n) => ({ nf: n.nf, serie: n.serie })),
      placaCavalo, placaBau, motorista, transportadora,
      conferente: conferente.trim(),
      lacre1,
      paletes, observacoes: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="lb min-h-screen">
      <Cabecalho />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {registro ? (
          <TelaSucesso registro={registro} onNova={limpar} />
        ) : (
          <form onSubmit={finalizar} className="no-print grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="lb-folha">
              <p className="lb-todos-obrig">Todos os campos são obrigatórios.</p>
              <Etapa numero={1} titulo="Destino" concluida={pendencias[0].ok}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Destino da carga">
                  {DESTINOS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      aria-pressed={destino === d.value}
                      onClick={() => handleDestino(d.value)}
                      className="lb-destino"
                    >
                      {d.value === "TERCEIRO" ? "Terceiro" : d.value}
                    </button>
                  ))}
                </div>
                {destino && !isTerceiro && (
                  <div className="mt-4">
                    <span className="lb-rotulo">Endereço</span>
                    <p className="lb-endereco-fixo">{endereco || "—"}</p>
                  </div>
                )}
                {isTerceiro && (
                  <label className="mt-4 block">
                    <span className="lb-rotulo">Endereço do terceiro</span>
                    <input
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      autoFocus
                      placeholder="Rua, número, bairro e cidade"
                      className="lb-input"
                    />
                  </label>
                )}
              </Etapa>

              <Etapa
                numero={2}
                titulo="Notas fiscais"
                concluida={pendencias[1].ok}
                extra={<span className="lb-contador">{cbs.length} de {MAX_NOTAS}</span>}
              >
                <EstacaoLeitura
                  onLeitura={adicionarNota}
                  onIncompleta={() => setAviso({ tipo: "erro", texto: "Leitura incompleta. Bipe o código de barras novamente." })}
                  cheia={cbs.length >= MAX_NOTAS}
                />
                <p className={`lb-aviso ${aviso?.tipo === "erro" ? "lb-aviso-erro" : "lb-aviso-ok"}`} aria-live="polite">
                  {aviso?.texto ?? " "}
                </p>

                {notas.length > 0 && (
                  <ol className="lb-lista">
                    {notas.map((n, i) => (
                      <li key={n.cb} className={`lb-nota ${n.cb === ultimaLida ? "lb-nota-nova" : ""}`}>
                        <span className="lb-nota-ordem">{i + 1}</span>
                        <span className="lb-nota-nf">{n.nf || "—"}</span>
                        <span className="lb-nota-serie">Série {n.serie || "—"}</span>
                        <span className="lb-nota-chave" title={n.cb}>
                          {n.cb.slice(0, 6)}…{n.cb.slice(-6)}
                        </span>
                        <button type="button" onClick={() => removerNota(n.cb)} className="lb-remover" aria-label={`Remover NF ${n.nf}`}>
                          Remover
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </Etapa>

              <Etapa numero={3} titulo="Veículo e motorista" concluida={veiculoOk}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo rotulo="Placa do cavalo">
                    <input value={placaCavalo} onChange={(e) => setPlacaCavalo(formatarPlaca(e.target.value))}
                      className="lb-input lb-placa" maxLength={8} placeholder="ABC-1D23" autoComplete="off" />
                  </Campo>
                  <Campo rotulo="Placa do baú">
                    <input value={placaBau} onChange={(e) => setPlacaBau(formatarPlaca(e.target.value))}
                      className="lb-input lb-placa" maxLength={8} placeholder="ABC-1D23" autoComplete="off" />
                  </Campo>
                  <Campo rotulo="Motorista">
                    <input value={motorista} onChange={(e) => setMotorista(e.target.value)} className="lb-input" placeholder="Nome completo" />
                  </Campo>
                  <Campo rotulo="Transportadora">
                    <input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} className="lb-input" />
                  </Campo>
                </div>
              </Etapa>

              <Etapa numero={4} titulo="Carga e conferência" concluida={cargaOk} ultima>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Campo rotulo="Paletes">
                    <Contador valor={paletes} onChange={setPaletes} />
                  </Campo>
                  <Campo rotulo="Lacre">
                    <input value={lacre1} onChange={(e) => setLacre1(e.target.value)} className="lb-input" inputMode="numeric" autoComplete="off" />
                  </Campo>
                  <Campo rotulo="Conferente">
                    <input value={conferente} onChange={(e) => setConferente(e.target.value)} className="lb-input" autoComplete="name" />
                  </Campo>
                </div>
              </Etapa>
            </div>

            <Resumo
              destino={destino}
              endereco={endereco}
              notas={cbs.length}
              paletes={paletes}
              placa={placaCavalo}
              pendencias={pendencias}
              podeFinalizar={podeFinalizar}
              saving={saving}
              erro={erro}
            />
          </form>
        )}
      </main>

      <style>{ESTILOS}</style>
    </div>
  );
}

// Faixa azul do topo, com o logo e o atalho para o histórico.
function Cabecalho() {
  return (
    <header className="lb-topo no-print">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="lb-logo">
            <img src={britaniaLogo} alt="Britânia" />
          </span>
          <div className="min-w-0">
            <h1 className="lb-titulo">Liberação de carga</h1>
            <p className="lb-subtitulo hidden sm:block">Expedição Fábrica Joinville</p>
          </div>
        </div>
        <Link to="/historico" className="lb-btn-topo">
          Histórico
        </Link>
      </div>
    </header>
  );
}

// Uma etapa numerada do formulário. O número fica verde quando a etapa está completa.
function Etapa({
  numero, titulo, concluida, extra, ultima, children,
}: {
  numero: number; titulo: string; concluida: boolean; extra?: React.ReactNode; ultima?: boolean; children: React.ReactNode;
}) {
  return (
    <section className={`lb-etapa ${ultima ? "lb-etapa-ultima" : ""}`} aria-labelledby={`etapa-${numero}`}>
      <div className={`lb-marcador ${concluida ? "lb-marcador-ok" : ""}`} aria-hidden="true">
        {concluida ? "✓" : numero}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id={`etapa-${numero}`} className="lb-etapa-titulo">{titulo}</h2>
          {extra}
        </div>
        {children}
      </div>
    </section>
  );
}

function Campo({ rotulo, obrigatorio, children }: { rotulo: string; obrigatorio?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="lb-rotulo">
        {rotulo}
        {obrigatorio && <span className="lb-obrig"> (obrigatório)</span>}
      </span>
      {children}
    </label>
  );
}

// Campo de paletes com botões − e + (mais rápido que digitar na doca).
function Contador({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const n = Number(valor) || 0;
  return (
    <div className="lb-contador-campo">
      <button type="button" onClick={() => onChange(n > 0 ? String(n - 1) : "")} aria-label="Diminuir paletes">−</button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={valor}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder="0"
      />
      <button type="button" onClick={() => onChange(String(n + 1))} aria-label="Aumentar paletes">+</button>
    </div>
  );
}

// Estação de leitura: aceita SOMENTE o leitor de código de barras.
// Digitação manual é bloqueada (detecção por velocidade: < 50ms entre teclas).
// Quando chega a 44 dígitos, entrega o código e limpa o campo para a próxima nota.
function EstacaoLeitura({
  onLeitura, onIncompleta, cheia,
}: {
  onLeitura: (codigo: string) => void; onIncompleta: () => void; cheia: boolean;
}) {
  const [parcial, setParcial] = useState("");
  const [focado, setFocado] = useState(false);
  const buffer = useRef("");
  const ultimaTecla = useRef(0);
  const campo = useRef<HTMLInputElement>(null);

  // Foca automaticamente ao abrir a tela, pronto para bipar.
  useEffect(() => {
    campo.current?.focus();
  }, []);

  function zerar() {
    buffer.current = "";
    setParcial("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") return;
    e.preventDefault();
    if (cheia) return;

    const agora = performance.now();
    const intervalo = agora - ultimaTecla.current;
    ultimaTecla.current = agora;

    if (e.key === "Escape" || e.key === "Backspace") return zerar();
    if (e.key === "Enter") {
      if (buffer.current.length > 0 && buffer.current.length < 44) onIncompleta();
      return zerar();
    }
    if (!/^[0-9]$/.test(e.key)) return;

    // Demorou demais desde a última tecla → é digitação humana: recomeça.
    if (intervalo > 50 && buffer.current.length > 0) buffer.current = "";

    buffer.current = (buffer.current + e.key).slice(0, 44);
    if (buffer.current.length === 44) {
      const codigo = buffer.current;
      zerar();
      onLeitura(codigo);
    } else {
      setParcial(buffer.current);
    }
  }

  const estado = cheia ? "cheia" : focado ? "pronta" : "pausada";

  return (
    <div className={`lb-estacao lb-estacao-${estado}`} onClick={() => campo.current?.focus()}>
      <div className="flex items-center gap-3">
        <span className="lb-luz" aria-hidden="true" />
        <span className="lb-estacao-status">
          {estado === "pronta" && "Pronto para ler — bipe o código de barras da NF"}
          {estado === "pausada" && "Clique aqui para voltar a ler as notas"}
          {estado === "cheia" && `Limite de ${MAX_NOTAS} notas atingido`}
        </span>
      </div>
      <input
        ref={campo}
        value={parcial}
        onKeyDown={onKeyDown}
        onChange={() => { /* controlado só pelo scanner */ }}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        inputMode="none"
        autoComplete="off"
        spellCheck={false}
        aria-label="Leitura do código de barras da nota fiscal (somente scanner)"
        placeholder="•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••"
        className="lb-estacao-campo"
      />
      <div className="lb-progresso" aria-hidden="true">
        <span style={{ width: `${(parcial.length / 44) * 100}%` }} />
      </div>
    </div>
  );
}

// Painel lateral: resumo da carga, pendências e o botão de finalizar.
function Resumo({
  destino, endereco, notas, paletes, placa, pendencias, podeFinalizar, saving, erro,
}: {
  destino: string; endereco: string; notas: number; paletes: string; placa: string;
  pendencias: { ok: boolean; texto: string }[]; podeFinalizar: boolean; saving: boolean; erro: string | null;
}) {
  return (
    <aside className="lb-resumo" aria-label="Resumo da carga">
      <p className="lb-resumo-rotulo">Destino</p>
      <p className={`lb-resumo-destino ${destino ? "" : "lb-resumo-vazio"}`}>
        {destino ? (destino === "TERCEIRO" ? "Terceiro" : destino) : "A definir"}
      </p>
      {endereco && <p className="lb-resumo-end">{endereco}</p>}

      <dl className="lb-resumo-numeros">
        <div><dt>Notas</dt><dd>{notas}</dd></div>
        <div><dt>Paletes</dt><dd>{paletes || "0"}</dd></div>
        <div><dt>Placa</dt><dd className="lb-resumo-placa">{placa || "—"}</dd></div>
      </dl>

      <ul className="lb-pendencias">
        {pendencias.map((p) => (
          <li key={p.texto} className={p.ok ? "lb-pend-ok" : ""}>
            <span aria-hidden="true">{p.ok ? "✓" : "○"}</span>
            {p.texto}
            <span className="sr-only">{p.ok ? " (preenchido)" : " (pendente)"}</span>
          </li>
        ))}
      </ul>

      {erro && <p className="lb-resumo-erro" role="alert">{erro}</p>}

      <button type="submit" disabled={!podeFinalizar || saving} className="lb-finalizar">
        {saving ? "Salvando…" : "Finalizar liberação"}
      </button>
      <p className="lb-resumo-nota">Data, hora e ID da carga são gerados ao finalizar.</p>
    </aside>
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

// Estilos da tela de liberação. Cores da Britânia: azul-marinho + âmbar da estrela.
const ESTILOS = `
.lb {
  --azul: #0D3B6B; --azul-escuro: #082A4D; --azul-claro: #E7EEF6;
  --ambar: #F2A900; --papel: #F4F6F9; --tinta: #14202E; --cinza: #5B6B7D;
  --linha: #D9E1EA; --verde: #1E8A5A; --vermelho: #C23B22;
  background: var(--papel); color: var(--tinta);
  font-family: "Barlow", "Segoe UI", system-ui, sans-serif; font-size: 15px;
}
.lb button, .lb input { font-family: inherit; }
.lb :focus-visible { outline: 3px solid var(--ambar); outline-offset: 2px; }

.lb-topo { background: var(--azul-escuro); color: #fff; border-bottom: 4px solid var(--ambar); }
.lb-logo { background: #fff; border-radius: 8px; padding: 6px 10px; display: inline-flex; flex-shrink: 0; }
.lb-logo img { height: 20px; display: block; }
@media (min-width: 640px) { .lb-logo img { height: 26px; } }
.lb-titulo { font-family: "Barlow Condensed", "Barlow", sans-serif; font-weight: 700; font-size: 21px; line-height: 1; letter-spacing: .2px; }
@media (min-width: 640px) { .lb-titulo { font-size: 28px; } }
.lb-subtitulo { font-size: 14px; color: #B9C9DB; margin-top: 3px; }
.lb-btn-topo { flex-shrink: 0; border: 1.5px solid rgba(255,255,255,.35); border-radius: 8px; padding: 7px 12px; font-weight: 600; font-size: 14px; color: #fff; transition: background .15s; }
.lb-btn-topo:hover { background: rgba(255,255,255,.12); }

.lb-folha { background: #fff; border: 1px solid var(--linha); border-radius: 14px; padding: 8px 20px; }
@media (min-width: 640px) { .lb-folha { padding: 12px 28px; } }

.lb-etapa { display: flex; gap: 10px; padding: 22px 0; border-bottom: 1px solid var(--linha); }
.lb-etapa-ultima { border-bottom: 0; }
@media (min-width: 640px) { .lb-etapa { gap: 16px; } }
.lb-marcador { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
  font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 17px;
  background: var(--azul-claro); color: var(--azul); transition: background .2s, color .2s; }
.lb-marcador-ok { background: var(--verde); color: #fff; }
.lb-etapa-titulo { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 22px; line-height: 32px; color: var(--azul-escuro); }
.lb-contador { font-variant-numeric: tabular-nums; font-size: 14px; color: var(--cinza); font-weight: 600; }

.lb-rotulo { display: block; font-size: 13px; font-weight: 600; color: var(--cinza); margin-bottom: 6px; }
.lb-obrig { font-weight: 400; }
.lb-todos-obrig { padding-top: 16px; font-size: 13px; color: var(--cinza); }
.lb-input { width: 100%; height: 44px; border: 1.5px solid var(--linha); border-radius: 8px; background: #fff; padding: 0 12px; font-size: 15px; color: var(--tinta); transition: border-color .15s; }
.lb-input:hover { border-color: #B8C5D3; }
.lb-input:focus { border-color: var(--azul); outline: none; box-shadow: 0 0 0 3px rgba(13,59,107,.14); }
.lb-endereco-fixo { background: var(--papel); border-radius: 8px; padding: 10px 12px; font-size: 15px; color: var(--tinta); line-height: 1.35; }
.lb-placa { font-family: "Barlow Condensed", sans-serif; font-weight: 600; font-size: 19px; letter-spacing: 1.5px; text-transform: uppercase; }

.lb-destino { height: 52px; border: 1.5px solid var(--linha); border-radius: 8px; background: #fff;
  font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 18px; letter-spacing: .4px; color: var(--azul-escuro);
  transition: border-color .12s, background .12s, color .12s; padding: 0 6px; }
.lb-destino:hover { border-color: var(--azul); }
.lb-destino[aria-pressed="true"] { background: var(--azul); border-color: var(--azul); color: #fff; box-shadow: inset 0 -4px 0 var(--ambar); }

.lb-estacao { background: var(--azul-escuro); border-radius: 12px; padding: 16px 18px 14px; cursor: text; color: #fff; }
.lb-luz { width: 12px; height: 12px; border-radius: 50%; background: #5B6B7D; flex-shrink: 0; }
.lb-estacao-pronta .lb-luz { background: var(--ambar); box-shadow: 0 0 0 4px rgba(242,169,0,.22); animation: lb-pulso 1.6s ease-in-out infinite; }
.lb-estacao-cheia .lb-luz { background: var(--vermelho); }
.lb-estacao-status { font-size: 14px; font-weight: 500; color: #C9D6E5; }
.lb-estacao-pronta .lb-estacao-status { color: #fff; }
.lb-estacao-campo { width: 100%; margin-top: 12px; background: transparent; border: 0; outline: none !important; caret-color: var(--ambar);
  font-family: "Barlow Condensed", sans-serif; font-size: 22px; font-weight: 600; letter-spacing: 1px; color: #fff; font-variant-numeric: tabular-nums; }
.lb-estacao-campo::placeholder { color: rgba(255,255,255,.22); letter-spacing: 2px; }
.lb-progresso { height: 3px; background: rgba(255,255,255,.12); border-radius: 2px; margin-top: 8px; overflow: hidden; }
.lb-progresso span { display: block; height: 100%; background: var(--ambar); }
@keyframes lb-pulso { 50% { box-shadow: 0 0 0 7px rgba(242,169,0,.08); } }

.lb-aviso { min-height: 22px; margin-top: 8px; font-size: 14px; font-weight: 600; }
.lb-aviso-ok { color: var(--verde); }
.lb-aviso-erro { color: var(--vermelho); }

.lb-lista { margin-top: 6px; border: 1px solid var(--linha); border-radius: 10px; overflow: hidden; }
.lb-nota { display: grid; grid-template-columns: 28px minmax(0,1fr) auto auto; align-items: center; gap: 4px 14px; padding: 9px 14px; border-top: 1px solid var(--linha); }
.lb-nota:first-child { border-top: 0; }
.lb-nota-ordem { font-variant-numeric: tabular-nums; font-size: 13px; color: var(--cinza); }
.lb-nota-nf { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 22px; color: var(--azul-escuro); font-variant-numeric: tabular-nums; }
.lb-nota-serie { font-size: 14px; color: var(--cinza); }
.lb-nota-chave { display: none; font-size: 12px; color: #8A98A8; font-variant-numeric: tabular-nums; }
.lb-remover { font-size: 13px; font-weight: 600; color: var(--vermelho); padding: 6px 8px; border-radius: 6px; }
.lb-remover:hover { background: #FBEAE6; }
@media (min-width: 640px) {
  .lb-nota { grid-template-columns: 28px minmax(0,1fr) 90px 130px auto; }
  .lb-nota-chave { display: block; }
}
.lb-nota-nova { animation: lb-chegou 1.4s ease-out; }
@keyframes lb-chegou { from { background: #FFF3CF; } to { background: transparent; } }

.lb-contador-campo { display: flex; height: 44px; border: 1.5px solid var(--linha); border-radius: 8px; overflow: hidden; background: #fff; }
.lb-contador-campo:focus-within { border-color: var(--azul); box-shadow: 0 0 0 3px rgba(13,59,107,.14); }
.lb-contador-campo button { width: 44px; font-size: 22px; font-weight: 600; color: var(--azul); background: var(--papel); }
.lb-contador-campo button:hover { background: var(--azul-claro); }
.lb-contador-campo input { flex: 1; min-width: 0; text-align: center; border: 0; outline: none; font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 20px; -moz-appearance: textfield; }
.lb-contador-campo input::-webkit-outer-spin-button, .lb-contador-campo input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

.lb-resumo { background: var(--azul); color: #fff; border-radius: 14px; padding: 22px; }
@media (min-width: 1024px) { .lb-resumo { position: sticky; top: 24px; } }
.lb-resumo-rotulo { font-size: 13px; color: #B9C9DB; font-weight: 500; }
.lb-resumo-destino { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 46px; line-height: 1; margin-top: 2px; }
.lb-resumo-vazio { color: rgba(255,255,255,.35); font-size: 34px; }
.lb-resumo-end { font-size: 13px; color: #D3DEEA; margin-top: 6px; line-height: 1.35; }
.lb-resumo-numeros { display: grid; grid-template-columns: 1fr 1fr 1.4fr; margin-top: 18px; border-top: 1px solid rgba(255,255,255,.16); border-bottom: 1px solid rgba(255,255,255,.16); }
.lb-resumo-numeros > div { padding: 12px 0; }
.lb-resumo-numeros > div + div { padding-left: 12px; border-left: 1px solid rgba(255,255,255,.16); }
.lb-resumo-numeros dt { font-size: 12px; color: #B9C9DB; }
.lb-resumo-numeros dd { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 28px; line-height: 1.1; font-variant-numeric: tabular-nums; }
.lb-resumo-placa { font-size: 20px !important; letter-spacing: 1px; white-space: nowrap; }
.lb-pendencias { margin-top: 16px; display: grid; gap: 7px; font-size: 14px; color: #D3DEEA; }
.lb-pendencias li { display: flex; gap: 9px; align-items: center; }
.lb-pendencias li span:first-child { width: 16px; text-align: center; color: rgba(255,255,255,.5); }
.lb-pend-ok { color: #fff !important; }
.lb-pend-ok span:first-child { color: #6FD3A2 !important; font-weight: 700; }
.lb-resumo-erro { margin-top: 14px; background: rgba(194,59,34,.18); border: 1px solid rgba(255,140,120,.45); border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.lb-finalizar { margin-top: 18px; width: 100%; height: 54px; border-radius: 10px; background: var(--ambar); color: var(--azul-escuro);
  font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 22px; letter-spacing: .3px; transition: filter .15s, opacity .15s; }
.lb-finalizar:hover:not(:disabled) { filter: brightness(1.06); }
.lb-finalizar:disabled { background: rgba(255,255,255,.1); color: rgba(255,255,255,.45); cursor: not-allowed; }
.lb-resumo-nota { margin-top: 10px; font-size: 12px; color: #9FB3C8; text-align: center; }

@media (prefers-reduced-motion: reduce) {
  .lb *, .lb *::before, .lb *::after { animation: none !important; transition: none !important; }
}
`;

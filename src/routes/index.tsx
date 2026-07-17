import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import britaniaLogo from "@/assets/britania-logo.jpg";

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

type Registro = {
  idCarga: string;
  data: string;
  hora: string;
  destino: string;
  endereco: string;
  cb1: string; cb2: string; cb3: string;
  nf1: string; serie1: string;
  nf2: string; serie2: string;
  nf3: string; serie3: string;
  placaCavalo: string; placaBau: string;
  motorista: string; transportadora: string;
  conferente: string;
  lacre1: string; lacre2: string; lacre3: string;
  paletes: string;
  email: string;
  observacoes: string;
};

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
  const [maisLacres, setMaisLacres] = useState(false);
  const [lacre2, setLacre2] = useState("");
  const [lacre3, setLacre3] = useState("");
  const [conferente, setConferente] = useState("");
  const [email, setEmail] = useState("");
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
    setLacre1(""); setMaisLacres(false); setLacre2(""); setLacre3("");
    setConferente(""); setEmail(""); setObservacoes("");
    setErro(null); setRegistro(null);
  }

  async function finalizar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!destino || !endereco || !cb1 || !conferente || !email) {
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
      lacre_2: maisLacres ? lacre2 || null : null,
      lacre_3: maisLacres ? lacre3 || null : null,
      paletes: paletes ? Number(paletes) : null,
      email,
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
      cb1, cb2, cb3,
      nf1: nf1.nf, serie1: nf1.serie,
      nf2: cb2 ? nf2.nf : "", serie2: cb2 ? nf2.serie : "",
      nf3: cb3 ? nf3.nf : "", serie3: cb3 ? nf3.serie : "",
      placaCavalo, placaBau, motorista, transportadora,
      conferente,
      lacre1, lacre2: maisLacres ? lacre2 : "", lacre3: maisLacres ? lacre3 : "",
      paletes, email, observacoes,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function abrirEmail() {
    if (!registro) return;
    const subject = encodeURIComponent(`Liberação de Carga ${registro.idCarga} - ${registro.destino}`);
    const body = encodeURIComponent(
      `Olá,\n\nSua liberação de carga foi gerada com sucesso.\n\n` +
      `ID da Carga: ${registro.idCarga}\nData: ${registro.data}  Hora: ${registro.hora}\n` +
      `Destino: ${registro.destino}\nEndereço: ${registro.endereco}\n` +
      `Motorista: ${registro.motorista}\nPlaca Cavalo: ${registro.placaCavalo}  Placa Baú: ${registro.placaBau}\n` +
      `Conferente: ${registro.conferente}\n\n` +
      `Orientações importantes:\n- Verifique os dados antes da operação.\n- Confirme destino, placas, lacres e notas fiscais.\n- Mantenha este comprovante salvo para consulta.\n\n` +
      `Atenciosamente,\nExpedição Fábrica Joinville\nBritânia Eletrodomésticos`
    );
    window.location.href = `mailto:${registro.email}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Cabeçalho */}
      <header className="no-print bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <p className="text-xs uppercase tracking-widest opacity-80">Britânia Eletrodomésticos</p>
          <h1 className="text-2xl font-bold">Liberação de Carga — Expedição Fábrica Joinville</h1>
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
            O documento foi gerado e pode ser impresso ou enviado para <strong>{registro.email}</strong>.
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
              onClick={abrirEmail}
              className="rounded-md border border-primary bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:bg-accent"
            >
              Enviar por E-mail
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
              <Field label="Lacre 1"><input value={lacre1} onChange={(e) => setLacre1(e.target.value)} className="input" /></Field>
              <Field label="Possui mais de um lacre?" full>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={maisLacres} onChange={(e) => setMaisLacres(e.target.checked)} />
                  Sim, adicionar Lacre 2 e Lacre 3
                </label>
              </Field>
              {maisLacres && (
                <>
                  <Field label="Lacre 2"><input value={lacre2} onChange={(e) => setLacre2(e.target.value)} className="input" /></Field>
                  <Field label="Lacre 3"><input value={lacre3} onChange={(e) => setLacre3(e.target.value)} className="input" /></Field>
                </>
              )}
            </Section>

            <Section titulo="5. Conferência">
              <Field label="Conferente *"><input value={conferente} onChange={(e) => setConferente(e.target.value)} className="input" required /></Field>
              <Field label="E-mail para envio *"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required /></Field>
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

function ComprovanteLogistico({ registro }: { registro: Registro }) {
  const notas = [
    { nf: registro.nf1, serie: registro.serie1 },
    { nf: registro.nf2, serie: registro.serie2 },
    { nf: registro.nf3, serie: registro.serie3 },
  ].filter((n) => n.nf);
  const lacres = [registro.lacre1, registro.lacre2, registro.lacre3].filter(Boolean);

  return (
    <div id="print-area" className="bg-white text-black">
      <table className="britania-doc w-full border-collapse text-[12px]">
        <tbody>
          {/* Cabeçalho */}
          <tr>
            <td className="w-[22%] align-middle" rowSpan={1}>
              <img src={britaniaLogo} alt="Britânia" className="mx-auto h-10 object-contain" />
            </td>
            <td colSpan={4} className="text-center align-middle">
              <strong>Comprovante Movimentação Logística</strong>
            </td>
            <td colSpan={2}>
              <div><strong>N.:</strong></div>
              <div>LG-SC.FO.030</div>
            </td>
            <td>
              <div><strong>Rev:</strong></div>
              <div>4</div>
            </td>
            <td>
              <div><strong>Data:</strong></div>
              <div>{registro.data}</div>
            </td>
          </tr>

          {/* Destino / Paletes / NF-Série */}
          <tr>
            <td colSpan={3} className="align-top">
              <div><strong>Destino:</strong> {registro.destino}</div>
              <div className="mt-2"><strong>Endereço:</strong> {registro.endereco}</div>
            </td>
            <td className="text-center align-top">
              <div><strong>Nº de Paletes</strong></div>
              <div className="mt-2">{registro.paletes || "—"}</div>
            </td>
            <td colSpan={5} className="align-top p-0">
              <div className="border-b border-black px-2 py-1"><strong>NOTA FISCAL – SÉRIE</strong></div>
              <table className="w-full border-collapse">
                <tbody>
                  {[0, 1, 2].map((i) => {
                    const n = notas[i];
                    return (
                      <tr key={i}>
                        <td className="w-1/2 border-t border-black px-2 py-1">{n?.nf || "\u00A0"}</td>
                        <td className="w-1/2 border-t border-l border-black px-2 py-1">{n?.serie || "\u00A0"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </td>
          </tr>

          {/* Motorista + Transportadora + Lacre */}
          <tr>
            <td colSpan={6} className="align-top">
              <div><strong>MOTORISTA:</strong> <u>{registro.motorista || " "}</u></div>
              <div className="mt-2"><strong>TRANSPORTADORA:</strong> {registro.transportadora || " "}</div>
            </td>
            <td colSpan={3} className="align-top">
              <div><strong>LACRE:</strong></div>
              <div className="mt-1 whitespace-pre-line">
                {lacres.length ? lacres.join("\n") : " "}
              </div>
            </td>
          </tr>

          {/* Conferente */}
          <tr>
            <td colSpan={9}>
              <strong>CONFERENTE:</strong> {registro.conferente}
            </td>
          </tr>

          {/* Placas */}
          <tr>
            <td colSpan={9}>
              <div><strong>PLACA CAVALO:</strong> {registro.placaCavalo || " "}</div>
              <div className="mt-2"><strong>PLACA BAÚ:</strong> {registro.placaBau || " "}</div>
            </td>
          </tr>

          {/* Cabeçalhos assinaturas 1 */}
          <tr className="text-center font-bold">
            <td colSpan={2}>CARIMBO CONFERENTE</td>
            <td colSpan={4}>ASSINATURA MOTORISTA</td>
            <td colSpan={3}>DATAs</td>
          </tr>
          <tr>
            <td colSpan={2} className="h-24 align-bottom text-center text-[11px]">
              <div className="mx-4 mb-1 border-b border-black"></div>
              ASSINAR ESSE CAMPO AO LIBERAR A CARGA
            </td>
            <td colSpan={4} className="h-24 align-bottom text-center text-[11px]">
              <div className="mx-4 mb-1 border-b border-black"></div>
              ASSINAR ESSE CAMPO APÓS CONFERIR DESTINO
            </td>
            <td colSpan={3} className="align-top text-[11px]">
              <div>&nbsp;</div>
              <div>&nbsp;</div>
            </td>
          </tr>

          {/* Cabeçalhos assinaturas 2 */}
          <tr className="text-center font-bold">
            <td colSpan={2}>CARIMBO PORTARIA</td>
            <td colSpan={4}>ASSINATURA RECEBIMENTO</td>
            <td colSpan={3}>CARIMBO CONTROLADORIA FÁBRICA</td>
          </tr>
          <tr>
            <td colSpan={2} className="h-24 align-bottom text-center text-[11px]">
              <div className="mx-4 mb-1 border-b border-black"></div>
              ASSINAR ESSE CAMPO NA SAÍDA E ENTRADA DA PORTARIA
            </td>
            <td colSpan={4} className="h-24 align-bottom text-center text-[11px]">
              <div className="mx-4 mb-1 border-b border-black"></div>
              ASSINAR ESSE CAMPO NO RECEBIMENTO DA CARGA
            </td>
            <td colSpan={3} className="h-24 align-bottom text-center text-[11px]">
              <div className="mx-4 mb-1 border-b border-black"></div>
              ASSINAR ESSE CAMPO NA DEVOLUÇÃO DO CANHOTO
            </td>
          </tr>

          {/* Orientações */}
          <tr>
            <td colSpan={9} className="bg-black text-center font-bold text-white">
              ORIENTAÇÕES GERAIS
            </td>
          </tr>
          <tr>
            <td colSpan={9} className="text-[11px] leading-relaxed">
              <div>* Motorista Verificar a Placa e o Destino da Carga antes de assinar no campo solicitado.</div>
              <div>* Portaria Verificar se as NFs deste formulário estão grampeadas neste documento. (Não é descartado a conferência padrão dos lacres)</div>
              <div>* Recebimento Confirmar o recebimento da Carga e das NFs contidas nesse documento.</div>
              <div>* Controladoria Fábrica carimbar e assinar após o recebimento dos canhotos assinados confirmando entrega da Carga.</div>
            </td>
          </tr>
          <tr>
            <td colSpan={9} className="text-[11px] leading-relaxed">
              * Liberação de carga mediante veículos contratados pelo cliente denominado como DESTINO - é dever do conferente solicitar assinatura do motorista nos canhotos e entregar na controladoria da fábrica
            </td>
          </tr>

          {/* Rodapé de identificação (ID/Hora) */}
          <tr>
            <td colSpan={9} className="text-[10px] text-gray-600">
              ID: {registro.idCarga} · Emitido em {registro.data} às {registro.hora}
              {registro.observacoes ? ` · Obs.: ${registro.observacoes}` : ""}
            </td>
          </tr>
        </tbody>
      </table>

      <style>{`
        .britania-doc, .britania-doc td { border: 1px solid #000; }
        .britania-doc td { padding: 6px 8px; vertical-align: top; }
      `}</style>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

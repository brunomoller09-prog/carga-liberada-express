import britaniaLogo from "@/assets/britania-logo.jpg";

export type ComprovanteData = {
  idCarga: string;
  data: string;
  hora: string;
  destino: string;
  endereco: string;
  nf1: string; serie1: string;
  nf2: string; serie2: string;
  nf3: string; serie3: string;
  // Notas a partir da 4ª (opcional, para manter compatibilidade).
  notasExtras?: { nf: string; serie: string }[];
  placaCavalo: string; placaBau: string;
  motorista: string; transportadora: string;
  conferente: string;
  lacre1: string;
  paletes: string;
  observacoes: string;
};

export function ComprovanteLogistico({ registro }: { registro: ComprovanteData }) {
  const notas = [
    { nf: registro.nf1, serie: registro.serie1 },
    { nf: registro.nf2, serie: registro.serie2 },
    { nf: registro.nf3, serie: registro.serie3 },
    ...(registro.notasExtras ?? []),
  ].filter((n) => n.nf);
  // Layout das notas: 1 coluna (até 3), 2 colunas (4–14), 3 colunas (15+).
  // Lê de cima para baixo em cada coluna e a fonte diminui com a quantidade.
  const colunasNotas = notas.length > 14 ? 3 : notas.length > 3 ? 2 : 1;
  const linhasPorColuna = Math.max(1, Math.ceil(notas.length / colunasNotas));
  const fonteNotas = notas.length > 14 ? 10 : notas.length > 8 ? 11 : 12.5;

  // Os 6 campos de assinatura/carimbo do formulário LG-SC.FO.030.
  const assinaturas = [
    { titulo: "Carimbo Conferente", legenda: "Assinar esse campo ao liberar a carga" },
    { titulo: "Assinatura Motorista", legenda: "Assinar esse campo após conferir destino" },
    { titulo: "Datas", legenda: "" },
    { titulo: "Carimbo Portaria", legenda: "Assinar esse campo na saída e entrada da portaria" },
    { titulo: "Assinatura Recebimento", legenda: "Assinar esse campo no recebimento da carga" },
    { titulo: "Carimbo Controladoria Fábrica", legenda: "Assinar esse campo na devolução do canhoto" },
  ];

  return (
    <div id="print-area" className="bg-white text-black">
      <div className="comp-a">
        {/* Cabeçalho azul: logo, título, nº do formulário e ID da carga */}
        <div className="comp-card">
          <div className="comp-head">
            <div className="comp-head-left">
              <div className="comp-logo">
                <img src={britaniaLogo} alt="Britânia" />
              </div>
              <div>
                <div className="comp-titulo">Comprovante de Movimentação Logística</div>
                <div className="comp-sub">LG-SC.FO.030 · Rev. 4 · 20/02/2026</div>
              </div>
            </div>
            <div className="comp-head-right">
              <div className="comp-mini">ID DA CARGA</div>
              <div className="comp-id">{registro.idCarga}</div>
              <div className="comp-sub">{registro.data} · {registro.hora}</div>
            </div>
          </div>

          {/* Destino, paletes e lacre */}
          <div className="comp-info">
            <div className="comp-box">
              <div className="comp-label">DESTINO</div>
              <div className="comp-destino">{registro.destino}</div>
              <div className="comp-end">{registro.endereco}</div>
            </div>
            <div className="comp-box">
              <div className="comp-label">PALETES</div>
              <div className="comp-valor-g">{registro.paletes || "—"}</div>
            </div>
            <div className="comp-box">
              <div className="comp-label">LACRE</div>
              <div className="comp-valor-m">{registro.lacre1 || "—"}</div>
            </div>
          </div>

          {/* Notas fiscais (sem tabela) */}
          <div className="comp-notas">
            <div className="comp-label" style={{ marginBottom: 6 }}>
              NOTAS FISCAIS – SÉRIE ({notas.length})
            </div>
            <div
              style={{
                display: "grid",
                gridAutoFlow: "column",
                gridTemplateColumns: `repeat(${colunasNotas}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${linhasPorColuna}, auto)`,
                gap: "3px 18px",
                fontSize: fonteNotas,
              }}
            >
              {notas.map((n, i) => (
                <div key={i} style={{ whiteSpace: "nowrap" }}>
                  <b>{n.nf}</b>
                  <span style={{ color: "#777" }}> · Série {n.serie || "—"}</span>
                </div>
              ))}
              {notas.length === 0 && <div style={{ color: "#777" }}>—</div>}
            </div>
          </div>

          {/* Motorista, transportadora, placas, conferente */}
          <div className="comp-rodape">
            <div><div className="comp-label">MOTORISTA</div><b>{registro.motorista || "—"}</b></div>
            <div><div className="comp-label">TRANSPORTADORA</div><b>{registro.transportadora || "—"}</b></div>
            <div>
              <div className="comp-label">PLACA CAVALO / BAÚ</div>
              <b>{registro.placaCavalo || "—"} / {registro.placaBau || "—"}</b>
            </div>
            <div><div className="comp-label">CONFERENTE</div><b>{registro.conferente || "—"}</b></div>
          </div>
        </div>

        {/* Assinaturas e carimbos (6 campos, como no formulário original) */}
        <div className="comp-assin">
          {assinaturas.map((a) => (
            <div key={a.titulo} className="comp-ass-box">
              <div className="comp-ass-titulo">{a.titulo}</div>
              {a.titulo === "Datas" ? (
                <div className="comp-datas">
                  <div><b>Data:</b> {registro.data}</div>
                  <div><b>Hora:</b> {registro.hora}</div>
                </div>
              ) : (
                <>
                  <div className="comp-linha" />
                  <div className="comp-cap">{a.legenda}</div>
                </>
              )}
            </div>
          ))}
        </div>

        {registro.observacoes && (
          <div className="comp-obs"><b>Observações:</b> {registro.observacoes}</div>
        )}

        <div className="comp-orient">
          <b>ORIENTAÇÕES GERAIS</b>
          <div>• Motorista: verificar a placa e o destino da carga antes de assinar no campo solicitado.</div>
          <div>• Portaria: verificar se as NFs deste formulário estão grampeadas neste documento. (Não é descartada a conferência padrão dos lacres.)</div>
          <div>• Recebimento: confirmar o recebimento da carga e das NFs contidas neste documento.</div>
          <div>• Controladoria Fábrica: carimbar e assinar após o recebimento dos canhotos assinados, confirmando a entrega da carga.</div>
          <div>• Liberação de carga mediante veículos contratados pelo cliente denominado como DESTINO: é dever do conferente solicitar a assinatura do motorista nos canhotos e entregar na controladoria da fábrica.</div>
        </div>
      </div>

      <style>{`
        .comp-a { font-family: Inter, "Segoe UI", Arial, sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .comp-card { border: 1px solid #cfd6e0; border-radius: 14px; overflow: hidden; }
        .comp-head { background: #0d3b6b; color: #fff; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .comp-head-left { display: flex; align-items: center; gap: 12px; }
        .comp-logo { background: #fff; border-radius: 8px; padding: 5px 9px; }
        .comp-logo img { height: 30px; display: block; }
        .comp-titulo { font-size: 15px; font-weight: 700; line-height: 1.2; }
        .comp-sub { font-size: 10px; opacity: .85; }
        .comp-head-right { text-align: right; white-space: nowrap; }
        .comp-mini { font-size: 8.5px; letter-spacing: 2px; opacity: .75; }
        .comp-id { font-family: ui-monospace, Consolas, monospace; font-size: 15px; font-weight: 700; }
        .comp-info { display: grid; grid-template-columns: 1.3fr 0.7fr 0.7fr; gap: 10px; padding: 14px 18px 10px; }
        .comp-box { background: #f3f6fa; border-radius: 10px; padding: 10px 12px; }
        .comp-label { font-size: 8.5px; letter-spacing: 1.4px; color: #5a6b80; }
        .comp-destino { font-size: 24px; font-weight: 800; color: #0d3b6b; line-height: 1.1; }
        .comp-end { font-size: 10.5px; color: #333; margin-top: 2px; }
        .comp-valor-g { font-size: 22px; font-weight: 800; }
        .comp-valor-m { font-size: 17px; font-weight: 800; }
        .comp-notas { padding: 4px 18px 12px; }
        .comp-rodape { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 10px 18px; border-top: 1px solid #e3e8ef; font-size: 11px; }
        .comp-assin { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
        .comp-ass-box { border: 1px solid #cfd6e0; border-radius: 10px; padding: 7px 8px 8px; min-height: 170px; display: flex; flex-direction: column; break-inside: avoid; }
        .comp-ass-titulo { font-size: 9.5px; font-weight: 700; text-align: center; color: #0d3b6b; text-transform: uppercase; }
        .comp-linha { flex: 1; border-bottom: 1.5px solid #222; margin: 0 6px; min-height: 110px; }
        .comp-cap { font-size: 8px; text-align: center; margin-top: 4px; color: #444; text-transform: uppercase; line-height: 1.25; }
        .comp-datas { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 6px; padding: 0 8px; font-size: 13px; }
        .comp-obs { margin-top: 10px; font-size: 10.5px; }
        .comp-orient { margin-top: 10px; font-size: 9px; line-height: 1.45; color: #333; }
      `}</style>
    </div>
  );
}

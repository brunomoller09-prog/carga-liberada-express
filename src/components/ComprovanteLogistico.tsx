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
  ].filter((n) => n.nf);
  const lacres = [registro.lacre1].filter(Boolean);

  return (
    <div id="print-area" className="bg-white text-black">
      <table className="britania-doc w-full border-collapse text-[12px]">
        <colgroup>
          <col style={{ width: "14%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <tbody>
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
              <div>26/01/2023</div>
            </td>
          </tr>

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

          <tr>
            <td colSpan={6}>
              <strong>CONFERENTE:</strong> {registro.conferente}
            </td>
            <td
              colSpan={3}
              rowSpan={2}
              className="align-middle text-center text-white"
              style={{ background: "#000" }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
                ID da Carga
              </div>
              <div className="mt-1 font-mono text-[14px] font-bold">
                {registro.idCarga}
              </div>
            </td>
          </tr>

          <tr>
            <td colSpan={6}>
              <div><strong>PLACA CAVALO:</strong> {registro.placaCavalo || " "}</div>
              <div className="mt-2"><strong>PLACA BAÚ:</strong> {registro.placaBau || " "}</div>
            </td>
          </tr>

          <tr className="text-center font-bold">
            <td colSpan={2}>CARIMBO CONFERENTE</td>
            <td colSpan={4}>ASSINATURA MOTORISTA</td>
            <td colSpan={3}>DATAs</td>
          </tr>
          <tr>
            <td colSpan={2} className="h-44 align-top text-center text-[11px]">
              <div className="mx-4 mt-20 border-b border-black"></div>
              <div className="mt-2">ASSINAR ESSE CAMPO AO LIBERAR A CARGA</div>
            </td>
            <td colSpan={4} className="h-44 align-top text-center text-[11px]">
              <div className="mx-4 mt-20 border-b border-black"></div>
              <div className="mt-2">ASSINAR ESSE CAMPO APÓS CONFERIR DESTINO</div>
            </td>
            <td colSpan={3} className="align-top text-[13px]">
              <div className="px-2 py-1"><strong>Data:</strong> {registro.data}</div>
              <div className="px-2 py-1"><strong>Hora:</strong> {registro.hora}</div>
            </td>
          </tr>

          <tr className="text-center font-bold">
            <td colSpan={2}>CARIMBO PORTARIA</td>
            <td colSpan={4}>ASSINATURA RECEBIMENTO</td>
            <td colSpan={3}>CARIMBO CONTROLADORIA FÁBRICA</td>
          </tr>
          <tr>
            <td colSpan={2} className="h-44 align-top text-center text-[11px]">
              <div className="mx-4 mt-20 border-b border-black"></div>
              <div className="mt-2">ASSINAR ESSE CAMPO NA SAÍDA E ENTRADA DA PORTARIA</div>
            </td>
            <td colSpan={4} className="h-44 align-top text-center text-[11px]">
              <div className="mx-4 mt-20 border-b border-black"></div>
              <div className="mt-2">ASSINAR ESSE CAMPO NO RECEBIMENTO DA CARGA</div>
            </td>
            <td colSpan={3} className="h-44 align-top text-center text-[11px]">
              <div className="mx-4 mt-20 border-b border-black"></div>
              <div className="mt-2">ASSINAR ESSE CAMPO NA DEVOLUÇÃO DO CANHOTO</div>
            </td>
          </tr>

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

          {registro.observacoes && (
            <tr>
              <td colSpan={9} className="text-[11px]">
                <strong>Observações:</strong> {registro.observacoes}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <style>{`
        .britania-doc, .britania-doc td { border: 1px solid #000; }
        .britania-doc td { padding: 6px 8px; vertical-align: top; }
        .britania-doc table td { border: 1px solid #000; }
      `}</style>
    </div>
  );
}
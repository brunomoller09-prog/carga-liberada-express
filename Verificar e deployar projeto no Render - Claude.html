import { createServerFn } from "@tanstack/react-start";

// Envia os dados de UMA liberação de carga já salva no Supabase
// também para o SharePoint, via um webhook do Power Automate.
//
// IMPORTANTE (arquitetura "backup"): esta função nunca deve travar
// o cadastro da liberação nem mostrar erro para quem está usando o
// formulário. O Supabase é a fonte de verdade; o SharePoint é só um
// espelho. Por isso todo erro aqui é só registrado no log do
// servidor (visível nos logs do Render) — nunca é repassado como
// falha para a pessoa no formulário.
export const syncReleaseToSharePoint = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, string | number | null>) => data)
  .handler(async ({ data }) => {
    const webhookUrl = process.env.POWER_AUTOMATE_WEBHOOK_URL;

    // Se a variável de ambiente não estiver configurada no Render,
    // simplesmente não faz nada — não é um erro fatal, é só o
    // espelho do SharePoint estar temporariamente desligado.
    if (!webhookUrl) {
      console.warn("[SharePoint sync] POWER_AUTOMATE_WEBHOOK_URL não configurada — pulando sincronização.");
      return { synced: false as const, reason: "not_configured" as const };
    }

    try {
      // Só os campos que existem no esquema JSON que configuramos no
      // Power Automate (ver o exemplo colado em "Solicitar Esquema
      // JSON do Corpo"). Se um dia adicionar campo novo no
      // formulário, precisa adicionar aqui também E no esquema do
      // Power Automate.
      const payload = {
        id_carga: data.id_carga ?? "",
        data: data.data ?? "",
        hora: data.hora ?? "",
        destino: data.destino ?? "",
        endereco: data.endereco ?? "",
        codigo_barras_1: data.codigo_barras_1 ?? "",
        codigo_barras_2: data.codigo_barras_2 ?? "",
        codigo_barras_3: data.codigo_barras_3 ?? "",
        nf_1: data.nf_1 ?? "",
        serie_1: data.serie_1 ?? "",
        nf_2: data.nf_2 ?? "",
        serie_2: data.serie_2 ?? "",
        nf_3: data.nf_3 ?? "",
        serie_3: data.serie_3 ?? "",
        placa_cavalo: data.placa_cavalo ?? "",
        placa_bau: data.placa_bau ?? "",
        motorista: data.motorista ?? "",
        transportadora: data.transportadora ?? "",
        conferente: data.conferente ?? "",
        lacre_1: data.lacre_1 ?? "",
        lacre_2: data.lacre_2 ?? "",
        lacre_3: data.lacre_3 ?? "",
        paletes: data.paletes ?? "",
        observacoes: data.observacoes ?? "",
      };

      // AbortController garante que, se o Power Automate demorar
      // demais para responder, a gente desiste depois de 8 segundos
      // em vez de deixar o site "pendurado" esperando o backup.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`[SharePoint sync] Falhou (status ${response.status}) para id_carga=${data.id_carga}`);
        return { synced: false as const, reason: "http_error" as const, status: response.status };
      }

      return { synced: true as const };
    } catch (error) {
      // Cobre erro de rede, timeout, DNS, etc. Nunca deixa subir
      // como exceção — é sempre "melhor esforço".
      console.error(`[SharePoint sync] Erro ao sincronizar id_carga=${data.id_carga}:`, error);
      return { synced: false as const, reason: "network_error" as const };
    }
  });

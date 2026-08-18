import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// Este arquivo é o "ponto de entrada" do servidor Node quando o
// Nitro builda com NITRO_PRESET=node-server (a configuração que
// fizemos no Render). É o arquivo que o Start Command
// "node .output/server/index.mjs" acaba executando por trás dos
// panos — todo o TanStack Start passa por aqui.
type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

// Carrega o "motor" de verdade do TanStack Start só uma vez (é caro
// carregar, então guardamos em cache na variável abaixo em vez de
// recarregar a cada requisição).
let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 (biblioteca interna usada pelo Nitro) tem um comportamento
// chato: quando um erro não tratado acontece durante a renderização
// da página no servidor (SSR), em vez de deixar o app mostrar uma
// tela de erro decente, ela "engole" o erro e devolve uma resposta
// JSON genérica tipo {"unhandled":true,"message":"HTTPError"} — o
// try/catch normal não pega isso, porque tecnicamente não é uma
// exceção, é uma resposta HTTP "normal" (só que inútil). Esta função
// detecta esse caso escondido e troca por uma página de erro legível.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Verifica se o corpo da resposta é exatamente aquele formato
// "engolido" pelo h3 descrito acima.
function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Esta é a função que o Node realmente chama para cada requisição
// HTTP que chega no servidor (cada acesso ao site, cada clique,
// cada chamada de API interna).
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);

      // Rede de segurança final: se absolutamente qualquer coisa
      // der errado e não for pega em nenhum outro lugar, mostra uma
      // página de erro genérica em vez de deixar o site travar sem
      // resposta nenhuma.
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

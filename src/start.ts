import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Este arquivo é onde o TanStack Start é "configurado" globalmente —
// tudo que precisa rodar em TODA requisição, de toda rota, passa por
// aqui. É um dos primeiros arquivos que valem a pena olhar para
// entender o funcionamento geral do app.

// Middleware de segurança: se qualquer função de servidor
// (createServerFn, como as de gate.functions.ts ou
// releases.functions.ts) lançar um erro que não seja um erro HTTP
// esperado (tipo 401 "não autorizado"), isso pega o erro, registra
// no console (aparece nos logs do Render) e devolve uma página de
// erro decente para quem está usando o site, em vez de uma tela
// branca ou uma mensagem técnica confusa
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // Se o erro já tem um "statusCode" (é um erro HTTP esperado,
    // como 401 do gate.functions.ts), deixa ele passar normalmente —
    // não é uma falha inesperada, é um comportamento intencional.
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Monta a configuração final do TanStack Start:
// - functionMiddleware: roda em toda chamada de função de servidor
//   (attachSupabaseAuth, que hoje não tem efeito prático porque o
//   app não usa login — ver comentário em auth-attacher.ts).
// - requestMiddleware: roda em toda requisição HTTP bruta (o
//   middleware de erro acima).
export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));

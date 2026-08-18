// ⚠️ Arquivo gerado automaticamente pelo Lovable. Comentários aqui
// podem ser perdidos se você usar o Lovable de novo no futuro.
import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'


// Mesma função de detecção de formato de chave usada em
// client.ts/client.server.ts — ver comentários lá para detalhes.
function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

// Este middleware é o "oposto" do gate.functions.ts: em vez de checar
// uma senha simples guardada em cookie, ele checa um token JWT de
// login real do Supabase Auth (usuário com conta/e-mail/senha).
//
// IMPORTANTE PARA ESTE PROJETO: nenhuma rota do app usa esse
// middleware hoje (nem historico.tsx, nem index.tsx) — a proteção em
// uso é a senha única do gate.functions.ts. Este arquivo existe
// porque faz parte do "pacote padrão" de autenticação que o Lovable
// gera ao conectar o Supabase, mas está sem uso ativo no momento.
// Se um dia você quiser trocar a senha única por contas individuais
// (login de cada conferente, por exemplo — ver sugestão de melhoria
// nº 3 discutida antes), é aqui que a verificação aconteceria.
export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
      console.error(`[Supabase] ${message}`);
      throw new Error(message);
    }

    // Pega a requisição HTTP original para ler o cabeçalho de
    // autorização que o auth-attacher.ts (lado do navegador) enviou.
    const request = getRequest();

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Only Bearer tokens are supported');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    // Um JWT válido sempre tem 3 partes separadas por ponto
    // (cabeçalho.corpo.assinatura). Se não tiver, nem vale a pena
    // perguntar ao Supabase — já sabemos que é inválido.
    if (token.split('.').length !== 3) {
      throw new Error('Unauthorized: Invalid token');
    }

    // Cria um cliente Supabase temporário, autenticado como o
    // usuário dono desse token (não como admin).
    const supabase = createClient<Database>(
      SUPABASE_URL!,
      SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY!),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Pergunta ao Supabase: "esse token é válido, e quem é o dono?"
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      throw new Error('Unauthorized: Invalid token');
    }

    if (!data.claims.sub) {
      throw new Error('Unauthorized: No user ID found in token');
    }

    // Se chegou até aqui, o usuário está autenticado de verdade.
    // Disponibiliza o cliente Supabase, o ID e os dados do usuário
    // para o restante da função que usar esse middleware.
    return next({
      context: {
        supabase,
        userId: data.claims.sub,
        claims: data.claims,
      },
    });
  },
);

// ⚠️ Este arquivo é gerado automaticamente pelo Lovable (integração
// Supabase). Se você editar aqui manualmente E depois pedir qualquer
// mudança relacionada ao Supabase pelo chat do Lovable, ele pode
// SOBRESCREVER esses comentários sem avisar. Prefira comentar cópias
// como esta, fora do fluxo automático do Lovable.
//
// Este é o cliente "admin" do Supabase, que usa a chave secreta
// (SUPABASE_SERVICE_ROLE_KEY) e por isso IGNORA todas as regras de
// RLS (Row Level Security) do banco — ele pode ler e escrever
// qualquer coisa, sem restrição nenhuma.
// Por isso: NUNCA importar este arquivo em código que roda no
// navegador (rotas .tsx normais). Só em arquivos de servidor, como
// releases.functions.ts.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// O Supabase mudou o formato das chaves de API em 2026. As novas
// começam com "sb_publishable_" (chave pública) ou "sb_secret_"
// (chave secreta), em vez do formato antigo (token JWT longo
// começando com "eyJ..."). Essa função detecta qual formato está
// sendo usado.
function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

// Ajusta os cabeçalhos (headers) de toda requisição feita ao
// Supabase, para funcionar tanto com o formato antigo de chave
// quanto com o novo.
function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    
    // As chaves novas do Supabase não são tokens JWT — não fazem
    // sentido como "Bearer token" de autenticação. Removemos esse
    // cabeçalho quando detectamos o formato novo, para evitar erro
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    // Toda requisição ao Supabase precisa desse cabeçalho "apikey"
    // para se identificar.
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

// Monta o cliente admin de fato, lendo a URL e a chave secreta das
// variáveis de ambiente do Render.
function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Se alguma das duas variáveis não estiver configurada no Render,
  // o app quebra aqui com uma mensagem clara em vez de dar erro
  // confuso mais tarde. Foi essa mensagem exata ("Missing Supabase
  // environment variable(s)...") que apareceu no histórico durante
  // a configuração.
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_SERVICE_ROLE_KEY),
    },
    auth: {

      // Cliente de servidor não guarda sessão de usuário — cada
      // requisição é isolada, sem "login" persistente.
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

// O cliente só é criado na primeira vez que for realmente usado
// (lazy initialization), não assim que o arquivo é importado. Isso
// evita erro de "variável de ambiente faltando" em situações onde o
// arquivo é carregado mas o cliente admin não chega a ser usado
let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// Cliente Supabase do lado do servidor, com a chave admin - ignora o RLS.
// SEGURANÇA: use isto só em operações de servidor confiáveis, nunca exponha ao código do cliente.
// Carregue dentro de handlers de servidor: const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
// Import no topo do arquivo só é seguro em outros módulos *.server.ts — arquivos de rota e *.functions.ts vão parar no pacote enviado ao navegador.
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});

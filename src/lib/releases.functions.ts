import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

// Esta função roda no SERVIDOR (não no navegador) e é quem realmente
// busca as liberações de carga no banco de dados para exibir na tela
// de histórico. Ela existe separada do gate.functions.ts porque,
// além de checar a senha, ela também usa a chave secreta do Supabase
// (SUPABASE_SERVICE_ROLE_KEY) — uma chave que NUNCA pode ir para o
// navegador do usuário, por isso precisa rodar só aqui no servidor.
export const listCargoReleases = createServerFn({ method: "GET" }).handler(async () => {

  // Repete a mesma verificação de sessão do gate.functions.ts.
  // Isso é proposital: mesmo que alguém tente chamar essa função
  // diretamente (pulando a tela de senha), ela recusa se a sessão
  // não estiver marcada como desbloqueada.
  const session = await useSession<{ unlocked?: boolean }>({
    password: process.env.SESSION_SECRET!,
    name: "historico-gate",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  });
  if (session.data.unlocked !== true) {

     //401 = "não autorizado". Se cair aqui, a tela de histórico mostra
    // erro em vez da lista de liberações.
    throw new Response("Unauthorized", { status: 401 });
  }

   // Importa o cliente admin do Supabase só agora (import dinâmico),
  // para garantir que esse código com a chave secreta nunca seja
  // incluído no pacote JavaScript enviado ao navegador.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Busca até 500 liberações mais recentes, da mais nova para a mais antiga.
  const { data, error } = await supabaseAdmin
    .from("cargo_releases" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as Record<string, string | number | null>[] };
});

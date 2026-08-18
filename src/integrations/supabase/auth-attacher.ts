// ⚠️ Arquivo gerado automaticamente pelo Lovable. Comentários aqui
// podem ser perdidos se você usar o Lovable de novo no futuro.
import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'

// Este "middleware" roda no NAVEGADOR, antes de qualquer chamada do
// tipo createServerFn (as funções que rodam no servidor, como
// listCargoReleases). A função dele é simples: pegar o token de
// login do usuário (se ele estiver logado via Supabase Auth) e
// anexar esse token em toda chamada ao servidor, no cabeçalho
// "Authorization: Bearer <token>".
//
// Precisa estar registrado como functionMiddleware global dentro de
// src/start.ts — se você tirar o registro de lá, o token nunca é
// enviado e o servidor nunca sabe quem é o usuário logado.
//
// Observação para este projeto: hoje o app não usa login de usuário
// (Supabase Auth) — a proteção da tela de histórico é só a senha
// única (gate.functions.ts). Então, na prática, esse arquivo hoje
// sempre envia headers vazios ({}), porque nunca existe uma sessão
// de usuário ativa.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)

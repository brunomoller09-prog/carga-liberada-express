import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

// Este arquivo controla o "cadeado" (senha) da página /historico.
// Ele NÃO controla quem pode ver os dados em si (isso é feito em
// releases.functions.ts) — aqui só decidimos se o cookie de sessão
// do navegador está marcado como "desbloqueado".

// Formato do que fica salvo dentro do cookie de sessão criptografado.
type GateSession = { unlocked?: boolean };

// Configuração do cookie de sessão. É chamada em toda função abaixo
// para garantir que todas usem exatamente as mesmas regras de cookie.
function sessionConfig() {
  return {
    // Chave usada para criptografar o conteúdo do cookie no servidor.
    // Vem da variável de ambiente SESSION_SECRET (configurada no Render).
    // Se essa variável estiver vazia, a sessão não funciona (erro "Empty password").
    password: process.env.SESSION_SECRET!,
    name: "historico-gate",
    // Tempo de validade do cookie: 8 horas (60 segundos * 60 minutos * 8).
    // Depois disso a pessoa precisa digitar a senha de novo.
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}
// Compara a senha digitada com a senha esperada de um jeito seguro
// contra "timing attack" (um tipo de ataque onde alguém mede quanto
// tempo a comparação demora para adivinhar a senha caractere por
// caractere). Por isso não usamos simplesmente "input === expected".
function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}
// Função chamada pela tela de histórico para saber se já está
// desbloqueado (por exemplo, ao recarregar a página depois de já
// ter digitado a senha antes dentro das últimas 8 horas).
export const isHistoricoUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  return { unlocked: session.data.unlocked === true };
});

// Função chamada quando a pessoa digita a senha e clica em "Entrar".
// Recebe a senha digitada, compara com a variável de ambiente
// HISTORICO_PASSWORD (configurada no Render) e, se bater, marca a
// sessão como desbloqueada.
export const unlockHistorico = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.HISTORICO_PASSWORD;
    if (!expected) throw new Error("HISTORICO_PASSWORD não configurada");
    if (!matches(data.password ?? "", expected)) return { ok: false as const };
    const session = await useSession<GateSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

// Função chamada ao clicar em "Sair" na tela de histórico.
// Apaga a sessão, forçando a pessoa a digitar a senha de novo.
export const lockHistorico = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

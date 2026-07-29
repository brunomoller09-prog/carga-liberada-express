import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { unlockHistorico } from "@/lib/gate.functions";
import logoAsset from "@/assets/logo-liberacao-carga.png.asset.json";

export const Route = createFileRoute("/historico-senha")({
  component: SenhaPage,
  head: () => ({
    meta: [
      { title: "Acesso ao Histórico - Liberação de Carga" },
      { name: "description", content: "Área restrita: informe a senha para acessar o histórico de liberações de carga da Expedição." },
      { property: "og:title", content: "Acesso ao Histórico - Liberação de Carga" },
      { property: "og:description", content: "Área restrita: informe a senha para acessar o histórico de liberações de carga da Expedição." },
    ],
  }),
});

function SenhaPage() {
  const router = useRouter();
  const unlock = useServerFn(unlockHistorico);
  const [erro, setErro] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setErro(false);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    const { ok } = await unlock({ data: { password } });
    setEnviando(false);
    if (ok) await router.navigate({ to: "/historico" });
    else setErro(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoAsset.url} alt="Liberação de Carga" className="h-14 w-14 rounded bg-primary object-contain p-1" />
          <h1 className="mt-4 text-xl font-bold text-primary">Acesso Restrito</h1>
          <p className="mt-1 text-sm text-muted-foreground">Informe a senha para ver o histórico de liberações.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            name="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder="Senha"
            className="w-full rounded-md border border-border bg-white px-4 py-2 text-sm outline-none focus:border-primary"
          />
          {erro && <p className="text-sm text-destructive">Senha incorreta.</p>}
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {enviando ? "Verificando..." : "Entrar"}
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-sm font-semibold text-primary hover:underline"
          >
            ← Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}
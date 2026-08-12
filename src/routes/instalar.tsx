import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/logo-liberacao-carga.png.asset.json";

export const Route = createFileRoute("/instalar")({
  head: () => ({
    meta: [
      { title: "Instalar aplicativo — Liberação de Carga Joinville" },
      {
        name: "description",
        content:
          "Instale o app de Liberação de Carga da Expedição Joinville no celular ou no computador para acesso rápido, em tela cheia.",
      },
      { property: "og:title", content: "Instalar aplicativo — Liberação de Carga Joinville" },
      {
        property: "og:description",
        content: "Instale o app de Liberação de Carga da Expedição Joinville no celular ou no computador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstalarPage,
});

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function InstalarPage() {
  const [deferred, setDeferred] = useState<PromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setInstalado(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as PromptEvent);
    };
    const onInstalled = () => {
      setInstalado(true);
      setDeferred(null);
      setMsg("Aplicativo instalado com sucesso!");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function instalar() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setMsg(outcome === "accepted" ? "Instalação iniciada." : "Instalação cancelada.");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="no-print bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Britânia Eletrodomésticos</p>
            <h1 className="text-2xl font-bold">Instalar aplicativo</h1>
          </div>
          <Link
            to="/"
            className="rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/20"
          >
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold text-primary">Instale no seu dispositivo</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ao instalar, o sistema abre em tela cheia, com ícone próprio, e a tela de liberação
            funciona mesmo sem internet.
          </p>

          {msg && (
            <div className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {msg}
            </div>
          )}

          <div className="mt-5">
            {instalado ? (
              <p className="text-sm font-semibold text-emerald-700">
                ✅ O aplicativo já está instalado neste dispositivo.
              </p>
            ) : deferred ? (
              <button
                type="button"
                onClick={instalar}
                className="rounded-md bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                Instalar aplicativo
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Se o botão de instalação não aparecer, use as instruções manuais abaixo (o
                navegador só libera a instalação no site publicado).
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Passo
            titulo="Android (Chrome)"
            itens={["Toque no menu ⋮", "Escolha 'Instalar aplicativo' ou 'Adicionar à tela inicial'", "Confirme em 'Instalar'"]}
          />
          <Passo
            titulo="iPhone (Safari)"
            itens={["Toque no botão Compartilhar", "Escolha 'Adicionar à Tela de Início'", "Toque em 'Adicionar'"]}
          />
          <Passo
            titulo="Computador (Chrome/Edge)"
            itens={["Clique no ícone de instalar na barra de endereço", "Ou menu ⋮ > 'Instalar'", "Confirme em 'Instalar'"]}
          />
        </section>
      </main>
    </div>
  );
}

function Passo({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-bold text-primary">{titulo}</h3>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
        {itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ol>
    </div>
  );
}
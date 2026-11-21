# Liberação de Carga — Expedição Fábrica Joinville (Britânia)

Responda sempre em português do Brasil, informal e direto. O dono (Bruno) quer resultado rápido e prefere
ver as mudanças em branch/commits separados antes de ir pro ar. NUNCA faça merge no `main` nem deploy sem ele pedir.

## Stack e deploy
- TanStack Start (React + SSR) + Vite/Nitro, Tailwind. Rotas em `src/routes/`.
- Banco: Supabase projeto `dkxsbhfdyhkdbgayxeam`, tabela `public.cargo_releases`.
- Hospedagem: Render (`carga-liberada-express.onrender.com`, plano Free). Deploy MANUAL (auto-deploy desligado).
  Build: `npm install && npm run build` · Start: `node .output/server/index.mjs` · `NITRO_PRESET=node-server` obrigatório.
- Versões do TanStack estão FIXAS no package.json (sem ^) de propósito: versões novas removem `useSession` e quebram o build.
- Comandos: `npm run dev`, `npx tsc --noEmit`, `NITRO_PRESET=node-server npx vite build`.

## Variáveis de ambiente (Render / .env local)
HISTORICO_PASSWORD, SESSION_SECRET, SUPABASE_URL / VITE_SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY,
SUPABASE_SERVICE_ROLE_KEY (só servidor), NITRO_PRESET. Nunca commitar `.env`.

## Como funciona
- `src/routes/index.tsx`: formulário. Códigos de barras só por scanner (digitação bloqueada). Chave NF-e de 44 dígitos:
  série = índice 22–25, NF = índice 27–34 (7 dígitos). Notas 1–3 vão para nf_1..3/serie_1..3; da 4ª em diante vão em `notas_extras` (jsonb). Máx. 20.
- `src/components/ComprovanteLogistico.tsx`: documento oficial LG-SC.FO.030 (impressão). NÃO alterar o layout sem o Bruno pedir.
- `src/routes/historico.tsx`: histórico com senha (filtros, paginação, CSV). `historico-senha.tsx`: tela de senha.
- `src/lib/gate.functions.ts`: sessão por cookie (2h) + senha. `releases.functions.ts`: lê com service role (limite 2000).
- Leitura da tabela é bloqueada para anon; só o servidor (service_role) lê. INSERT é aberto para anon (risco conhecido).
- Não editar à mão: `src/routeTree.gen.ts`, `src/integrations/supabase/types.ts`, `src/components/ui/*`.
- Integração SharePoint/Power Automate foi ABANDONADA. Não reintroduzir.

## Armadilhas
- Google Tradutor do Chrome corrompe SQL e textos colados: desligar a tradução.
- Migrations novas ficam em `supabase/migrations/` e precisam ser rodadas à mão no SQL Editor do Supabase.

## Estado atual (20/11/2026)
- Branch `melhorias-novembro` (5 commits: versões fixas, remoção SharePoint, mais notas, histórico, logout) → PR #3.
- Branch `visual-liberacao`: nova tela de confirmação após gerar a liberação.
- Pendente: rodar `supabase/migrations/20261120000000_add_notas_extras.sql`; merge; deploy manual no Render.
- Ideias: endurecer INSERT (RLS), ID de carga único (sufixo aleatório), remover `POWER_AUTOMATE_WEBHOOK_URL` do Render.

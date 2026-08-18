import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Monta o "roteador" da aplicação — o mecanismo que decide qual
// arquivo dentro de src/routes/ exibir de acordo com a URL acessada
// (por exemplo, "/historico" carrega src/routes/historico.tsx).
//
// "routeTree" vem de um arquivo GERADO AUTOMATICAMENTE
// (routeTree.gen.ts) que é reconstruído toda vez que você adiciona,
// remove ou renomeia um arquivo dentro de src/routes/. Nunca edite
// routeTree.gen.ts manualmente — qualquer mudança lá some no próximo
// build.
export const getRouter = () => {
  const queryClient = new QueryClient();

   // QueryClient gerencia cache de dados buscados do servidor (como a
  // lista de liberações no histórico), evitando buscar tudo de novo
  // sem necessidade.
  const router = createRouter({
    routeTree,
    context: { queryClient },
    
      // Ao navegar entre páginas, volta a rolagem para o topo/posição
    // salva, como um site tradicional.
    scrollRestoration: true,
    
      // Sempre busca dados novos ao entrar numa rota, em vez de usar
    // cache antigo — importante para a tela de histórico sempre
    // mostrar as liberações mais recentes.
    defaultPreloadStaleTime: 0,
  });

  return router;
};

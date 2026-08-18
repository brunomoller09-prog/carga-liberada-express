import * as React from "react";

// Ponto de corte: telas com menos de 768px de largura são
// consideradas "celular". 768px é o breakpoint clássico de tablet
// (ex: iPad em pé), então nesse app tudo abaixo disso (celular na
// vertical, a maioria dos smartphones) conta como "mobile".
const MOBILE_BREAKPOINT = 768;

// Hook (função reutilizável do React) que qualquer componente da
// tela pode chamar para saber se está sendo visto num celular ou
// não — útil, por exemplo, para mostrar um layout mais compacto do
// formulário em telas pequenas.
export function useIsMobile() {

  // Começa como "undefined" (ainda não sabemos) até o primeiro
  // cálculo rodar no navegador — no servidor (SSR) não existe
  // "window", então não dá pra saber o tamanho da tela ainda.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // matchMedia observa o tamanho da janela e avisa quando ela
    // cruza o ponto de corte (por exemplo, ao girar o celular ou
    // redimensionar a janela do navegador).
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // Calcula o valor inicial assim que o componente é montado.
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    // Remove o "ouvinte" quando o componente sai de tela, para não
    // vazar memória.
    return () => mql.removeEventListener("change", onChange);
  }, []);
  
  // "!!" converte undefined em false — enquanto ainda não sabemos,
  // assume que não é mobile.
  return !!isMobile;
}

import { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router';

const posicoes = new Map<string, { x: number; y: number }>();

export function RouterLayout() {
  const { key, pathname, hash } = useLocation();
  const tipoNavegacao = useNavigationType();
  const caminhoAnterior = useRef<string | null>(null);

  useLayoutEffect(() => {
    const restauracaoAnterior = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = restauracaoAnterior;
    };
  }, []);

  useLayoutEffect(() => {
    const mudouPagina = caminhoAnterior.current !== pathname;
    caminhoAnterior.current = pathname;
    const posicao = tipoNavegacao === 'POP' ? posicoes.get(key) : undefined;

    if (posicao) {
      window.scrollTo(posicao.x, posicao.y);
    } else if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else if (mudouPagina) {
      window.scrollTo(0, 0);
    }

    const salvarPosicao = () => {
      posicoes.set(key, { x: window.scrollX, y: window.scrollY });
    };
    salvarPosicao();
    window.addEventListener('scroll', salvarPosicao, { passive: true });
    window.addEventListener('popstate', salvarPosicao, true);
    document.addEventListener('click', salvarPosicao, true);
    return () => {
      window.removeEventListener('scroll', salvarPosicao);
      window.removeEventListener('popstate', salvarPosicao, true);
      document.removeEventListener('click', salvarPosicao, true);
    };
  }, [key, pathname, hash, tipoNavegacao]);

  return <Outlet />;
}
